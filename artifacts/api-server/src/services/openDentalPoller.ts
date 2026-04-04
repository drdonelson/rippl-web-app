import { db } from "@workspace/db";
import { referralEventsTable, referrersTable, officesTable, rewardClaimsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendRewardNotification } from "./notifications";
import { calculateTier } from "../lib/tierUtils";
import { scheduleOnboardingSms } from "./onboardingSms";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const OPEN_DENTAL_URL = process.env.OPEN_DENTAL_URL;
const OPEN_DENTAL_KEY = process.env.OPEN_DENTAL_CUSTOMER_KEY || process.env.OPEN_DENTAL_KEY;
const OPEN_DENTAL_DEVELOPER_KEY = process.env.OPEN_DENTAL_DEVELOPER_KEY;

interface OpenDentalProcedureLog {
  ProcNum: number;
  PatNum: number;        // In REF-COMP flow: this is the NEW patient's PatNum
  procCode: string;
  ProcStatus: string;
  ProcDate: string;
  PatientName?: string;  // New patient's name (chart owner)
  PatientPhone?: string;
  [key: string]: unknown;
}

// A refattach record links a patient (PatNum = new patient) to a referral.
// Real OD response (confirmed via test route):
//   RefAttachNum, ReferralNum, referralName, PatNum, ReferralType, RefDate, ...
// The PatNum of the REFERRING patient is NOT directly here — it lives in the
// Referral record accessible via GET /api/v1/referrals/{ReferralNum}.
interface RefAttach {
  RefAttachNum?: number;
  ReferralNum?: number;
  referralName?: string;   // Display name of the referral source
  PatNum?: number;         // The new patient (same as query param)
  ReferralType?: string;   // "RefFrom" | "RefTo" | etc.
  RefDate?: string;
  [key: string]: unknown;
}

// A referral record — from GET /api/v1/referrals/{ReferralNum}
// PatNum = 0 means the referral source is an external entity (non-patient).
// PatNum > 0 means a patient in OD referred this new patient.
interface OdReferral {
  ReferralNum?: number;
  PatNum?: number;         // Referring patient's PatNum (0 if not a patient)
  LName?: string;
  FName?: string;
  [key: string]: unknown;
}

// Appointment record returned by GET /api/v1/appointments
interface OdAppointment {
  AptNum: number;
  PatNum: number;
  AptDateTime: string;
  AptStatus: number;      // 2 = Complete
  [key: string]: unknown;
}

// Patient record returned by GET /api/v1/patients/{PatNum}
interface OdPatient {
  PatNum: number;
  FName: string;
  LName: string;
  HmPhone: string;        // Home phone
  WirelessPhone: string;  // Mobile / wireless phone (preferred for SMS)
  Email: string;
  MedicaidID: string;     // Non-empty = Medicaid patient — excluded per Anti-Kickback
  [key: string]: unknown;
}

interface ProcDebug {
  procNum: string;
  newPatientPatNum: string;
  newPatientName: string | null;
  refattaches: RefAttach[];
  referralRecord: OdReferral | null;
  referringPatNum: string | null;  // PatNum from the OD Referral record (0 = non-patient)
  inReferrersTable: boolean;
  referrerId: string | null;
}

interface SyncResult {
  od_total: number;
  fetched: number;
  inserted: number;
  skipped: number;
  unmatched: number;   // REF-COMPs where refattaches returned no referrer in our DB
  errors: string[];
  debug?: ProcDebug[];
}

function buildHeaders(customerKey?: string): Record<string, string> {
  const ck = (customerKey ?? OPEN_DENTAL_KEY ?? "").trim();
  const developerKey = OPEN_DENTAL_DEVELOPER_KEY?.trim();
  return {
    "Content-Type": "application/json",
    Authorization: developerKey
      ? `ODFHIR ${developerKey}/${ck}`
      : `ODFHIR ${ck}`,
  };
}

/**
 * Step 1 — GET /api/v1/refattaches?PatNum={newPatientPatNum}
 * Returns the refattach records linking the new patient to their referral source.
 * Confirmed OD response shape:
 *   { RefAttachNum, ReferralNum, referralName, PatNum, ReferralType, ... }
 * The PatNum of the REFERRING patient is NOT here — it lives in the Referral record.
 */
