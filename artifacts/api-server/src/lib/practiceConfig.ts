import twilio from "twilio";
import { logger } from "./logger";
import { db } from "@workspace/db";
import { practicesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { Practice } from "@workspace/db/schema";

const cache = new Map<string, { practice: Practice; fetchedAt: number }>();
const TTL_MS = 60_000; // 1-minute cache — avoids a DB hit per request

export async function getPracticeConfig(practiceId: string | null): Promise<Practice | null> {
  if (!practiceId) return null;

  const cached = cache.get(practiceId);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.practice;

  const [practice] = await db
    .select()
    .from(practicesTable)
    .where(eq(practicesTable.id, practiceId))
    .limit(1);

  if (practice) cache.set(practiceId, { practice, fetchedAt: Date.now() });
  return practice ?? null;
}

export function invalidatePracticeCache(practiceId: string) {
  cache.delete(practiceId);
}

/** Resolve the Twilio from-number for a practice, falling back to the global env var. */
export function resolveTwilioPhone(practice: Practice | null): string {
  if (practice && !practice.twilio_phone_number) {
    // The global fallback is Hallmark Dental's approved toll-free number. A practice row that
    // exists but has no number of its own will send from it — so a Volvo or Carlock customer
    // receives a text from a dental office, and traffic for an unapproved use case rides a
    // toll-free registration that took months and five 10DLC rejections to obtain.
    //
    // Deliberately NOT thrown. sendOnboardingSmsNow marks onboarding_sms_sent = true even when
    // the send fails (to stop infinite retries), so throwing here would silently burn the
    // enrollment — swapping one invisible failure for another. Loud and logged beats both.
    // Legacy referrers with no practice_id at all are unaffected: for them the global number is
    // correct, which is why this only fires when a practice row exists.
    logger.error(
      {
        practiceId: practice.id,
        practiceName: practice.name,
        vertical: practice.vertical,
        fallbackNumber: process.env.TWILIO_PHONE_NUMBER,
      },
      "practices.twilio_phone_number is not set — SMS will send from the GLOBAL number, which " +
      "is wrong for any practice that is not Hallmark Dental. Set it in /practice-admin.",
    );
  }
  return practice?.twilio_phone_number ?? process.env.TWILIO_PHONE_NUMBER ?? "";
}

/** Resolve a Twilio client for a practice, falling back to global env vars. */
export function resolveTwilioClient(practice: Practice | null): ReturnType<typeof twilio> {
  const sid   = practice?.twilio_account_sid ?? process.env.TWILIO_ACCOUNT_SID;
  const token = practice?.twilio_auth_token  ?? process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error("Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)");
  }
  return twilio(sid, token);
}

/** Resolve the from-email for a practice, falling back to the global env var. */
export function resolveFromEmail(practice: Practice | null): { email: string; name: string } {
  return {
    email: practice?.sendgrid_from_email ?? process.env.SENDGRID_FROM_EMAIL ?? "hello@joinrippl.com",
    name:  practice?.sendgrid_from_name  ?? (practice?.name ? `${practice.name} by Rippl` : "Rippl"),
  };
}

const VERTICAL_TANGO_TEMPLATES: Record<string, string> = {
  dental:     "E813474",
  salon:      "E336474",
  automotive: "E301464",
};

/** Resolve the Tango email template ID for a practice.
 *  Priority: per-practice override → vertical default → env var → dental fallback. */
export function resolveTangoTemplate(practice: Practice | null): string {
  if (practice?.tango_email_template_id) return practice.tango_email_template_id;
  const vertical = practice?.vertical ?? "dental";
  return VERTICAL_TANGO_TEMPLATES[vertical] ?? process.env.TANGO_EMAIL_TEMPLATE_ID ?? "E813474";
}
