import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { referrersTable, officesTable } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const OPEN_DENTAL_URL           = process.env.OPEN_DENTAL_URL;
const DEFAULT_CUSTOMER_KEY      = process.env.OPEN_DENTAL_CUSTOMER_KEY || process.env.OPEN_DENTAL_KEY;
const OPEN_DENTAL_DEVELOPER_KEY = process.env.OPEN_DENTAL_DEVELOPER_KEY;

const OD_PAGE_SIZE    = 100;   // Max rows per OD API page
const CHUNK_LIMIT_MAX = 200;   // Max patients per chunk call (2 OD pages)
const OD_FETCH_MS     = 25_000; // Timeout per individual OD page fetch

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
// Synchronous chunked import. Fetches 2 pages of 100 patients (200 total max)
// from Open Dental starting at `offset`, immediately upserts active patients,
// and returns progress so the client can call again with next_offset.
//
// Body:  { office_id?: string | null, offset?: number, limit?: number }
//   offset  – OD row offset (default 0)
//   limit   – patients to fetch (default 200, capped at 200 = 2 OD pages)
//
// Response: { imported, skipped, next_offset, total_fetched, done }
//   done === true when OD returned fewer rows than limit (no more pages)
//
// All errors are caught and returned as JSON — this handler never crashes.
router.post("/patients/chunk", async (req, res) => {
  // ── Top-level guard: catch any unexpected throw ───────────────────────
  try {
    if (!OPEN_DENTAL_URL) {
      res.status(503).json({ error: "Open Dental API not configured (OPEN_DENTAL_URL missing)" });
      return;
    }

    const body         = req.body as { office_id?: string | null; offset?: number; limit?: number };
    const officeId     = typeof body.office_id === "string" ? body.office_id : null;
    const startOffset  = Math.max(0, Number(body.offset  ?? 0));
    const limit        = Math.min(CHUNK_LIMIT_MAX, Math.max(1, Number(body.limit ?? CHUNK_LIMIT_MAX)));
    const pagesToFetch = Math.ceil(limit / OD_PAGE_SIZE); // 2 pages for default limit=200

    // ── Validate office ─────────────────────────────────────────────────
    if (officeId) {
      try {
        const [office] = await db
          .select({ id: officesTable.id })
          .from(officesTable)
          .where(eq(officesTable.id, officeId));
        if (!office) {
          res.status(404).json({ error: `Office '${officeId}' not found` });
          return;
        }
      } catch (dbErr) {
        const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
        logger.error({ dbErr, officeId }, "import-chunk: DB error validating office");
        res.status(500).json({ error: `Database error validating office: ${msg}` });
        return;
      }
    }

    // ── Resolve auth header ─────────────────────────────────────────────
    let authHeader: string | null;
    try {
      const customerKey = await resolveCustomerKey(officeId);
      authHeader = buildAuthHeader(customerKey);
    } catch (dbErr) {
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      logger.error({ dbErr }, "import-chunk: DB error resolving customer key");
      res.status(500).json({ error: `Database error resolving credentials: ${msg}` });
      return;
    }

    if (!authHeader) {
      res.status(503).json({ error: "No customer key configured for this office" });
      return;
    }

    // ── Fetch pagesToFetch pages from Open Dental ───────────────────────
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
          signal: AbortSignal.timeout(OD_FETCH_MS),
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

        logger.info(
          { page: page + 1, fetched: batch.length, running_total: allPatients.length },
          "import-chunk: page done",
        );

        if (batch.length < OD_PAGE_SIZE) {
          done = true; // OD exhausted — no more pages
          break;
        }

        odOffset += OD_PAGE_SIZE;
      }
    } catch (fetchErr) {
      const message = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      logger.error({ fetchErr, officeId }, "import-chunk: OD fetch failed");
      res.status(502).json({ error: `Open Dental request failed: ${message}` });
      return;
    }

    const totalFetched = allPatients.length;
    const nextOffset   = startOffset + totalFetched;

    // ── Filter to active patients ───────────────────────────────────────
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

    // ── Upsert into referrers table ─────────────────────────────────────
    try {
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
    } catch (dbErr) {
      const message = dbErr instanceof Error ? dbErr.message : String(dbErr);
      logger.error({ dbErr, officeId, total_fetched: totalFetched }, "import-chunk: DB upsert failed");
      res.status(500).json({ error: `Database upsert failed: ${message}` });
    }

  } catch (unexpected) {
    // Catch-all: should never reach here, but ensures the server never crashes
    const message = unexpected instanceof Error ? unexpected.message : String(unexpected);
    logger.error({ unexpected }, "import-chunk: unexpected error (top-level catch)");
    if (!res.headersSent) {
      res.status(500).json({ error: `Unexpected server error: ${message}` });
    }
  }
});

export default router;
