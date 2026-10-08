import { requireOdOffice } from "../middleware/odOffice";
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { referrersTable, officesTable } from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const OPEN_DENTAL_URL           = process.env.OPEN_DENTAL_URL;
const DEFAULT_CUSTOMER_KEY      = process.env.OPEN_DENTAL_CUSTOMER_KEY || process.env.OPEN_DENTAL_KEY;
const OPEN_DENTAL_DEVELOPER_KEY = process.env.OPEN_DENTAL_DEVELOPER_KEY;

const OD_PAGE_SIZE    = 100;   // Max rows per OD API page
const CHUNK_LIMIT_MAX = 100;   // Max patients per chunk call (1 OD page — guaranteed fast)
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
// Synchronous chunked import. Fetches 1 page of 100 patients from Open Dental
// starting at `offset`, immediately upserts active patients, and returns
// progress so the client can call again with next_offset.
//
// Body:  { office_id?: string | null, offset?: number, limit?: number }
//   offset  – OD row offset (default 0)
//   limit   – patients to fetch (default 100, capped at 100 = 1 OD page)
//
// Response: { imported, skipped, next_offset, total_fetched, done }
//   done === true when OD returned fewer rows than limit (no more pages)
//
// All errors are caught and returned as JSON — this handler never crashes.
router.post("/patients/chunk", requireOdOffice, async (req, res) => {
  // ── Top-level guard: catch any unexpected throw ───────────────────────
  try {
    const body         = req.body as { office_id?: string | null; offset?: number; limit?: number };
    const officeId     = typeof body.office_id === "string" ? body.office_id.trim() : "";
    const startOffset  = Math.max(0, Number(body.offset  ?? 0));
    const limit        = Math.min(CHUNK_LIMIT_MAX, Math.max(1, Number(body.limit ?? CHUNK_LIMIT_MAX)));
    const pagesToFetch = Math.ceil(limit / OD_PAGE_SIZE); // 2 pages for default limit=200

    // ── Validate office (required) ──────────────────────────────────────
    // office_id used to be optional: omitting it imported patients using the default
    // customer key and stored them with office_id = NULL. A PatNum identifies a person
    // only within one office's Open Dental database, so rows with no office cannot be
    // matched safely afterwards. Demand the office up front.
    if (!officeId) {
      res.status(400).json({ error: "office_id is required" });
      return;
    }
    const configured = res.locals.odOffice;
    const officePracticeId: string = configured.practice_id;
    const odUrl = configured.od_url || OPEN_DENTAL_URL;
    const authHeader = configured.customer_key ? buildAuthHeader(configured.customer_key) : null;
    if (!odUrl || !authHeader) { res.status(503).json({ error: "Office Open Dental connection is incomplete" }); return; }

    // ── Fetch pagesToFetch pages from Open Dental ───────────────────────
    const allPatients: OdPatient[] = [];
    let odOffset = startOffset;
    let done     = false;

    try {
      for (let page = 0; page < pagesToFetch; page++) {
        const url = new URL("/api/v1/patients", odUrl);
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
      // Scoped to this office: a PatNum is unique only inside one office's Open Dental
      // database, so an unscoped IN would treat another office's patients as already
      // imported and skip real ones. (The referral_code check below stays global on
      // purpose — codes appear in /refer?ref=XXXX links and must be unique platform-wide.)
      const existingRows = await db
        .select({ patient_id: referrersTable.patient_id })
        .from(referrersTable)
        .where(
          and(
            inArray(referrersTable.patient_id, patNums),
            eq(referrersTable.office_id, officeId)
          )
        );

      const existingSet = new Set(existingRows.map(r => r.patient_id));
      const toInsert    = normalized.filter(p => !existingSet.has(p.patNum));
      let skipped = normalized.length - toInsert.length;

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
            practice_id:   officePracticeId,
          };
        });

        const inserted = await db.insert(referrersTable).values(rows).onConflictDoNothing().returning({ id: referrersTable.id });
        imported = inserted.length;
        skipped += toInsert.length - inserted.length;
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