async function fetchRefAttaches(newPatientPatNum: string, headers: Record<string, string>): Promise<RefAttach[]> {
  const url = new URL("/api/v1/refattaches", OPEN_DENTAL_URL!);
  url.searchParams.set("PatNum", newPatientPatNum);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`refattaches returned ${response.status}: ${body}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data as RefAttach[] : [];
}

/**
 * Step 2 — GET /api/v1/referrals/{ReferralNum}
 * Returns the full Referral record which includes:
 *   PatNum — the referring patient's OD PatNum (0 if an external/non-patient referrer)
 *   LName, FName — name of the referral source
 */
async function fetchReferral(referralNum: number, headers: Record<string, string>): Promise<OdReferral | null> {
  const url = new URL(`/api/v1/referrals/${referralNum}`, OPEN_DENTAL_URL!);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`referrals/${referralNum} returned ${response.status}: ${body}`);
  }

  const data = await response.json() as OdReferral;
  return data ?? null;
}

/**
 * Full lookup: refattaches → referral record → referring patient PatNum.
 * Returns { refAttaches, referralRecord, referringPatNum } for debug logging.
 * referringPatNum is null if not found or if the referrer is a non-patient entity.
 */
async function lookupReferringPatNum(
  newPatientPatNum: string,
  headers: Record<string, string>
): Promise<{ refAttaches: RefAttach[]; referralRecord: OdReferral | null; referringPatNum: string | null }> {
  const refAttaches = await fetchRefAttaches(newPatientPatNum, headers);

  if (refAttaches.length === 0) {
    return { refAttaches, referralRecord: null, referringPatNum: null };
  }

  // Use the first "RefFrom" attach if multiple exist, otherwise the first entry
  const attach =
    refAttaches.find(a => a.ReferralType === "RefFrom") ?? refAttaches[0];

  if (!attach.ReferralNum) {
    return { refAttaches, referralRecord: null, referringPatNum: null };
  }

  const referralRecord = await fetchReferral(attach.ReferralNum, headers);

  // PatNum = 0 means external (non-patient) referral source — not trackable in Rippl
  const patNum = referralRecord?.PatNum ?? 0;
  const referringPatNum = patNum > 0 ? String(patNum) : null;

  return { refAttaches, referralRecord, referringPatNum };
}

// ── Appointment-based onboarding helpers ──────────────────────────────────────

/**
 * GET /api/v1/appointments?Status=2&dateStart=...&dateEnd=...
 * Returns completed appointments in the given date window.
 */
async function fetchCompletedAppointments(
  headers: Record<string, string>,
  dateStart: string,
  dateEnd: string
): Promise<OdAppointment[]> {
  const url = new URL("/api/v1/appointments", OPEN_DENTAL_URL!);
  url.searchParams.set("Status", "2");           // 2 = Complete in Open Dental
  url.searchParams.set("dateStart", dateStart);
  url.searchParams.set("dateEnd", dateEnd);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`appointments returned ${response.status}: ${body}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? (data as OdAppointment[]) : [];
}

/**
 * GET /api/v1/patients/{PatNum}
 * Returns the full patient record including contact info and MedicaidID.
 */
async function fetchOdPatient(
  patNum: number,
  headers: Record<string, string>
): Promise<OdPatient | null> {
  const url = new URL(`/api/v1/patients/${patNum}`, OPEN_DENTAL_URL!);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`patients/${patNum} returned ${response.status}: ${body}`);
  }

  const data = await response.json();
  return (data as OdPatient) ?? null;
}

/**
 * Post-visit onboarding sweep.
 *
 * Fetches completed appointments for yesterday + today, then for each
 * unique patient who hasn't yet received an onboarding message, schedules
 * the 2-hour delayed SMS via the existing scheduleOnboardingSms() function.
 *
 * Exclusions (per Anti-Kickback / opt-out rules):
 *   - Patients with no phone number on file
 *   - Medicaid patients (MedicaidID !== "")
 *   - Patients already flagged onboarding_sms_sent = true
 */
