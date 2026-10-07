import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { referrersTable, practicesTable, officesTable } from "@workspace/db/schema";
import { sql, eq, and } from "drizzle-orm";
import rateLimit from "express-rate-limit";
import { SMS_ENABLED } from "../lib/smsEnabled";
import { resolveTwilioClient, resolveTwilioPhone } from "../lib/practiceConfig";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const lookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many lookup attempts, please try again shortly." },
});

const REFERRAL_BASE_URL = (process.env.PUBLIC_APP_URL || process.env.APP_URL || "https://joinrippl.com").replace(/\/$/, "");

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

// The practice a bare /find link resolves to. See the note in POST /lookup.
const DEFAULT_LOOKUP_PRACTICE_SLUG = "hallmark-dental";

const inviteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const { myPhone } = req.body as { myPhone?: string };
    return normalizePhone(myPhone ?? "") || (req.ip ?? "unknown");
  },
  message: { error: "Too many invitations sent. Please try again later." },
});

router.post("/lookup", lookupLimiter, async (req: Request, res: Response) => {
  const { phone, office, practiceSlug } = req.body as {
    phone?: string; office?: string; practiceSlug?: string;
  };
  if (!phone || typeof phone !== "string") {
    res.status(400).json({ error: "Phone number required" });
    return;
  }

  // A phone number alone does not say whose customer this is. Unscoped, this endpoint
  // returned a name and referral code for ANY number in ANY tenant — so once a second
  // client's members share the table, one client's customer could look up another's.
  // The caller must name the location (existing /find?office=<id> links) or the practice.
  let practiceId: string | null = null;
  if (typeof office === "string" && office.trim()) {
    const [row] = await db
      .select({ practice_id: officesTable.practice_id })
      .from(officesTable)
      .where(eq(officesTable.id, office.trim().toLowerCase()))
      .limit(1);
    practiceId = row?.practice_id ?? null;
  } else if (typeof practiceSlug === "string" && practiceSlug.trim()) {
    const [row] = await db
      .select({ id: practicesTable.id })
      .from(practicesTable)
      .where(eq(practicesTable.slug, practiceSlug.trim().toLowerCase()))
      .limit(1);
    practiceId = row?.id ?? null;
  }
  // INTERIM, with a defined removal condition.
  //
  // Eight print assets (posters, cards, the slide deck) show a bare "joinrippl.com/find"
  // with no location, so hard-requiring a tenant would break every QR code already printed.
  // Falling back to one named practice still fixes the actual defect: the query stops
  // searching EVERY tenant and searches exactly one. A customer of another practice
  // scanning a Hallmark poster now correctly gets "not found" instead of someone else's
  // name and code.
  //
  // REMOVE THIS as soon as a second practice prints /find materials — at that point a bare
  // link is genuinely ambiguous and must be refused. Carlock's posters need ?p=carlock, and
  // the automotive poster/card templates still carry the dental QR target.
  if (!practiceId) {
    const [fallback] = await db
      .select({ id: practicesTable.id })
      .from(practicesTable)
      .where(eq(practicesTable.slug, DEFAULT_LOOKUP_PRACTICE_SLUG))
      .limit(1);
    practiceId = fallback?.id ?? null;
    logger.warn(
      { office, practiceSlug, resolvedTo: DEFAULT_LOOKUP_PRACTICE_SLUG },
      "[lookup] No location in request — fell back to the default practice. " +
      "A printed asset is still pointing at a bare /find link.",
    );
  }
  if (!practiceId) {
    res.status(400).json({
      error: "This lookup link is missing its location. Please use the link or QR code from your practice, or ask the front desk.",
    });
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
    .where(and(
      sql`right(regexp_replace(${referrersTable.phone}, '[^0-9]', '', 'g'), 10) = ${normalized}`,
      eq(referrersTable.practice_id, practiceId),
    ))
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

  // Look up practice (full select so resolveTwilioClient/Phone can use per-practice credentials)
  const [practice] = await db
    .select()
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

  const fromPhone = resolveTwilioPhone(practice);
  if (!fromPhone) {
    logger.error("Twilio phone not configured for kiosk invite");
    res.status(500).json({ error: "SMS not configured. Please contact support." });
    return;
  }

  try {
    const client = resolveTwilioClient(practice);
    await client.messages.create({ body, from: fromPhone, to: `+1${friendNorm}` });
    logger.info({ referralCode: referral_code, to: `+1${friendNorm}` }, "Kiosk invitation sent");
    res.json({ success: true, referrerName: referrerFirst });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err, to: `+1${friendNorm}` }, "Kiosk invitation SMS failed");
    res.status(500).json({ error: `Failed to send: ${msg}` });
  }
});

export default router;
