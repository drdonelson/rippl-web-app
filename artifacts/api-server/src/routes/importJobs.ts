import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { referrersTable, officesTable } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { logger } from "../lib/logger";
import crypto from "node:crypto";

const router: IRouter = Router();

// ── In-memory job store ────────────────────────────────────────────────────
export interface ImportJob {
  id: string;
  office_id: string | null;
  status: "running" | "done" | "error";
  imported: number;
  skipped: number;
  total_od: number;
  pages_fetched: number;
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

const jobs = new Map<string, ImportJob>();

function scheduleCleanup(jobId: string) {
  setTimeout(() => jobs.delete(jobId), 30 * 60 * 1000);
}

// ── Open Dental helpers ────────────────────────────────────────────────────
const OPEN_DENTAL_URL           = process.env.OPEN_DENTAL_URL;
const DEFAULT_CUSTOMER_KEY      = process.env.OPEN_DENTAL_CUSTOMER_KEY || process.env.OPEN_DENTAL_KEY;
const OPEN_DENTAL_DEVELOPER_KEY = process.env.OPEN_DENTAL_DEVELOPER_KEY;
const BATCH_SIZE = 100;

interface OdPatient {
  PatNum:         number;
  LName:          string;
  FName:          string;
  Preferred?:     string;
  HmPhone?:       string;
  WkPhone?:       string;
  WirelessPhone?: string;
  Email?:         string;
  PatStatus?:     string | number;
}

function buildAuthHeader(customerKey?: string | null): string | null {
  const ck = (customerKey ?? DEFAULT_CUSTOMER_KEY ?? "").trim();
  if (!ck) return null;
  const dk = OPEN_DENTAL_DEVELOPER_KEY?.trim();
  return dk ? `ODFHIR ${dk}/${ck}` : `ODFHIR ${ck}`;
}

function getBestPhone(p: OdPatient): string {
  return (p.WirelessPhone || p.HmPhone || p.WkPhone || "").trim();
}

function buildReferralCode(firstName: string, patNum: string | number): string {
  const first4 = firstName.toUpperCase().replace(/[^A-Z]/g, "").padEnd(4, "X").slice(0, 4);
  const last4  = String(patNum).replace(/\D/g, "").padStart(4, "0").slice(-4);
  return `${first4}-${last4}`;
}

async function resolveCustomerKey(officeId: string | null): Promise<string | null> {
  if (!officeId) return DEFAULT_CUSTOMER_KEY ?? null;
  const [office] = await db
    .select({ customer_key: officesTable.customer_key })
    .from(officesTable)
    .where(eq(officesTable.id, officeId));
  return office?.customer_key ?? DEFAULT_CUSTOMER_KEY ?? null;
}

// ── Background import runner (fire-and-forget, no HTTP timeout risk) ───────
async function runImportJob(job: ImportJob, authHeader: string): Promise<void> {
  let odOffset = 0;
  let page     = 1;

  try {
    while (true) {
      const url = new URL("/api/v1/patients", OPEN_DENTAL_URL!);
      url.searchParams.set("Limit",  String(BATCH_SIZE));
      url.searchParams.set("Offset", String(odOffset));

      logger.info({ job_id: job.id, page, odOffset, office_id: job.office_id },
        "import-job: fetching patient page");

      const response = await fetch(url.toString(), {
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20_000),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        throw new Error(`Open Dental returned ${response.status} on page ${page}: ${errBody}`);
      }

      const raw  = await response.json() as OdPatient | OdPatient[];
      const batch = Array.isArray(raw) ? raw : [raw];

      const active = batch.filter(p => p.PatStatus === 0 || p.PatStatus === "Patient");
      const normalized = active
        .filter(p => p.PatNum && (p.FName || p.LName))
        .map(p => ({
          patNum:    String(p.PatNum),
          name:      [p.FName, p.LName].filter(Boolean).join(" ").trim(),
          firstName: p.Preferred?.trim() || p.FName?.trim() || "",
          phone:     getBestPhone(p),
          email:     p.Email?.trim() || null,
        }));

      if (normalized.length > 0) {
        const patNums = normalized.map(p => p.patNum);

        const existingRows = await db
          .select({ patient_id: referrersTable.patient_id })
          .from(referrersTable)
          .where(inArray(referrersTable.patient_id, patNums));

        const existingSet = new Set(existingRows.map(r => r.patient_id));
        const toInsert    = normalized.filter(p => !existingSet.has(p.patNum));
        job.skipped      += normalized.length - toInsert.length;

        if (toInsert.length > 0) {
          const codes = toInsert.map(p =>
            buildReferralCode(p.firstName || p.name.split(" ")[0] || "ANON", p.patNum)
          );

          const conflictRows = await db
            .select({ referral_code: referrersTable.referral_code })
            .from(referrersTable)
            .where(inArray(referrersTable.referral_code, codes));

          const conflictSet = new Set(conflictRows.map(r => r.referral_code));

          const rows = toInsert.map((p, i) => {
            const code      = codes[i];
            const finalCode = conflictSet.has(code)
              ? `${code.slice(0, 4)}-${Math.floor(Math.random() * 9000 + 1000)}`
              : code;
            return {
              patient_id:    p.patNum,
              name:          p.name,
              phone:         p.phone || "od-import",
              email:         p.email || null,
              referral_code: finalCode,
              office_id:     job.office_id,
            };
          });

          await db.insert(referrersTable).values(rows).onConflictDoNothing();
          job.imported += toInsert.length;
        }
      }

      job.total_od     += batch.length;
      job.pages_fetched = page;

      logger.info(
        { job_id: job.id, page, batch: batch.length, active: active.length, imported: job.imported, skipped: job.skipped },
        "import-job: page complete",
      );

      if (batch.length < BATCH_SIZE) break;

      odOffset += BATCH_SIZE;
      page++;
    }

    job.status      = "done";
    job.finished_at = new Date().toISOString();

    logger.info(
      { job_id: job.id, imported: job.imported, skipped: job.skipped, total_od: job.total_od, pages: job.pages_fetched },
      "import-job: done",
    );
  } catch (err) {
    job.status      = "error";
    job.error       = err instanceof Error ? err.message : String(err);
    job.finished_at = new Date().toISOString();
    logger.error({ job_id: job.id, err }, "import-job: failed");
  }

  scheduleCleanup(job.id);
}

// ── POST /api/import/patients ─────────────────────────────────────────────
// Starts a background import job. Returns { job_id } immediately (202).
// Poll GET /api/import/status/:job_id for progress.
router.post("/patients", async (req, res) => {
  if (!OPEN_DENTAL_URL) {
    res.status(503).json({ error: "Open Dental API not configured (OPEN_DENTAL_URL missing)" });
    return;
  }

  const body     = req.body as { office_id?: string | null };
  const officeId = typeof body.office_id === "string" ? body.office_id : null;

  if (officeId) {
    const [office] = await db
      .select({ id: officesTable.id })
      .from(officesTable)
      .where(eq(officesTable.id, officeId));
    if (!office) {
      res.status(404).json({ error: `Office '${officeId}' not found` });
      return;
    }
  }

  const customerKey = await resolveCustomerKey(officeId);
  const authHeader  = buildAuthHeader(customerKey);
  if (!authHeader) {
    res.status(503).json({ error: "No customer key configured for this office" });
    return;
  }

  const job: ImportJob = {
    id:            crypto.randomUUID(),
    office_id:     officeId,
    status:        "running",
    imported:      0,
    skipped:       0,
    total_od:      0,
    pages_fetched: 0,
    error:         null,
    started_at:    new Date().toISOString(),
    finished_at:   null,
  };

  jobs.set(job.id, job);

  // Fire and forget — runs in background without blocking the HTTP response
  runImportJob(job, authHeader).catch(err => {
    logger.error({ err, job_id: job.id }, "import-job: unhandled runner error");
    if (job.status === "running") {
      job.status      = "error";
      job.error       = err instanceof Error ? err.message : String(err);
      job.finished_at = new Date().toISOString();
      scheduleCleanup(job.id);
    }
  });

  logger.info({ job_id: job.id, office_id: officeId }, "import-job: started");

  res.status(202).json({ job_id: job.id });
});

// ── GET /api/import/status/:job_id ────────────────────────────────────────
router.get("/status/:job_id", (req, res) => {
  const job = jobs.get(req.params.job_id);
  if (!job) {
    res.status(404).json({ error: "Job not found or expired (jobs are kept for 30 minutes after completion)" });
    return;
  }
  res.json(job);
});

export default router;