async function runOnboardingSweep(
  headers: Record<string, string>,
  officeId: string
): Promise<void> {
  const dateEnd   = new Date().toISOString().split("T")[0];
  const dateStart = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];

  logger.info({ officeId, dateStart, dateEnd }, "[onboarding-sweep] Starting appointment sweep");

  let appointments: OdAppointment[] = [];
  try {
    appointments = await fetchCompletedAppointments(headers, dateStart, dateEnd);
  } catch (err) {
    logger.error({ err, officeId }, "[onboarding-sweep] Failed to fetch appointments — aborting sweep");
    return;
  }

  // Deduplicate PatNums within this poll run (one patient can have multiple appointments)
  const seenPatNums = new Set<number>();
  let newOnboardings = 0;

  for (const apt of appointments) {
    const patNum = apt.PatNum;
    if (!patNum || seenPatNums.has(patNum)) continue;
    seenPatNums.add(patNum);

    try {
      // Fetch patient details from OD to get contact info + Medicaid status
      const patient = await fetchOdPatient(patNum, headers);
      if (!patient) continue;

      // Prefer wireless/mobile phone for SMS; fall back to home phone
      const phone = (patient.WirelessPhone || patient.HmPhone || "").trim();

      // Must have a phone number — scheduleOnboardingSms is SMS-primary
      if (!phone) continue;

      // Exclude Medicaid patients (Anti-Kickback compliance)
      if (patient.MedicaidID && patient.MedicaidID.trim() !== "") {
        logger.debug({ patNum, officeId }, "[onboarding-sweep] Skipping Medicaid patient");
        continue;
      }

      // Check our referrers table by phone — skip if already onboarded
      const existing = await db
        .select({ onboarding_sms_sent: referrersTable.onboarding_sms_sent })
        .from(referrersTable)
        .where(eq(referrersTable.phone, phone));

      if (existing.length > 0 && existing[0].onboarding_sms_sent) {
        logger.debug({ patNum, officeId }, "[onboarding-sweep] Already onboarded — skipping");
        continue;
      }

      const fullName = `${patient.FName ?? ""} ${patient.LName ?? ""}`.trim() || "Patient";

      // Hand off to the existing service — it handles referrer creation,
      // the 2-hour setTimeout, and setting onboarding_sms_sent = true on delivery.
      await scheduleOnboardingSms({
        newPatientName:  fullName,
        newPatientPhone: phone,
        referralEventId: `apt-${apt.AptNum}`,
      });

      logger.info(
        { patNum, officeId, fullName },
        "[onboarding-sweep] Post-visit onboarding scheduled"
      );

      newOnboardings++;
    } catch (err) {
      logger.error(
        { err, patNum, officeId },
        "[onboarding-sweep] Error processing patient — continuing"
      );
    }
  }

  logger.info(
    { officeId, appointmentsFound: appointments.length, newOnboardings },
    "Appointment onboarding sweep complete"
  );
}

// ── Main sync ─────────────────────────────────────────────────────────────────

