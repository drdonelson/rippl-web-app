import twilio from "twilio";
import { db } from "@workspace/db";
import { referrersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const TWILIO_ACCOUNT_SID  = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN   = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

const REFERRAL_BASE_URL = (process.env.PUBLIC_APP_URL || process.env.APP_URL || "https://www.joinrippl.com").replace(/\/$/, "");
const ONBOARDING_DELAY_MS = 2 * 60 * 60 * 1000; // 2 hours

function getTwilioClient() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials not configured");
  }
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

/** Generate a referral code: first 4 letters of first name + last 4 of a UUID segment */
function generateReferralCode(fullName: string, uniqueSuffix: string): string {
  const firstName = fullName.trim().split(/\s+/)[0] ?? "ANON";
  const first4 = firstName.toUpperCase().replace(/[^A-Z]/g, "").padEnd(4, "X").slice(0, 4);
  const last4  = uniqueSuffix.replace(/-/g, "").toUpperCase().slice(-4);
  return `${first4}-${last4}`;
}

export interface OnboardingResult {
  success: boolean;
  referrerId?: string;
  referralCode?: string;
  smsSid?: string;
  error?: string;
  skipped?: boolean;
}

/**
 * Send the post-visit onboarding SMS immediately (used by the test route).
 */
export async function sendOnboardingSmsNow(
  firstName: string,
  phone: string,
  referralCode: string
): Promise<{ success: boolean; smsSid?: string; error?: string }> {
  const shareUrl = `${REFERRAL_BASE_URL}/refer?ref=${referralCode}`;
  const body = `Hi ${firstName} — welcome to Hallmark Dental! We're so glad you came in. If you know anyone who could use a great dentist, share your personal link and earn a reward when they become a patient: ${shareUrl} 🦷`;

  try {
    if (!TWILIO_PHONE_NUMBER) throw new Error("TWILIO_PHONE_NUMBER not set");
    const client = getTwilioClient();
    const msg = await client.messages.create({ body, from: TWILIO_PHONE_NUMBER, to: phone });
    logger.info({ sid: msg.sid, to: phone, referralCode }, "Onboarding SMS sent");
    return { success: true, smsSid: msg.sid };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, to: phone }, "Failed to send onboarding SMS");
    return { success: false, error: message };
  }
}

/**
 * Called when a referral event status changes to "Exam Completed".
 * - Creates a referrer record for the new patient if one doesn't exist.
 * - Schedules the onboarding SMS 2 hours later.
 * - Guards against duplicate sends via onboarding_sms_sent flag.
 */
export async function scheduleOnboardingSms(params: {
  newPatientName: string;
  newPatientPhone: string;
  referralEventId: string;
}): Promise<OnboardingResult> {
  const { newPatientName, newPatientPhone, referralEventId } = params;

  // Normalise phone for lookup
  const phone = newPatientPhone.trim();

  // Check if this patient is already a referrer (by phone)
  const existing = await db
    .select()
    .from(referrersTable)
    .where(eq(referrersTable.phone, phone));

  if (existing.length > 0) {
    const referrer = existing[0];
    if (referrer.onboarding_sms_sent) {
      logger.info({ phone, referrerId: referrer.id }, "Onboarding SMS already sent — skipping");
      return { success: true, skipped: true, referrerId: referrer.id, referralCode: referrer.referral_code };
    }
    // Referrer exists but SMS not yet sent — schedule it
    scheduleDelayedSms(referrer.id, newPatientName, phone, referrer.referral_code);
    return { success: true, referrerId: referrer.id, referralCode: referrer.referral_code };
  }

  // New patient — create a referrer record
  const newId       = crypto.randomUUID();
  const referralCode = generateReferralCode(newPatientName, newId);

  // Guard against referral_code collisions (extremely unlikely with UUID suffix)
  let finalCode = referralCode;
  const codeConflict = await db
    .select({ id: referrersTable.id })
    .from(referrersTable)
    .where(eq(referrersTable.referral_code, referralCode));

  if (codeConflict.length > 0) {
    finalCode = referralCode + Math.floor(Math.random() * 90 + 10);
  }

  const [newReferrer] = await db.insert(referrersTable).values({
    id:                  newId,
    patient_id:          `exam-${referralEventId}`,
    name:                newPatientName,
    phone,
    referral_code:       finalCode,
    onboarding_sms_sent: false,
  }).returning();

  logger.info({ referrerId: newReferrer.id, referralCode: finalCode }, "New referrer created from exam completion");

  // Schedule the 2-hour delayed SMS
  scheduleDelayedSms(newReferrer.id, newPatientName, phone, finalCode);

  return { success: true, referrerId: newReferrer.id, referralCode: finalCode };
}

function scheduleDelayedSms(
  referrerId: string,
  fullName: string,
  phone: string,
  referralCode: string
): void {
  const firstName = fullName.trim().split(/\s+/)[0] ?? "there";

  logger.info(
    { referrerId, phone, delayMs: ONBOARDING_DELAY_MS },
    "Onboarding SMS scheduled — fires in 2 hours"
  );

  setTimeout(async () => {
    // Re-check the flag before sending in case something changed
    const [referrer] = await db
      .select()
      .from(referrersTable)
      .where(eq(referrersTable.id, referrerId));

    if (!referrer) {
      logger.info({ referrerId }, "Onboarding SMS skipped at send time — referrer not found");
      return;
    }

    if (referrer.sms_opt_out) {
      logger.info({ referrerId }, "Skipping onboarding SMS — patient opted out");
      return;
    }

    if (referrer.onboarding_sms_sent) {
      logger.info({ referrerId }, "Onboarding SMS skipped at send time — already sent");
      return;
    }

    const result = await sendOnboardingSmsNow(firstName, phone, referralCode);

    if (result.success) {
      await db
        .update(referrersTable)
        .set({ onboarding_sms_sent: true })
        .where(eq(referrersTable.id, referrerId));
      logger.info({ referrerId, smsSid: result.smsSid }, "Onboarding SMS delivered and flag set");
    } else {
      logger.error({ referrerId, error: result.error }, "Onboarding SMS failed at send time");
    }
  }, ONBOARDING_DELAY_MS);
}
