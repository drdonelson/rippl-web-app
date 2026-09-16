import { Router, type IRouter, type Request, type Response } from "express";
import twilio from "twilio";
import { db } from "@workspace/db";
import { referrersTable, practicesTable } from "@workspace/db/schema";
import { sql, eq, and } from "drizzle-orm";
import rateLimit from "express-rate-limit";
import { SMS_ENABLED } from "../lib/smsEnabled";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const lookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many lookup attempts, please try again shortly." },
});

const REFERRAL_BASE_URL = (process.env.PUBLIC_APP_URL || process.env.APP_URL || "https://joinrippl.com").replace(/\/$/, "");
const TWILIO_ACCOUNT_SID  = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN   = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

const inviteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const { myPhone } = req.body as { myPhone?: string };
    return normalizePhone(myPhone ?? "") || req.ip ?? "unknown";
  },
  message: { error: "Too many invitations sent. Please try again later." },
});

router.post("/lookup", lookupLimiter, async (req: Request, res: Response) => {
  const { phone } = req.body as { phone?: string };
  if (!phone || typeof phone !== "string") {
    res.status(400).json({ error: "Phone number required" });
    return;
  }

  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) {
    res.status(400).json({ error: "Please enter a valid 10-digit US phone number" });
    return;
  }

  // Strip all non-digits from stored phone on both sides so any format matches:
  // "615-481-8556", "(615) 481-8556", "+16154818556", "6154818556" all resolve to same 10 digits
  const rows = await db
    .select({ name: referrersTable.name, referral_code: referrersTable.referral_code })
    .from(referrersTable)
    .where(sql`right(regexp_replace(${referrersTable.phone}, '[^0-9]', '', 'g'), 10) = ${normalized}`)
    .limit(1);

  if (rows.length === 0) {
    res.status(404).json({ error: "No referral account found for that number. Ask the front desk for help." });
    return;
  }

  const { name, referral_code } = rows[0];
  const firstName = name.trim().split(/\s+/)[0];
  res.json({ firstName, referralCode: referral_code, shareUrl: `${REFERRAL_BASE_URL}/refer?ref=${referral_code}` });
});

// ── POST /api/public/send-invitation ─────────────────────────────────────────
// Kiosk flow: patient enters their own phone + a friend's name/phone.
// Sends the friend an SMS with the patient's referral link.
router.post("/send-invitation", inviteLimiter, async (req: Request, res: Response) => {
  const { myPhone, friendName, friendPhone, practiceSlug } = req.body as {
    myPhone?: string;
    friendName?: string;
    friendPhone?: string;
    practiceSlug?: string;
  };

  if (!myPhone || !friendName || !friendPhone || !practiceSlug) {
    res.status(400).json({ error: "myPhone, friendName, friendPhone, and practiceSlug are required" });
    return;
  }

  const myNorm     = normalizePhone(myPhone);
  const friendNorm = normalizePhone(friendPhone);

  if (myNorm.length !== 10) {
    res.status(400).json({ error: "Enter a valid 10-digit US number for your phone." });
    return;
  }
  if (friendNorm.length !== 10) {
    res.status(400).json({ error: "Enter a valid 10-digit US number for your friend." });
    return;
  }
  if (myNorm === friendNorm) {
    res.status(400).json({ error: "You can't send an invitation to yourself." });
    return;
  }

  // Look up practice
  const [practice] = await db
    .select({ id: practicesTable.id, name: practicesTable.name, white_label_name: practicesTable.white_label_name, status: practicesTable.status })
    .from(practicesTable)
    .where(eq(practicesTable.slug, practiceSlug))
    .limit(1);

  if (!practice || practice.status === "inactive") {
    res.status(404).json({ error: "Practice not found." });
    return;
  }

  // Look up referrer by phone + practice
  const rows = await db
    .select({ name: referrersTable.name, referral_code: referrersTable.referral_code })
    .from(referrersTable)
    .where(and(
      sql`right(regexp_replace(${referrersTable.phone}, '[^0-9]', '', 'g'), 10) = ${myNorm}`,
      eq(referrersTable.practice_id, practice.id),
    ))
    .limit(1);

  if (rows.length === 0) {
    res.status(404).json({ error: "We couldn't find your account. Ask the front desk to look you up." });
    return;
  }

  const { name: referrerName, referral_code } = rows[0];
  const referralUrl   = `${REFERRAL_BASE_URL}/refer?ref=${encodeURIComponent(referral_code)}`;
  const practiceName  = practice.white_label_name ?? practice.name;
  const friendFirst   = (friendName.trim().split(/\s+/)[0] ?? "there");
  const referrerFirst = (referrerName.trim().split(/\s+/)[0] ?? referrerName);

  const body = `Hey ${friendFirst}! Your friend ${referrerFirst} thinks you'd love ${practiceName}. Book your first visit and they'll earn a reward: ${referralUrl} Reply STOP to opt out.`;

  if (!SMS_ENABLED) {
    logger.info({ to: `+1${friendNorm}`, body }, "[SMS-SUPPRESSED] Kiosk invitation not sent (SMS_ENABLED=false)");
    res.json({ success: true, referrerName: referrerFirst, suppressed: true });
    return;
  }

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    logger.error("Twilio credentials not configured for kiosk invite");
    res.status(500).json({ error: "SMS not configured. Please contact support." });
    return;
  }

  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    await client.messages.create({ body, from: TWILIO_PHONE_NUMBER, to: `+1${friendNorm}` });
    logger.info({ referralCode: referral_code, to: `+1${friendNorm}` }, "Kiosk invitation sent");
    res.json({ success: true, referrerName: referrerFirst });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err, to: `+1${friendNorm}` }, "Kiosk invitation SMS failed");
    res.status(500).json({ error: `Failed to send: ${msg}` });
  }
});

export default router;