export async function syncOpenDental(options?: {
  force?: boolean;
  office?: { id: string; name: string; customer_key: string };
}): Promise<SyncResult> {
  const force    = options?.force ?? false;
  const office   = options?.office ?? null;
  const result: SyncResult = {
    od_total: 0, fetched: 0, inserted: 0, skipped: 0, unmatched: 0, errors: [],
  };

  if (!OPEN_DENTAL_URL) {
    const msg = "Open Dental not configured — set OPEN_DENTAL_URL";
    logger.warn(msg);
    result.errors.push(msg);
    return result;
  }

  const customerKey = office?.customer_key ?? OPEN_DENTAL_KEY;
  if (!customerKey) {
    const msg = office
      ? `Office "${office.name}" has no customer key configured`
      : "OPEN_DENTAL_KEY not set";
    logger.warn(msg);
    result.errors.push(msg);
    return result;
  }

  const headers = buildHeaders(customerKey);

  // ── Step 1: Fetch completed REF-COMP procedure logs ───────────────────────
  let procedures: OpenDentalProcedureLog[] = [];
  try {
    const url = new URL("/api/v1/procedurelogs", OPEN_DENTAL_URL);
    url.searchParams.set("procCode", "REF-COMP");
    url.searchParams.set("ProcStatus", "C");

    logger.info({ url: url.toString() }, "Calling Open Dental API (procedurelogs)");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Open Dental API returned ${response.status}: ${body}`);
    }

    const all = await response.json() as OpenDentalProcedureLog[];
    result.od_total = all.length;

    // OD ignores the procCode query param server-side — filter client-side
    procedures = all.filter(p => p.procCode === "REF-COMP");
    result.fetched = procedures.length;

    logger.info(
      { od_total: result.od_total, ref_comp: result.fetched },
      "Fetched procedure logs from Open Dental — filtered to REF-COMP"
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result.errors.push(`Fetch failed: ${message}`);
    logger.error({ err }, "Failed to fetch from Open Dental API");
    return result;
  }

  if (force) result.debug = [];

  // ── Step 2: Process each REF-COMP ─────────────────────────────────────────
  //
  // Architecture (corrected):
  //   proc.PatNum = the NEW patient's PatNum (the chart the procedure is on)
  //   GET /api/v1/refattaches?PatNum={newPatNum} → referral attachment for this patient
  //   Extract referring patient's PatNum from the refattach record
  //   Look up that PatNum in our referrers table
  //   If found  → create referral event + notify referrer
  //   If not found → log as unmatched for manual review

  for (const proc of procedures) {
    const procNum       = String(proc.ProcNum);
    const newPatientPatNum = String(proc.PatNum);  // NEW patient, not referrer

    try {
      // Dedup check (skipped in force mode)
      if (!force) {
        const existing = await db
          .select({ id: referralEventsTable.id })
          .from(referralEventsTable)
          .where(eq(referralEventsTable.external_proc_num, procNum));

        if (existing.length > 0) {
          result.skipped++;
          logger.debug({ procNum }, "Procedure already synced — skipping");
          continue;
        }
      }

      // ── Step 1 + 2: refattaches → referral record → referring PatNum ────────
      let refAttaches: RefAttach[] = [];
      let referralRecord: OdReferral | null = null;
      let referringPatNum: string | null = null;

      try {
        ({ refAttaches, referralRecord, referringPatNum } = await lookupReferringPatNum(
          newPatientPatNum,
          headers
        ));
        logger.info(
          { procNum, newPatientPatNum, refattachCount: refAttaches.length, referringPatNum },
          "Referral lookup complete"
        );
      } catch (refErr) {
        const msg = refErr instanceof Error ? refErr.message : String(refErr);
        logger.warn({ procNum, newPatientPatNum, err: msg }, "Failed to resolve referral — skipping");
        result.errors.push(`Proc ${procNum}: referral lookup failed: ${msg}`);
        result.skipped++;
        continue;
      }

      // ── Look up referrer in Rippl DB ──────────────────────────────────────
      let referrer: typeof referrersTable.$inferSelect | undefined;
      if (referringPatNum) {
        [referrer] = await db
          .select()
          .from(referrersTable)
          .where(eq(referrersTable.patient_id, referringPatNum));
      }

      // ── Force-mode debug entry ────────────────────────────────────────────
      if (force) {
        const entry: ProcDebug = {
          procNum,
          newPatientPatNum,
          newPatientName: proc.PatientName ?? null,
          refattaches: refAttaches,
          referralRecord,
          referringPatNum,
          inReferrersTable: !!referrer,
          referrerId: referrer?.id ?? null,
        };
        result.debug!.push(entry);
        logger.info(entry, "[force-debug] REF-COMP procedure");
      }

      // ── Referrer not found in our DB ──────────────────────────────────────
      if (!referrer) {
        result.unmatched++;
        logger.warn(
          { procNum, newPatientPatNum, referringPatNum, refattachCount: refAttaches.length },
          referringPatNum
            ? "Referring PatNum found in refattaches but not enrolled in Rippl — needs manual review"
            : "No referring PatNum in refattaches — needs manual review"
        );
        result.errors.push(
          referringPatNum
            ? `Proc ${procNum}: referring PatNum ${referringPatNum} not in referrers table`
            : `Proc ${procNum}: refattaches returned no referring PatNum for new patient ${newPatientPatNum}`
        );
        continue;
      }

      // Force mode: guard against duplicate events
      if (force) {
        const existing = await db
          .select({ id: referralEventsTable.id })
          .from(referralEventsTable)
          .where(eq(referralEventsTable.external_proc_num, procNum));

        if (existing.length > 0) {
          result.skipped++;
          logger.debug({ procNum }, "Force mode — event already present, skipping duplicate");
          continue;
        }
      }

      // ── Create referral event ─────────────────────────────────────────────
      const [newEvent] = await db
        .insert(referralEventsTable)
        .values({
          new_patient_name:  proc.PatientName ?? "Unknown Patient",
          new_patient_phone: proc.PatientPhone ?? "",
          referrer_id:       referrer.id,
          team_source:       "open-dental-sync",
          office:            office?.name ?? "Hallmark Dental",
          office_id:         office?.id ?? null,
          status:            "Exam Completed",
          external_proc_num: procNum,
        })
        .returning();

      result.inserted++;
      logger.info(
        { procNum, newPatientPatNum, referringPatNum, referrerId: referrer.id, force },
        "Synced new referral event from Open Dental"
      );

      // ── Update referrer tier ──────────────────────────────────────────────
      try {
        const [current] = await db
          .select({ total_referrals: referrersTable.total_referrals, tier: referrersTable.tier })
          .from(referrersTable)
          .where(eq(referrersTable.id, referrer.id))
          .limit(1);

        const newTotal    = (current?.total_referrals ?? 0) + 1;
        const oldTier     = current?.tier ?? "starter";
        const newTierData = calculateTier(newTotal);

        await db
          .update(referrersTable)
          .set({
            total_referrals: newTotal,
            tier: newTierData.name,
            reward_value: newTierData.rewardValue,
            ...(newTierData.name !== oldTier ? { tier_unlocked_at: new Date() } : {}),
          })
          .where(eq(referrersTable.id, referrer.id));

        if (newTierData.name !== oldTier) {
          logger.info({ referrerId: referrer.id, oldTier, newTier: newTierData.name }, "Tier upgraded");
        }
      } catch (tierErr) {
        logger.error({ err: tierErr }, "Failed to update referrer tier");
      }

      // ── Generate one-time claim token ────────────────────────────────────
      let claimToken: string = referrer.referral_code; // fallback — never leaks if insert fails
      try {
        claimToken = crypto.randomUUID();
        await db.insert(rewardClaimsTable).values({
          claim_token:       claimToken,
          referral_event_id: newEvent.id,
          referrer_id:       referrer.id,
          reward_value:      newTierData.rewardValue,
          status:            "pending",
        });
      } catch (claimErr) {
        logger.error({ err: claimErr }, "Failed to create reward_claims record — using referral_code as fallback token");
        claimToken = referrer.referral_code;
      }

      // Notify the referrer
      sendRewardNotification(
        referrer.name,
        referrer.phone,
        referrer.email ?? null,
        newEvent.new_patient_name,
        claimToken,
        office?.name ?? "Hallmark Dental",
        newTierData.rewardValue
      ).then((notifResult) => {
        logger.info({ notifResult, procNum }, "Notification sent for synced referral");
      }).catch((err) => {
        logger.error({ err, procNum }, "Notification failed for synced referral");
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push(`Procedure ${procNum}: ${message}`);
      logger.error({ err, procNum }, "Error processing procedure");
    }
  }

  logger.info(result, "Open Dental sync complete");

  // ── Step 3: Post-visit onboarding sweep ───────────────────────────────────
  // Runs after REF-COMP processing. Errors here are isolated — they never
  // affect the SyncResult returned to the caller.
  try {
    await runOnboardingSweep(headers, office?.id ?? "default");
  } catch (err) {
    logger.error({ err }, "[onboarding-sweep] Uncaught sweep error — REF-COMP results unaffected");
  }

  return result;
}

/**
 * Loads all active offices from the DB and runs syncOpenDental for each one.
 * Falls back to the legacy single-key mode if no offices are configured.
 */
export async function syncAllOffices(options?: { force?: boolean }): Promise<SyncResult[]> {
  if (!OPEN_DENTAL_URL) {
    logger.warn("OPEN_DENTAL_URL not set — skipping multi-office sync");
    return [];
  }

  const offices = await db
    .select()
    .from(officesTable)
    .where(eq(officesTable.active, true));

  if (offices.length === 0) {
    // No offices configured — fall back to single-key mode
    logger.info("No active offices in DB — falling back to single-key mode");
    const result = await syncOpenDental(options);
    return [result];
  }

  logger.info({ officeCount: offices.length }, "Syncing all active offices");

  const results: SyncResult[] = [];
  for (const office of offices) {
    logger.info({ officeId: office.id, officeName: office.name }, "Syncing office");
    try {
      const result = await syncOpenDental({ ...options, office });
      results.push(result);
    } catch (err) {
      logger.error({ err, officeId: office.id }, "Error syncing office");
    }
  }
  return results;
}

let pollerTimer: ReturnType<typeof setInterval> | null = null;

export function startOpenDentalPoller(): void {
  if (!OPEN_DENTAL_URL) {
    logger.warn("OPEN_DENTAL_URL not set — Open Dental poller disabled");
    return;
  }

  logger.info({ intervalMs: POLL_INTERVAL_MS }, "Starting Open Dental poller");

  syncAllOffices().catch((err) => {
    logger.error({ err }, "Open Dental initial sync error");
  });

  pollerTimer = setInterval(() => {
    syncAllOffices().catch((err) => {
      logger.error({ err }, "Open Dental poll error");
    });
  }, POLL_INTERVAL_MS);

  pollerTimer.unref();
}

export function stopOpenDentalPoller(): void {
  if (pollerTimer) {
    clearInterval(pollerTimer);
    pollerTimer = null;
    logger.info("Open Dental poller stopped");
  }
}
