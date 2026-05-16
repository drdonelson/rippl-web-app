import { db } from "@workspace/db";
import { referrersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import type { Referrer } from "@workspace/db/schema";

export interface MatchResult {
  referrer: Referrer;
  matchType: "exact" | "partial" | "phone";
}

/**
 * Match an incoming name (from a form/survey) to an existing referrer in the practice.
 *
 * Tier 1: Exact full-name match (case-insensitive).
 * Tier 2: First + last partial match (split on whitespace, check both tokens present).
 * Tier 3: Phone match (only if phone is provided and non-empty).
 */
export async function matchReferrerByName(
  inputName: string,
  practiceId: string,
  inputPhone?: string,
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

  // Tier 3: phone match
  if (inputPhone) {
    const digits = inputPhone.replace(/\D/g, "");
    if (digits.length >= 7) {
      for (const r of referrers) {
        const rDigits = r.phone.replace(/\D/g, "");
        if (rDigits && rDigits.endsWith(digits.slice(-10))) {
          return { referrer: r, matchType: "phone" };
        }
      }
    }
  }

  return null;
}
