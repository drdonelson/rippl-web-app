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
  // A practice that exists but has no number of its own gets NO number — never the global
  // fallback. The global number is Hallmark Dental's toll-free line, approved for dental
  // ACCOUNT_NOTIFICATION after months of work and five 10DLC rejections.
  //
  // This used to fall through to it and only log. On 2026-08-14 the SFTP processor enrolled
  // six Carlock buyers and texted them "Congrats on your new vehicle!" — car-sales content,
  // from a dental practice's registered toll-free number, for an unapproved use case. That is
  // the exact wrong-tenant fallback this now refuses.
  //
  // Returning "" is safe: every caller checks it and declines to send
  // (onboardingSms.ts:69, notifications.ts:83, referralLinkService.ts:280,
  // publicLookup.ts:140). The automotive enrol path never sets onboarding_sms_sent, so a
  // refusal costs nothing — the referrer stays enrolled and the failure is visible.
  // Legacy rows with no practice at all still use the env number, which is correct for them.
  if (practice && !practice.twilio_phone_number) {
    logger.error(
      {
        practiceId: practice.id,
        practiceName: practice.name,
        vertical: practice.vertical,
      },
      "practices.twilio_phone_number is not set — REFUSING to send. Sending would use the " +
      "global number, which is wrong for any practice that is not Hallmark Dental. " +
      "Set it in /practice-admin.",
    );
    return "";
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
