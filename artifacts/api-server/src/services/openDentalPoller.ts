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

interface SyncResult {
  fetched: number;
  inserted: number;
  skipped: number;
  errors: string[];
}

export async function syncOpenDental(): Promise<SyncResult> {
  const result: SyncResult = { fetched: 0, inserted: 0, skipped: 0, errors: [] };

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
    url.searchParams.set("procCode", "REF-COMP");  // lowercase — actual OD field name
    url.searchParams.set("ProcStatus", "C");         // "C" = Complete (string, not numeric)

    // Open Dental REST API authentication format:
    //   Authorization: ODFHIR {DeveloperKey}/{CustomerKey}
    // Both keys are combined with a forward slash in a single Authorization header.
    const customerKey = OPEN_DENTAL_KEY!.trim();
    const developerKey = OPEN_DENTAL_DEVELOPER_KEY?.trim();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (developerKey) {
      headers["Authorization"] = `ODFHIR ${developerKey}/${customerKey}`;
    } else {
      // Fallback if only one key is configured
      headers["Authorization"] = `ODFHIR ${customerKey}`;
    }

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

    procedures = await response.json() as OpenDentalProcedureLog[];
    result.fetched = procedures.length;
    logger.info({ count: procedures.length }, "Fetched procedure logs from Open Dental");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result.errors.push(`Fetch failed: ${message}`);
    logger.error({ err }, "Failed to fetch from Open Dental API");
    return result;
  }

  // Process each completed procedure log
  // ProcNum is the only ID field — procedurelogs has no ProcLogNum
  for (const proc of procedures) {
    const procNum = String(proc.ProcNum);
    const patNum = String(proc.PatNum);

    try {
      // Dedup: skip if we already have a referral_event with this external_proc_num
      const existing = await db
        .select({ id: referralEventsTable.id })
        .from(referralEventsTable)
        .where(eq(referralEventsTable.external_proc_num, procNum));

      if (existing.length > 0) {
        result.skipped++;
        logger.debug({ procNum }, "Procedure already synced — skipping");
        continue;
      }

      // Find the referrer by Open Dental patient ID
      const [referrer] = await db
        .select()
        .from(referrersTable)
        .where(eq(referrersTable.patient_id, patNum));

      if (!referrer) {
        result.skipped++;
        logger.debug({ patNum, procNum }, "No referrer found for patient_id — skipping");
        continue;
      }

      // Create a new referral event with status Exam Completed
      const [newEvent] = await db
        .insert(referralEventsTable)
        .values({
          new_patient_name: proc.PatientName ?? "Unknown Patient",
          new_patient_phone: proc.PatientPhone ?? "",
          referrer_id: referrer.id,
          team_source: "open-dental-sync",
          office: "Hallmark Dental",
          status: "Exam Completed",
          external_proc_num: procNum,
        })
        .returning();

      result.inserted++;
      logger.info({ procNum, patNum, referrerId: referrer.id }, "Synced new referral event from Open Dental");

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
