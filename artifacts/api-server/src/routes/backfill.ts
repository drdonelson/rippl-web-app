import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { buildHeaders, resolveNewPatientName } from "../services/openDentalPoller";

const router: IRouter = Router();

interface UnknownRow {
  id: string;
  new_patient_pat_num: string | null;
  office_id: string | null;
}

interface OfficeRow {
  id: string;
  name: string;
  customer_key: string;
  od_url: string | null;
}

interface BackfillReport {
  scanned: number;
  resolved: number;
  stillUnknown: number;
  skipped: number;
  errors: Array<{ eventId: string; reason: string }>;
  updates: Array<{ eventId: string; from: string; to: string }>;
}

router.post("/unknown-names", async (req, res) => {
  const report: BackfillReport = {
    scanned: 0, resolved: 0, stillUnknown: 0, skipped: 0, errors: [], updates: [],
  };

  try {
    const { rows: events } = await db.execute(sql`
      SELECT id, new_patient_pat_num, office_id
      FROM referral_events
      WHERE new_patient_name = 'Unknown Patient'
    `);
    const unknownRows = events as unknown as UnknownRow[];
    report.scanned = unknownRows.length;

    if (unknownRows.length === 0) {
      res.json(report);
      return;
    }

    const { rows: officeRows } = await db.execute(sql`
      SELECT id, name, customer_key, od_url FROM offices WHERE active = true
    `);
    const officeMap = new Map<string, OfficeRow>();
    for (const o of officeRows as unknown as OfficeRow[]) officeMap.set(o.id, o);

    for (const evt of unknownRows) {
      if (!evt.new_patient_pat_num) {
        report.skipped++;
        report.errors.push({ eventId: evt.id, reason: "no new_patient_pat_num on row" });
        continue;
      }

      const office = evt.office_id ? officeMap.get(evt.office_id) : null;
      const headers = buildHeaders(office?.customer_key);
      const odUrl = office?.od_url ?? process.env.OPEN_DENTAL_URL ?? "";

      try {
        const name = await resolveNewPatientName(evt.new_patient_pat_num, evt.office_id, headers, odUrl);

        if (name && name !== "Unknown Patient") {
          await db.execute(sql`
            UPDATE referral_events
            SET new_patient_name = ${name}
            WHERE id = ${evt.id}
          `);
          report.resolved++;
          report.updates.push({ eventId: evt.id, from: "Unknown Patient", to: name });
          req.log.info({ eventId: evt.id, name, officeId: evt.office_id }, "[backfill] Resolved unknown patient name");
        } else {
          report.stillUnknown++;
        }
      } catch (err) {
        report.errors.push({
          eventId: evt.id,
          reason: err instanceof Error ? err.message : "unknown error",
        });
        req.log.warn({ err, eventId: evt.id }, "[backfill] Failed to resolve name for event");
      }
    }

    req.log.info({ report }, "[backfill] Unknown-names backfill complete");
    res.json(report);
  } catch (err) {
    req.log.error({ err }, "[backfill] Unknown-names backfill failed");
    res.status(500).json({
      error: err instanceof Error ? err.message : "Backfill failed",
      report,
    });
  }
});

export default router;
