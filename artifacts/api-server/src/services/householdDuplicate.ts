import { createHash } from "crypto";
import { db } from "@workspace/db";
import { referralEventsTable } from "@workspace/db/schema";
import { eq, or, and, ne } from "drizzle-orm";
import { logger } from "../lib/logger";

/**
 * Generate a stable household_id string from last name + street address.
 * Falls back to just last name if no address is available.
 */
export function buildHouseholdId(lastName: string, streetAddress?: string): string {
  const key = [
    lastName.toLowerCase().replace(/\s+/g, ""),
    (streetAddress ?? "").toLowerCase().replace(/\s+/g, ""),
  ].join("|");

  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

export interface HouseholdCheckResult {
  household_id: string;
  is_duplicate: boolean;
  conflicting_event_id?: string;
  od_address_found: boolean;
}

/**
 * Check whether a new referral is a household duplicate.
 *
 * The caller resolves the patient's last name and street address from Open Dental
 * (via PatNum lookup) before calling this function. We do NOT do our own OD
 * lookup here — OD procedure records don't carry phone numbers, so a phone-based
 * lookup always returns wrong data.
 *
 * A referral is a household duplicate only when the SAME REFERRER has already
 * been rewarded for a different household member (same last name + address).
 * A husband referring his wife is not a duplicate; but a referrer who already
 * got a reward for the husband should not get another for the child.
 */
export async function checkHouseholdDuplicate(
  patientLastName: string,
  streetAddress: string | undefined,
  referrerId?: string,
  excludeEventId?: string
): Promise<HouseholdCheckResult> {
  const householdId = buildHouseholdId(patientLastName, streetAddress);

  logger.info(
    { patientLastName, streetAddress, householdId, addressFound: !!streetAddress },
    "Household ID generated"
  );

  const conditions = [
    eq(referralEventsTable.household_id, householdId),
    or(
      eq(referralEventsTable.status, "Exam Completed"),
      eq(referralEventsTable.status, "Reward Sent")
    )!,
  ];

  if (referrerId) {
    conditions.push(eq(referralEventsTable.referrer_id, referrerId));
  }

  if (excludeEventId) {
    conditions.push(ne(referralEventsTable.id, excludeEventId));
  }

  const existing = await db
    .select({ id: referralEventsTable.id })
    .from(referralEventsTable)
    .where(and(...conditions));

  const isDuplicate = existing.length > 0;

  logger.info({ householdId, isDuplicate, matchCount: existing.length }, "Household duplicate check complete");

  return {
    household_id: householdId,
    is_duplicate: isDuplicate,
    conflicting_event_id: existing[0]?.id,
    od_address_found: !!streetAddress,
  };
}
