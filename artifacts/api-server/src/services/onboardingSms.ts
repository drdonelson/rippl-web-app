import twilio from "twilio";
import { SMS_ENABLED } from "../lib/smsEnabled";
import { db } from "@workspace/db";
import { referrersTable, referralEventsTable } from "@workspace/db/schema";
import { eq, sql, and, lt, isNotNull, gte } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getPracticeConfig } from "../lib/practiceConfig";

const TWILIO_ACCOUNT_SID  = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN   = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

const REFERRAL_BASE_URL = (process.env.PUBLIC_APP_URL || process.env.APP_URL || "https://www.joinrippl.com").replace(/\/$/, "");
const ONBOARDING_DELAY_MS = 2 * 60 * 60 * 1000; // 2 hours
const RECOVERY_WINDOW_DAYS = 3; // only recover missed SMS scheduled within last 3 days

function getTwilioClient() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials not configured");
  }
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

function toE164(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone;
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
  referralCode: string,
  practiceName?: string,
  customBody?: string
): Promise<{ success: boolean; smsSid?: string; error?: string }> {
  const shareUrl = `${REFERRAL_BASE_URL}/refer?ref=${referralCode}`;
  const name = practiceName ?? "your dental office";
  const body = customBody ?? `Hi ${firstName} — thanks for visiting ${name}! Share your referral link and earn a reward when friends become patients: ${shareUrl} Reply STOP to opt out.`;

  try {
    if (!SMS_ENABLED) {
      logger.info({ to: phone, referralCode, body }, "[SMS-SUPPRESSED] Onboarding SMS not sent (SMS_ENABLED=false)");
      return { success: true, smsSid: "suppressed" };
    }
    if (!TWILIO_PHONE_NUMBER) throw new Error("TWILIO_PHONE_NUMBER not set");
    const client = getTwilioClient();
    const msg = await client.messages.create({ body, from: TWILIO_PHONE_NUMBER, to: toE164(phone) });
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

  // Look up practice name so the SMS says the real practice name, not "Hallmark Dental"
  let practiceName: string | undefined;
  try {
    const [evt] = await db.select({ practice_id: referralEventsTable.practice_id })
      .from(referralEventsTable).where(eq(referralEventsTable.id, referralEventId)).limit(1);
    if (evt?.practice_id) {
      const practice = await getPracticeConfig(evt.practice_id);
      practiceName = practice?.white_label_name ?? practice?.name ?? undefined;
    }
  } catch { /* non-fatal — falls back to generic copy */ }

  // Normalise phone for lookup and Twilio
  const phoneRaw = newPatientPhone.trim();
  const phone = toE164(phoneRaw) || phoneRaw;
  // Normalize to last 10 digits so (615) 555-1234 matches +16155551234
  const phoneLast10 = phone.replace(/\D/g, "").slice(-10);

  // Check if this patient is already a referrer — match on last 10 digits to handle format differences
  const existing = await db
    .select()
    .from(referrersTable)
    .where(sql`RIGHT(REGEXP_REPLACE(${referrersTable.phone}, '[^0-9]', '', 'g'), 10) = ${phoneLast10}`);

  if (existing.length > 0) {
    const referrer = existing[0];

    if (referrer.onboarding_sms_sent) {
      logger.info({ phone, referrerId: referrer.id }, "Onboarding SMS already sent — skipping");
      return { success: true, skipped: true, referrerId: referrer.id, referralCode: referrer.referral_code };
    }

    if (referrer.onboarding_sms_scheduled_at) {
      const scheduledMs = new Date(referrer.onboarding_sms_scheduled_at).getTime();
      if (scheduledMs > Date.now()) {
        // setTimeout is still alive — nothing to do
        logger.info({ phone, referrerId: referrer.id }, "Onboarding SMS scheduled for future — skipping");
        return { success: true, skipped: true, referrerId: referrer.id, referralCode: referrer.referral_code };
      }

      const ageDays = (Date.now() - scheduledMs) / 86_400_000;
      if (ageDays > RECOVERY_WINDOW_DAYS) {
        // Visit was too long ago — patient won't recall it; close out without sending
        logger.info(
          { phone, referrerId: referrer.id, ageDays: Math.round(ageDays) },
          `Onboarding SMS recovery skipped — scheduled >${RECOVERY_WINDOW_DAYS} days ago, closing out`
        );
        await db
          .update(referrersTable)
          .set({ onboarding_sms_sent: true, onboarding_sms_sent_at: new Date() })
          .where(eq(referrersTable.id, referrer.id));
        return { success: true, skipped: true, referrerId: referrer.id, referralCode: referrer.referral_code };
      }

      // Within recovery window — scheduled_at is in the past but SMS never sent (server restart wiped setTimeout)
      if (!referrer.sms_opt_out_permanent && !referrer.sms_opt_out) {
        const firstName = newPatientName.trim().split(/\s+/)[0] ?? "there";
        logger.info(
          { phone, referrerId: referrer.id, scheduledAt: referrer.onboarding_sms_scheduled_at },
          "Onboarding SMS missed after server restart — sending now"
        );
        const smsResult = await sendOnboardingSmsNow(firstName, phone, referrer.referral_code, practiceName);
        if (smsResult.success) {
          await db
            .update(referrersTable)
            .set({ onboarding_sms_sent: true, onboarding_sms_sent_at: new Date() })
            .where(eq(referrersTable.id, referrer.id));
          logger.info({ referrerId: referrer.id, smsSid: smsResult.smsSid }, "Missed onboarding SMS delivered and flag set");
        } else {
          logger.error({ referrerId: referrer.id, error: smsResult.error }, "Missed onboarding SMS failed at recovery send");
        }
        return { success: smsResult.success, referrerId: referrer.id, referralCode: referrer.referral_code, smsSid: smsResult.smsSid, error: smsResult.error };
      }
      // Opted out — treat as already handled
      return { success: true, skipped: true, referrerId: referrer.id, referralCode: referrer.referral_code };
    }

    // Referrer exists but SMS not yet sent or scheduled — schedule it
    scheduleDelayedSms(referrer.id, newPatientName, phone, referrer.referral_code, practiceName);
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
  scheduleDelayedSms(newReferrer.id, newPatientName, phone, finalCode, practiceName);

  return { success: true, referrerId: newReferrer.id, referralCode: finalCode };
}

/**
 * Send an automotive-specific onboarding SMS immediately after deal delivery.
 * Used by the DriveCentric SFTP processor for auto-enrollment at delivery.
 */
export async function sendAutomotiveOnboardingSms(params: {
  firstName: string;
  phone: string;
  referralCode: string;
  brandName: string;
}): Promise<{ success: boolean; smsSid?: string; error?: string }> {
  const shareUrl = `${REFERRAL_BASE_URL}/refer?ref=${params.referralCode}`;
  const body = `Congrats on your new vehicle! Share your ${params.brandName} rewards link — when a friend buys a car, you earn $100: ${shareUrl} Reply STOP to opt out.`;
  return sendOnboardingSmsNow(params.firstName, params.phone, params.referralCode, body);
}

function scheduleDelayedSms(
  referrerId: string,
  fullName: string,
  phone: string,
  referralCode: string,
  practiceName?: string
): void {
  const firstName = fullName.trim().split(/\s+/)[0] ?? "there";

  const scheduledAt = new Date(Date.now() + ONBOARDING_DELAY_MS);

  logger.info(
    { referrerId, phone, delayMs: ONBOARDING_DELAY_MS },
    "Onboarding SMS scheduled — fires in 2 hours"
  );

  // Record scheduled time immediately so the dashboard can show it
  db.update(referrersTable)
    .set({ onboarding_sms_scheduled_at: scheduledAt })
    .where(eq(referrersTable.id, referrerId))
    .catch(err => logger.error({ err, referrerId }, "Failed to set onboarding_sms_scheduled_at"));

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

    if (referrer.sms_opt_out_permanent) {
      logger.info({ referrerId }, "Skipping onboarding SMS — patient permanently opted out (No SMS Ever)");
      return;
    }

    if (referrer.sms_opt_out) {
      // Temporary skip — reset the flag so it doesn't block future scheduled sends
      logger.info({ referrerId }, "Skipping onboarding SMS — patient chose 'Skip next SMS', resetting flag");
      await db
        .update(referrersTable)
        .set({ sms_opt_out: false })
        .where(eq(referrersTable.id, referrerId));
      return;
    }

    if (referrer.onboarding_sms_sent) {
      logger.info({ referrerId }, "Onboarding SMS skipped at send time — already sent");
      return;
    }

    const result = await sendOnboardingSmsNow(firstName, phone, referralCode, practiceName);

    if (result.success) {
      await db
        .update(referrersTable)
        .set({ onboarding_sms_sent: true, onboarding_sms_sent_at: new Date() })
        .where(eq(referrersTable.id, referrerId));
      logger.info({ referrerId, smsSid: result.smsSid }, "Onboarding SMS delivered and flag set");
    } else {
      logger.error({ referrerId, error: result.error }, "Onboarding SMS failed at send time");
    }
  }, ONBOARDING_DELAY_MS);
}

