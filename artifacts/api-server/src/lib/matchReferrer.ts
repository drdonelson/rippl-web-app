import { db } from "@workspace/db";
import { referrersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import type { Referrer } from "@workspace/db/schema";

export interface MatchResult {
  referrer: Referrer;
  matchType: "code";
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

/** Free-text attribution is review-only. Callers retain their existing unmatched task flow. */
export async function matchReferrerByName(
  _inputName: string,
  _practiceId: string,
): Promise<MatchResult | null> {
  return null;
}
