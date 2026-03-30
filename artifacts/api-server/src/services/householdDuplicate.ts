import { createHash } from "crypto";
import { db } from "@workspace/db";
import { referralEventsTable } from "@workspace/db/schema";
import { eq, or, and, ne } from "drizzle-orm";
import { logger } from "../lib/logger";

const OPEN_DENTAL_URL = process.env.OPEN_DENTAL_URL;
const OPEN_DENTAL_KEY = process.env.OPEN_DENTAL_CUSTOMER_KEY || process.env.OPEN_DENTAL_KEY;
const OPEN_DENTAL_DEVELOPER_KEY = process.env.OPEN_DENTAL_DEVELOPER_KEY;

interface OpenDentalPatient {
  PatNum?: number;
  LName?: string;
  FName?: string;
  Address?: string;
  Address2?: string;
  City?: string;
  State?: string;
  Zip?: string;
  HmPhone?: string;
  WkPhone?: string;
  WirelessPhone?: string;
}

/** Build the OD auth header in ODFHIR format. */
function buildOdAuthHeader(): string | null {
  const customerKey = OPEN_DENTAL_KEY?.trim();
  const developerKey = OPEN_DENTAL_DEVELOPER_KEY?.trim();
  if (!customerKey) return null;
  return developerKey ? `ODFHIR ${developerKey}/${customerKey}` : `ODFHIR ${customerKey}`;
}

/**
 * Attempt to look up a patient in Open Dental by phone number.
 * Returns the first matching patient, or null if OD is unavailable / patient not found.
 */
async function lookupPatientByPhone(phone: string): Promise<OpenDentalPatient | null> {
  if (!OPEN_DENTAL_URL || !OPEN_DENTAL_KEY) return null;

  const authHeader = buildOdAuthHeader();
  if (!authHeader) return null;

  // Normalise phone to digits only for the query
  const digitsOnly = phone.replace(/\D/g, "");

  try {
    const url = new URL("/api/v1/patients", OPEN_DENTAL_URL);
    url.searchParams.set("Phone", digitsOnly);

    const res = await fetch(url.toString(), {
      headers: { "Authorization": authHeader, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, "OD patient lookup returned non-200 — skipping");
      return null;
    }

    const data = await res.json() as OpenDentalPatient | OpenDentalPatient[];
    const patients = Array.isArray(data) ? data : [data];
    return patients[0] ?? null;
  } catch (err) {
    logger.warn({ err }, "OD patient lookup failed — household_id will use name fallback");
    return null;
  }
}

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

/**
 * Extract the last name from a full name string.
 * "Sarah Jane Mitchell" → "mitchell"
 */
function extractLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return (parts[parts.length - 1] ?? fullName).toLowerCase();
}

export interface HouseholdCheckResult {
  household_id: string;
  is_duplicate: boolean;
  conflicting_event_id?: string;
  od_address_found: boolean;
}

/**
 * Run the full household duplicate check for a new referral event.
 *
 * 1. Tries to look up the patient's address in Open Dental.
 * 2. Builds a household_id from last name + address (or last name only on fallback).
 * 3. Checks for any prior referral_event with the same household_id and a
 *    terminal status (Exam Completed / Reward Sent).
 */
export async function checkHouseholdDuplicate(
  newPatientName: string,
  newPatientPhone: string,
  excludeEventId?: string
): Promise<HouseholdCheckResult> {
  // Step 1 — try OD lookup
  const odPatient = await lookupPatientByPhone(newPatientPhone);
  const odAddressFound = !!(odPatient?.Address);

  // Step 2 — build household_id
  const lastName = odPatient?.LName
    ? odPatient.LName.toLowerCase().replace(/\s+/g, "")
    : extractLastName(newPatientName);

  const streetAddress = odPatient?.Address ?? undefined;
  const householdId = buildHouseholdId(lastName, streetAddress);

  logger.info(
    { lastName, streetAddress, householdId, odAddressFound },
    "Household ID generated"
  );

  // Step 3 — check for existing completed events with the same household_id
  const conditions = [
    eq(referralEventsTable.household_id, householdId),
    or(
      eq(referralEventsTable.status, "Exam Completed"),
      eq(referralEventsTable.status, "Reward Sent")
    )!,
  ];

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
    od_address_found: odAddressFound,
  };
}