/**
 * Startup recovery: send any onboarding SMSes that were scheduled but never delivered
 * because the server restarted before the 2-hour setTimeout fired.
 * Called once on server startup; non-fatal.
 */
export async function recoverMissedOnboardingSms(): Promise<void> {
  const now        = new Date();
  const cutoff     = new Date(now.getTime() - RECOVERY_WINDOW_DAYS * 86_400_000);

  const missed = await db
    .select()
    .from(referrersTable)
    .where(
      and(
        isNotNull(referrersTable.onboarding_sms_scheduled_at),
        lt(referrersTable.onboarding_sms_scheduled_at, now),
        gte(referrersTable.onboarding_sms_scheduled_at, cutoff),
        eq(referrersTable.onboarding_sms_sent, false),
      ),
    );

  if (missed.length === 0) return;

  logger.info({ count: missed.length }, "[startup] Recovering missed onboarding SMSes");

  for (const referrer of missed) {
    if (referrer.sms_opt_out_permanent || referrer.sms_opt_out) {
      await db
        .update(referrersTable)
        .set({ onboarding_sms_sent: true, onboarding_sms_sent_at: new Date() })
        .where(eq(referrersTable.id, referrer.id));
      continue;
    }

    // Look up practice from most recent referral event
    let practiceName: string | undefined;
    try {
      const [latestEvent] = await db
        .select({ practice_id: referralEventsTable.practice_id })
        .from(referralEventsTable)
        .where(eq(referralEventsTable.referrer_id, referrer.id))
        .limit(1);
      if (latestEvent?.practice_id) {
        const practice = await getPracticeConfig(latestEvent.practice_id);
        practiceName = practice?.white_label_name ?? practice?.name ?? undefined;
      }
    } catch { /* non-fatal */ }

    const firstName = referrer.name.trim().split(/\s+/)[0] ?? "there";
    const phone     = toE164(referrer.phone) || referrer.phone;

    const result = await sendOnboardingSmsNow(firstName, phone, referrer.referral_code, practiceName);

    await db
      .update(referrersTable)
      .set({ onboarding_sms_sent: true, onboarding_sms_sent_at: new Date() })
      .where(eq(referrersTable.id, referrer.id));

    if (result.success) {
      logger.info({ referrerId: referrer.id, smsSid: result.smsSid }, "[startup] Recovered missed onboarding SMS");
    } else {
      logger.error({ referrerId: referrer.id, error: result.error }, "[startup] Missed onboarding SMS failed at recovery");
    }
  }
}
