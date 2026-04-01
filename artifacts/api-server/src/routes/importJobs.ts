import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { referrersTable, officesTable } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const OPEN_DENTAL_URL           = process.env.OPEN_DENTAL_URL;
const DEFAULT_CUSTOMER_KEY      = process.env.OPEN_DENTAL_CUSTOMER_KEY || process.env.OPEN_DENTAL_KEY;
const OPEN_DENTAL_DEVELOPER_KEY = process.env.OPEN_DENTAL_DEVELOPER_KEY;
const OD_PAGE_SIZE = 100;

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

// ── POST /api/import/patients/chunk ──────────────────────────────────────────
// Synchronous chunked import — fetches one bounded slice of patients from
// Open Dental, upserts active patients, and returns progress so the client can
// call again with next_offset until done === true.
//
// Body:  { office_id?: string | null, offset?: number, limit?: number }
//   offset  – OD row offset to start from (default 0)
//   limit   – patients to fetch this call (default 500, max 500 = 5 OD pages)
//
// Response: { imported, skipped, next_offset, total_fetched, done }
//   done === true when OD returned fewer rows than requested (no more pages)
//
// Each call fetches at most 5 pages × 100 = 500 patients from OD and should
// complete well under Render's 30 s request timeout.
router.post("/patients/chunk", async (req, res) => {
  if (!OPEN_DENTAL_URL) {
    res.status(503).json({ error: "Open Dental API not configured (OPEN_DENTAL_URL missing)" });
    return;
  }

  const body        = req.body as { office_id?: string | null; offset?: number; limit?: number };
  const officeId    = typeof body.office_id === "string" ? body.office_id : null;
  const startOffset = Math.max(0, Number(body.offset ?? 0));
  const limit       = Math.min(500, Math.max(1, Number(body.limit ?? 500)));
  const pagesToFetch = Math.ceil(limit / OD_PAGE_SIZE);

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

  // ── Fetch up to pagesToFetch pages from Open Dental ───────────────────
  const allPatients: OdPatient[] = [];
  let odOffset = startOffset;
  let done     = false;

  try {
    for (let page = 0; page < pagesToFetch; page++) {
      const url = new URL("/api/v1/patients", OPEN_DENTAL_URL!);
      url.searchParams.set("Limit",  String(OD_PAGE_SIZE));
      url.searchParams.set("Offset", String(odOffset));

      logger.info({ page: page + 1, odOffset, officeId }, "import-chunk: fetching OD page");

      const response = await fetch(url.toString(), {
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        res.status(502).json({
          error: `Open Dental returned ${response.status} at offset ${odOffset}: ${errBody}`,
        });
        return;
      }

      const raw   = await response.json() as OdPatient | OdPatient[];
      const batch = Array.isArray(raw) ? raw : [raw];
      allPatients.push(...batch);

      logger.info({ page: page + 1, fetched: batch.length, running_total: allPatients.length },
        "import-chunk: page done");

      if (batch.length < OD_PAGE_SIZE) {
        done = true; // OD has no more rows — this was the last page
        break;
      }

      odOffset += OD_PAGE_SIZE;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: `Open Dental request failed: ${message}` });
    return;
  }

  const totalFetched = allPatients.length;
  const nextOffset   = startOffset + totalFetched;

  // ── Filter to active patients only ────────────────────────────────────
  const active     = allPatients.filter(p => p.PatStatus === 0 || p.PatStatus === "Patient");
  const normalized = active
    .filter(p => p.PatNum && (p.FName || p.LName))
    .map(p => ({
      patNum:    String(p.PatNum),
      name:      [p.FName, p.LName].filter(Boolean).join(" ").trim(),
      firstName: p.Preferred?.trim() || p.FName?.trim() || "",
      phone:     getBestPhone(p),
      email:     p.Email?.trim() || null,
    }));

  if (normalized.length === 0) {
    res.json({ imported: 0, skipped: 0, next_offset: nextOffset, total_fetched: totalFetched, done });
    return;
  }

  // ── Upsert into referrers table ───────────────────────────────────────
  const patNums      = normalized.map(p => p.patNum);
  const existingRows = await db
    .select({ patient_id: referrersTable.patient_id })
    .from(referrersTable)
    .where(inArray(referrersTable.patient_id, patNums));

  const existingSet = new Set(existingRows.map(r => r.patient_id));
  const toInsert    = normalized.filter(p => !existingSet.has(p.patNum));
  const skipped     = normalized.length - toInsert.length;

  let imported = 0;

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
        office_id:     officeId,
      };
    });

    await db.insert(referrersTable).values(rows).onConflictDoNothing();
    imported = toInsert.length;
  }

  logger.info(
    { imported, skipped, total_fetched: totalFetched, next_offset: nextOffset, done, officeId },
    "import-chunk: complete",
  );

  res.json({ imported, skipped, next_offset: nextOffset, total_fetched: totalFetched, done });
});

export default router;
