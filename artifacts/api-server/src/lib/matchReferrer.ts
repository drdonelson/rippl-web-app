import { db } from "@workspace/db";
import { referrersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import type { Referrer } from "@workspace/db/schema";

export interface MatchResult {
  referrer: Referrer;
  matchType: "code" | "exact" | "partial";
}

/**
 * Match by referral code — exact lookup against referral_code column.
 * Used when SourceDescription contains the referrer's Rippl code (e.g. "MIKEX7K2").
 * Normalized to uppercase before lookup since codes are always stored uppercase.
 */
export async function matchReferrerByCode(
  code: string,
  practiceId: string,
): Promise<MatchResult | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  const [referrer] = await db
    .select()
    .from(referrersTable)
    .where(and(
      eq(referrersTable.referral_code, normalized),
      eq(referrersTable.practice_id, practiceId),
    ));

  return referrer ? { referrer, matchType: "code" } : null;
}

/**
 * Match an incoming name (from a form/survey) to an existing referrer in the practice.
 *
 * Tier 1: Exact full-name match (case-insensitive).
 * Tier 2: First + last partial match (split on whitespace, check both tokens present).
 *
 * There is deliberately NO phone tier. Every caller only ever had the REFERRED person's
 * phone to offer (Vagaro clientPhone, DriveCentric customerPhone/buyerPhone) — never the
 * referrer's. Matching on it meant the referred person identified their own referrer:
 * the SFTP processor auto-enrols the buyer first, so a name that failed Tier 1/2 then
 * matched the buyer's own brand-new row and credited them for referring themselves. It
 * also pre-empted the pre-referral-link fallback, and it collapsed households onto
 * whichever family member sorted first. Buyer identity and referrer identity must stay
 * distinct. Unmatched names belong in staff review, not in an automatic payout.
 */
export async function matchReferrerByName(
  inputName: string,
  practiceId: string,
): Promise<MatchResult | null> {
  const normalized = inputName.trim().toLowerCase();
  if (!normalized) return null;

  const referrers = await db
    .select()
    .from(referrersTable)
    .where(eq(referrersTable.practice_id, practiceId));

  // Tier 1: exact full-name match
  for (const r of referrers) {
    if (r.name.trim().toLowerCase() === normalized) {
      return { referrer: r, matchType: "exact" };
    }
  }

  // Tier 2: first + last partial match
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0]!;
    const last  = parts[parts.length - 1]!;
    for (const r of referrers) {
      const rNorm = r.name.trim().toLowerCase();
      if (rNorm.includes(first) && rNorm.includes(last)) {
        return { referrer: r, matchType: "partial" };
      }
    }
  }

  return null;
}
