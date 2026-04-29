import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { referrersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import rateLimit from "express-rate-limit";

const router: IRouter = Router();

const lookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many lookup attempts, please try again shortly." },
});

const REFERRAL_BASE_URL = (process.env.PUBLIC_APP_URL || process.env.APP_URL || "https://joinrippl.com").replace(/\/$/, "");

// Normalize phone: strip everything except digits, accept last 10
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

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

  // Try exact stored value first, then normalized
  const rows = await db
    .select({ name: referrersTable.name, referral_code: referrersTable.referral_code })
    .from(referrersTable)
    .where(eq(referrersTable.phone, normalized))
    .limit(1);

  if (rows.length === 0) {
    // Also try with +1 prefix in case stored differently
    const withPrefix = `+1${normalized}`;
    const rows2 = await db
      .select({ name: referrersTable.name, referral_code: referrersTable.referral_code })
      .from(referrersTable)
      .where(eq(referrersTable.phone, withPrefix))
      .limit(1);

    if (rows2.length === 0) {
      res.status(404).json({ error: "No referral account found for that number. Ask the front desk for help." });
      return;
    }

    const { name, referral_code } = rows2[0];
    const firstName = name.trim().split(/\s+/)[0];
    res.json({ firstName, referralCode: referral_code, shareUrl: `${REFERRAL_BASE_URL}/refer?ref=${referral_code}` });
    return;
  }

  const { name, referral_code } = rows[0];
  const firstName = name.trim().split(/\s+/)[0];
  res.json({ firstName, referralCode: referral_code, shareUrl: `${REFERRAL_BASE_URL}/refer?ref=${referral_code}` });
});

export default router;
