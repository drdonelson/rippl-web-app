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
  return practice?.twilio_phone_number ?? process.env.TWILIO_PHONE_NUMBER ?? "";
}

/** Resolve the from-email for a practice, falling back to the global env var. */
export function resolveFromEmail(practice: Practice | null): { email: string; name: string } {
  return {
    email: practice?.sendgrid_from_email ?? process.env.SENDGRID_FROM_EMAIL ?? "hello@joinrippl.com",
    name:  practice?.sendgrid_from_name  ?? practice?.name ?? "Rippl",
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
