import { db } from "@workspace/db";
import { referralEventsTable, referrersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendRewardNotification } from "./notifications";

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

function buildHeaders(): Record<string, string> {
  const customerKey = OPEN_DENTAL_KEY!.trim();
  const developerKey = OPEN_DENTAL_DEVELOPER_KEY?.trim();
  return {
    "Content-Type": "application/json",
    Authorization: developerKey
      ? `ODFHIR ${developerKey}/${customerKey}`
      : `ODFHIR ${customerKey}`,
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

export async function syncOpenDental(options?: { force?: boolean }): Promise<SyncResult> {
  const force = options?.force ?? false;
  const result: SyncResult = {
    od_total: 0, fetched: 0, inserted: 0, skipped: 0, unmatched: 0, errors: [],
  };

  if (!OPEN_DENTAL_URL || !OPEN_DENTAL_KEY) {
    const msg = "Open Dental not configured — set OPEN_DENTAL_URL and OPEN_DENTAL_KEY";
    logger.warn(msg);
    result.errors.push(msg);
    return result;
  }

  const headers = buildHeaders();

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
          refattaches,
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
          office:            "Hallmark Dental",
          status:            "Exam Completed",
          external_proc_num: procNum,
        })
        .returning();

      result.inserted++;
      logger.info(
        { procNum, newPatientPatNum, referringPatNum, referrerId: referrer.id, force },
        "Synced new referral event from Open Dental"
      );

      // Notify the referrer
      sendRewardNotification(
        referrer.name,
        referrer.phone,
        referrer.email ?? null,
        newEvent.new_patient_name,
        referrer.referral_code
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
  return result;
}

let pollerTimer: ReturnType<typeof setInterval> | null = null;

export function startOpenDentalPoller(): void {
  if (!OPEN_DENTAL_URL || !OPEN_DENTAL_KEY) {
    logger.warn("OPEN_DENTAL_URL or OPEN_DENTAL_KEY not set — Open Dental poller disabled");
    return;
  }

  logger.info({ intervalMs: POLL_INTERVAL_MS }, "Starting Open Dental poller");

  syncOpenDental().catch((err) => {
    logger.error({ err }, "Open Dental initial sync error");
  });

  pollerTimer = setInterval(() => {
    syncOpenDental().catch((err) => {
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
