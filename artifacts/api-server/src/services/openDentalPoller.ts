import { db } from "@workspace/db";
import { referralEventsTable, referrersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendRewardNotification } from "./notifications";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const OPEN_DENTAL_URL = process.env.OPEN_DENTAL_URL;
// Support both OPEN_DENTAL_CUSTOMER_KEY and legacy OPEN_DENTAL_KEY
const OPEN_DENTAL_KEY = process.env.OPEN_DENTAL_CUSTOMER_KEY || process.env.OPEN_DENTAL_KEY;
const OPEN_DENTAL_DEVELOPER_KEY = process.env.OPEN_DENTAL_DEVELOPER_KEY;

interface OpenDentalProcedureLog {
  ProcNum: number;        // Primary key — no ProcLogNum exists on this endpoint
  PatNum: number;
  procCode: string;       // lowercase 'c' — actual field name from OD response
  ProcStatus: string;     // String letter code: "C" = Complete, "D" = Deleted, "EO" = Existing Other, etc.
  ProcDate: string;
  PatientName?: string;
  PatientPhone?: string;
  [key: string]: unknown;
}

// Data model: REF-COMP is posted on the REFERRER's chart in OD.
// proc.PatNum = the referrer (the existing patient who made the referral).
// The new patient name/phone are notes on the procedure, not a separate PatNum.
interface ProcDebug {
  procNum: string;
  referrerPatNum: string;    // proc.PatNum = the referring patient's OD PatNum
  patientName: string | null;
  inReferrersTable: boolean;
  referrerId: string | null;
}

interface SyncResult {
  od_total: number;      // Raw count returned by OD before procCode filter
  fetched: number;       // Count after client-side filter to procCode=REF-COMP
  inserted: number;
  skipped: number;
  errors: string[];
  debug?: ProcDebug[];   // Per-procedure detail — only populated in force mode
}

export async function syncOpenDental(options?: { force?: boolean }): Promise<SyncResult> {
  const force = options?.force ?? false;
  const result: SyncResult = { od_total: 0, fetched: 0, inserted: 0, skipped: 0, errors: [] };

  if (!OPEN_DENTAL_URL || !OPEN_DENTAL_KEY) {
    const msg = "Open Dental not configured — set OPEN_DENTAL_URL and OPEN_DENTAL_KEY";
    logger.warn(msg);
    result.errors.push(msg);
    return result;
  }

  // Fetch completed REF-COMP procedure logs from Open Dental
  let procedures: OpenDentalProcedureLog[] = [];
  try {
    const url = new URL("/api/v1/procedurelogs", OPEN_DENTAL_URL);
    url.searchParams.set("procCode", "REF-COMP");
    url.searchParams.set("ProcStatus", "C");

    const customerKey = OPEN_DENTAL_KEY!.trim();
    const developerKey = OPEN_DENTAL_DEVELOPER_KEY?.trim();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: developerKey
        ? `ODFHIR ${developerKey}/${customerKey}`
        : `ODFHIR ${customerKey}`,
    };

    logger.info({ url: url.toString(), twoKeyMode: !!developerKey }, "Calling Open Dental API (procedurelogs)");

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

    // OD ignores the procCode query param server-side — filter client-side.
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

  // Process each REF-COMP completed procedure log.
  //
  // OD data model: REF-COMP is posted on the REFERRER's chart.
  //   proc.PatNum = the existing patient who made the referral (the referrer).
  // We look up proc.PatNum in our referrers table to identify the referrer,
  // then create a referral event crediting them.
  for (const proc of procedures) {
    const procNum = String(proc.ProcNum);
    const referrerPatNum = String(proc.PatNum);

    try {
      // Dedup check — skipped when force=true so every REF-COMP is reprocessed.
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

      // Find the referrer by their OD PatNum (proc.PatNum = referrer's PatNum)
      const [referrer] = await db
        .select()
        .from(referrersTable)
        .where(eq(referrersTable.patient_id, referrerPatNum));

      // Force-mode debug entry
      if (force) {
        const entry: ProcDebug = {
          procNum,
          referrerPatNum,
          patientName: proc.PatientName ?? null,
          inReferrersTable: !!referrer,
          referrerId: referrer?.id ?? null,
        };
        result.debug!.push(entry);
        logger.info(
          { procNum, referrerPatNum, inReferrersTable: !!referrer, referrerId: referrer?.id ?? null },
          "[force-debug] REF-COMP procedure"
        );
      }

      if (!referrer) {
        result.skipped++;
        logger.debug(
          { referrerPatNum, procNum },
          "No referrer found for PatNum — patient not enrolled in Rippl, skipping"
        );
        continue;
      }

      // In force mode, still guard against creating duplicate events.
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

      // Create the referral event crediting the referrer.
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
        { procNum, referrerPatNum, referrerId: referrer.id, force },
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

  // Run immediately on start, then every 5 minutes
  syncOpenDental().catch((err) => {
    logger.error({ err }, "Open Dental initial sync error");
  });

  pollerTimer = setInterval(() => {
    syncOpenDental().catch((err) => {
      logger.error({ err }, "Open Dental poll error");
    });
  }, POLL_INTERVAL_MS);

  // Unref so the interval doesn't keep the process alive if shutting down
  pollerTimer.unref();
}

export function stopOpenDentalPoller(): void {
  if (pollerTimer) {
    clearInterval(pollerTimer);
    pollerTimer = null;
    logger.info("Open Dental poller stopped");
  }
}
