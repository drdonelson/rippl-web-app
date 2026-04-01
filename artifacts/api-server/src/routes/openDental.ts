import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { referrersTable, officesTable } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const OPEN_DENTAL_URL        = process.env.OPEN_DENTAL_URL;
const DEFAULT_CUSTOMER_KEY   = process.env.OPEN_DENTAL_CUSTOMER_KEY || process.env.OPEN_DENTAL_KEY;
const OPEN_DENTAL_DEVELOPER_KEY = process.env.OPEN_DENTAL_DEVELOPER_KEY;

interface OdPatient {
  PatNum:          number;
  LName:           string;
  FName:           string;
  Preferred?:      string;
  HmPhone?:        string;
  WkPhone?:        string;
  WirelessPhone?:  string;
  Email?:          string;
  PatStatus?:      string | number;
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

// Resolve an optional office_id query param → returns { officeId, customerKey, officeName }
async function resolveOffice(officeId?: string): Promise<{
  officeId: string | null;
  customerKey: string | null;
  officeName: string | null;
}> {
  if (!officeId) {
    return { officeId: null, customerKey: DEFAULT_CUSTOMER_KEY ?? null, officeName: null };
  }
  const [office] = await db
    .select()
    .from(officesTable)
    .where(eq(officesTable.id, officeId));
  if (!office) {
    return { officeId: null, customerKey: DEFAULT_CUSTOMER_KEY ?? null, officeName: null };
  }
  return {
    officeId:   office.id,
    customerKey: office.customer_key,
    officeName: office.name,
  };
}

// ── GET /api/opendental/test ───────────────────────────────────────────────
router.get("/test", async (_req, res) => {
  if (!OPEN_DENTAL_URL || !DEFAULT_CUSTOMER_KEY) {
    res.status(503).json({ error: "Open Dental API is not configured (OPEN_DENTAL_URL / OPEN_DENTAL_KEY missing)" });
    return;
  }

  const authHeader = buildAuthHeader();
  if (!authHeader) {
    res.status(503).json({ error: "Open Dental auth header could not be built" });
    return;
  }

  try {
    const url = new URL("/api/v1/patients", OPEN_DENTAL_URL);
    url.searchParams.set("Limit", "5");

    const response = await fetch(url.toString(), {
      headers: { "Authorization": authHeader, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15_000),
    });

    const body = await response.text();
    let parsed: unknown;
    try { parsed = JSON.parse(body); } catch { parsed = body; }

    if (!response.ok) {
      res.status(response.status).json({ error: `Open Dental returned ${response.status}`, body: parsed });
      return;
    }

    const patients = Array.isArray(parsed) ? parsed.slice(0, 5) : parsed;
    res.json({ status: response.status, patients });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: `Request failed: ${message}` });
  }
});

// ── GET /api/opendental/test/procedurelogs ─────────────────────────────────
router.get("/test/procedurelogs", async (req, res) => {
  if (!OPEN_DENTAL_URL || !DEFAULT_CUSTOMER_KEY) {
    res.status(503).json({ error: "Open Dental API is not configured" });
    return;
  }

  const authHeader = buildAuthHeader();
  if (!authHeader) { res.status(503).json({ error: "Auth header could not be built" }); return; }

  try {
    const url = new URL("/api/v1/procedurelogs", OPEN_DENTAL_URL);
    for (const [key, val] of Object.entries(req.query)) {
      if (typeof val === "string") url.searchParams.set(key, val);
    }
    if (!url.searchParams.has("Limit")) url.searchParams.set("Limit", "3");

    logger.info({ url: url.toString() }, "Probing procedurelogs endpoint");

    const response = await fetch(url.toString(), {
      headers: { "Authorization": authHeader, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(20_000),
    });

    const rawText = await response.text();
    let parsed: unknown;
    try { parsed = JSON.parse(rawText); } catch { parsed = rawText; }

    res.status(response.status).json({
      od_status: response.status, od_status_text: response.statusText,
      url: url.toString(), raw: parsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: `Request failed: ${message}` });
  }
});

// ── GET /api/opendental/test/procedures ───────────────────────────────────
router.get("/test/procedures", async (_req, res) => {
  if (!OPEN_DENTAL_URL || !DEFAULT_CUSTOMER_KEY) {
    res.status(503).json({ error: "Open Dental API is not configured" });
    return;
  }

  const authHeader = buildAuthHeader();
  if (!authHeader) { res.status(503).json({ error: "Auth header could not be built" }); return; }

  try {
    const url = new URL("/api/v1/procedures", OPEN_DENTAL_URL);
    url.searchParams.set("ProcStatus", "2");
    url.searchParams.set("Limit", "5");

    logger.info({ url: url.toString() }, "Fetching completed procedures from Open Dental");

    const response = await fetch(url.toString(), {
      headers: { "Authorization": authHeader, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(20_000),
    });

    const rawText = await response.text();
    let parsed: unknown;
    try { parsed = JSON.parse(rawText); } catch { parsed = rawText; }

    res.status(response.status).json({
      od_status: response.status, od_status_text: response.statusText,
      url: url.toString(), raw: parsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: `Request failed: ${message}` });
  }
});

// ── GET /api/opendental/test/refattaches ──────────────────────────────────
router.get("/test/refattaches", async (req, res) => {
  if (!OPEN_DENTAL_URL || !DEFAULT_CUSTOMER_KEY) {
    res.status(503).json({ error: "Open Dental API is not configured" });
    return;
  }

  const authHeader = buildAuthHeader();
  if (!authHeader) { res.status(503).json({ error: "Auth header could not be built" }); return; }

  const patNum = typeof req.query.PatNum === "string" ? req.query.PatNum : "8280";

  try {
    const url = new URL("/api/v1/refattaches", OPEN_DENTAL_URL);
    url.searchParams.set("PatNum", patNum);

    logger.info({ url: url.toString(), patNum }, "Probing refattaches endpoint");

    const response = await fetch(url.toString(), {
      headers: { "Authorization": authHeader, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15_000),
    });

    const rawText = await response.text();
    let parsed: unknown;
    try { parsed = JSON.parse(rawText); } catch { parsed = rawText; }

    const refattaches = Array.isArray(parsed) ? parsed : [];

    let referralRecord: unknown = null;
    let referralFetchError: string | null = null;
    const firstAttach = refattaches[0] as Record<string, unknown> | undefined;
    const referralNum = firstAttach?.ReferralNum;

    if (typeof referralNum === "number" && referralNum > 0) {
      try {
        const refUrl = new URL(`/api/v1/referrals/${referralNum}`, OPEN_DENTAL_URL);
        const refResponse = await fetch(refUrl.toString(), {
          headers: { "Authorization": authHeader, "Content-Type": "application/json" },
          signal: AbortSignal.timeout(15_000),
        });
        const refText = await refResponse.text();
        try { referralRecord = JSON.parse(refText); } catch { referralRecord = refText; }
      } catch (refErr) {
        referralFetchError = refErr instanceof Error ? refErr.message : String(refErr);
      }
    }

    res.status(response.status).json({
      od_status: response.status, od_status_text: response.statusText,
      url: url.toString(), patNum, refattaches,
      referring_referral_num: referralNum ?? null,
      referral_record: referralRecord,
      referral_fetch_error: referralFetchError,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: `Request failed: ${message}` });
  }
});

// ── GET /api/opendental/patients/active?office_id= ─────────────────────────
// Fetches all active patients from Open Dental for a specific office (or default).
// Pass office_id to use that office's customer key; omit for the default key.
router.get("/patients/active", async (req, res) => {
  if (!OPEN_DENTAL_URL) {
    res.status(503).json({ error: "Open Dental API is not configured (OPEN_DENTAL_URL missing)" });
    return;
  }

  const officeIdParam = typeof req.query.office_id === "string" ? req.query.office_id : undefined;
  const { officeId, customerKey, officeName } = await resolveOffice(officeIdParam);

  const authHeader = buildAuthHeader(customerKey);
  if (!authHeader) {
    res.status(503).json({ error: "Open Dental auth header could not be built — customer key missing" });
    return;
  }

  const BATCH_SIZE = 100;
  const all: OdPatient[] = [];
  const pages: Array<{ page: number; offset: number; fetched: number; running_total: number }> = [];
  let offset = 0;
  let page   = 1;

  try {
    while (true) {
      const url = new URL("/api/v1/patients", OPEN_DENTAL_URL);
      url.searchParams.set("Limit",  String(BATCH_SIZE));
      url.searchParams.set("Offset", String(offset));

      logger.info({ page, offset, officeId, url: url.toString() }, "Fetching patient page from Open Dental");

      const response = await fetch(url.toString(), {
        headers: { "Authorization": authHeader, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20_000),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        res.status(502).json({
          error: `Open Dental returned ${response.status} on page ${page}: ${body}`,
          pages_fetched: pages,
        });
        return;
      }

      const raw = await response.json() as OdPatient | OdPatient[];
      const batch = Array.isArray(raw) ? raw : [raw];
      all.push(...batch);

      const pageInfo = { page, offset, fetched: batch.length, running_total: all.length };
      pages.push(pageInfo);
      logger.info(pageInfo, "Patient page received");

      if (batch.length < BATCH_SIZE) break;

      offset += BATCH_SIZE;
      page++;
    }

    const active = all.filter(p => p.PatStatus === 0 || p.PatStatus === "Patient");

    logger.info(
      { pages_fetched: pages.length, od_total: all.length, active: active.length, officeId, officeName },
      "Pagination complete — filtered to active patients"
    );

    const normalized = active
      .filter(p => p.PatNum && (p.FName || p.LName))
      .map(p => ({
        patNum:    String(p.PatNum),
        name:      [p.FName, p.LName].filter(Boolean).join(" ").trim(),
        firstName: p.Preferred?.trim() || p.FName?.trim() || "",
        lastName:  p.LName?.trim() || "",
        phone:     getBestPhone(p),
        email:     p.Email?.trim() || null,
      }));

    res.json({
      patients:      normalized,
      total:         normalized.length,
      od_total:      all.length,
      pages_fetched: pages.length,
      pages,
      office_id:   officeId,
      office_name: officeName,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, officeId }, "Failed to fetch OD patients");
    res.status(502).json({ error: `Open Dental request failed: ${message}` });
  }
});

// ── POST /api/opendental/patients/import ───────────────────────────────────
// Accepts the patient list from GET /patients/active and bulk-inserts referrers.
// Pass office_id in the body to tag inserted referrers to that office.
router.post("/patients/import", async (req, res) => {
  const body = req.body as {
    patients: Array<{
      patNum: string;
      name: string;
      firstName: string;
      phone: string;
      email?: string | null;
    }>;
    office_id?: string | null;
  };

  // Support both old format (bare array) and new format ({ patients, office_id })
  const incoming = Array.isArray(req.body) ? req.body : (body.patients ?? []);
  const officeId = Array.isArray(req.body) ? null : (body.office_id ?? null);

  if (!Array.isArray(incoming) || incoming.length === 0) {
    res.status(400).json({ error: "Body must include a non-empty patients array" });
    return;
  }

  // Validate office_id if provided
  let resolvedOfficeId: string | null = null;
  if (officeId) {
    const [office] = await db
      .select({ id: officesTable.id })
      .from(officesTable)
      .where(eq(officesTable.id, officeId));
    resolvedOfficeId = office?.id ?? null;
  }

  let imported = 0;
  let skipped  = 0;
  const errors: string[] = [];

  for (const p of incoming) {
    try {
      if (!p.patNum || !p.name) { skipped++; continue; }

      const [existing] = await db
        .select({ id: referrersTable.id })
        .from(referrersTable)
        .where(eq(referrersTable.patient_id, p.patNum));

      if (existing) { skipped++; continue; }

      const referralCode = buildReferralCode(p.firstName || p.name.split(" ")[0] || "ANON", p.patNum);

      const [codeConflict] = await db
        .select({ id: referrersTable.id })
        .from(referrersTable)
        .where(eq(referrersTable.referral_code, referralCode));

      const finalCode = codeConflict
        ? `${referralCode.slice(0, 4)}-${Math.floor(Math.random() * 9000 + 1000)}`
        : referralCode;

      await db.insert(referrersTable).values({
        patient_id:    p.patNum,
        name:          p.name,
        phone:         p.phone || "od-import",
        email:         p.email || null,
        referral_code: finalCode,
        office_id:     resolvedOfficeId,
      });

      imported++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${p.patNum} (${p.name}): ${msg}`);
    }
  }

  logger.info({ imported, skipped, errors: errors.length, officeId: resolvedOfficeId }, "OD patient import complete");

  res.json({
    imported,
    skipped,
    total: incoming.length,
    errors: errors.slice(0, 20),
  });
});

// ── POST /api/opendental/patients/bulk-import ──────────────────────────────
// Single-call endpoint: fetches patients from OD AND imports them in one pass.
// This avoids the two-step fetch→browser→import flow that times out on Render.
// Body: { office_id?: string }
// Response: { imported, skipped, total, od_total, pages_fetched, has_more }
router.post("/patients/bulk-import", async (req, res) => {
  if (!OPEN_DENTAL_URL) {
    res.status(503).json({ error: "Open Dental API is not configured (OPEN_DENTAL_URL missing)" });
    return;
  }

  const body = req.body as { office_id?: string | null };
  const officeIdParam = typeof body.office_id === "string" ? body.office_id : null;

  const { officeId, customerKey, officeName } = await resolveOffice(officeIdParam ?? undefined);

  const authHeader = buildAuthHeader(customerKey);
  if (!authHeader) {
    res.status(503).json({ error: "Open Dental auth header could not be built — customer key missing for this office" });
    return;
  }

  // Resolve office_id for DB inserts
  let resolvedOfficeId: string | null = null;
  if (officeIdParam) {
    const [office] = await db
      .select({ id: officesTable.id })
      .from(officesTable)
      .where(eq(officesTable.id, officeIdParam));
    resolvedOfficeId = office?.id ?? null;
  }

  // ── Step 1: Fetch patients from Open Dental (paginated, bounded) ───────
  // MAX_PAGES × BATCH_SIZE = max patients fetched per import run.
  // Kept at 20 pages (2 000 patients) so server responds well within 30 s.
  const MAX_PAGES  = 20;
  const BATCH_SIZE = 100;

  const all: OdPatient[] = [];
  let odOffset = 0;
  let page     = 1;
  let hasMore  = false;

  try {
    while (page <= MAX_PAGES) {
      const url = new URL("/api/v1/patients", OPEN_DENTAL_URL);
      url.searchParams.set("Limit",  String(BATCH_SIZE));
      url.searchParams.set("Offset", String(odOffset));

      logger.info({ page, odOffset, officeId: resolvedOfficeId, url: url.toString() },
        "bulk-import: fetching patient page from Open Dental");

      const response = await fetch(url.toString(), {
        headers: { "Authorization": authHeader, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        res.status(502).json({
          error: `Open Dental returned ${response.status} on page ${page}: ${errBody}`,
        });
        return;
      }

      const raw = await response.json() as OdPatient | OdPatient[];
      const batch = Array.isArray(raw) ? raw : [raw];
      all.push(...batch);

      logger.info({ page, fetched: batch.length, running_total: all.length },
        "bulk-import: patient page received");

      if (batch.length < BATCH_SIZE) break;           // last page
      if (page >= MAX_PAGES) { hasMore = true; break; } // limit reached

      odOffset += BATCH_SIZE;
      page++;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, officeId: resolvedOfficeId }, "bulk-import: failed to fetch OD patients");
    res.status(502).json({ error: `Open Dental request failed: ${message}` });
    return;
  }

  // ── Step 2: Filter to active patients ─────────────────────────────────
  const active = all.filter(p => p.PatStatus === 0 || p.PatStatus === "Patient");
  const normalized = active
    .filter(p => p.PatNum && (p.FName || p.LName))
    .map(p => ({
      patNum:    String(p.PatNum),
      name:      [p.FName, p.LName].filter(Boolean).join(" ").trim(),
      firstName: p.Preferred?.trim() || p.FName?.trim() || "",
      phone:     getBestPhone(p),
      email:     p.Email?.trim() || null,
    }));

  logger.info(
    { od_total: all.length, active: active.length, to_process: normalized.length, officeId: resolvedOfficeId },
    "bulk-import: filtered to active patients",
  );

  if (normalized.length === 0) {
    res.json({ imported: 0, skipped: 0, total: 0, od_total: all.length, pages_fetched: page, has_more: hasMore, office_name: officeName, errors: [] });
    return;
  }

  // ── Step 3: Bulk import — batch DB queries for speed ──────────────────
  const patNums = normalized.map(p => p.patNum);

  // 1 query to find existing patient_ids
  const existingRows = await db
    .select({ patient_id: referrersTable.patient_id })
    .from(referrersTable)
    .where(inArray(referrersTable.patient_id, patNums));

  const existingSet = new Set(existingRows.map(r => r.patient_id));
  const toInsert = normalized.filter(p => !existingSet.has(p.patNum));
  const skippedCount = normalized.length - toInsert.length;

  if (toInsert.length === 0) {
    res.json({
      imported: 0, skipped: skippedCount, total: normalized.length,
      od_total: all.length, pages_fetched: page, has_more: hasMore,
      office_name: officeName, errors: [],
    });
    return;
  }

  // Generate referral codes
  const codes = toInsert.map(p =>
    buildReferralCode(p.firstName || p.name.split(" ")[0] || "ANON", p.patNum)
  );

  // 1 query to find code conflicts
  const conflictRows = await db
    .select({ referral_code: referrersTable.referral_code })
    .from(referrersTable)
    .where(inArray(referrersTable.referral_code, codes));

  const conflictSet = new Set(conflictRows.map(r => r.referral_code));

  const rowsToInsert = toInsert.map((p, i) => {
    const code = codes[i];
    const finalCode = conflictSet.has(code)
      ? `${code.slice(0, 4)}-${Math.floor(Math.random() * 9000 + 1000)}`
      : code;
    return {
      patient_id:    p.patNum,
      name:          p.name,
      phone:         p.phone || "od-import",
      email:         p.email || null,
      referral_code: finalCode,
      office_id:     resolvedOfficeId,
    };
  });

  // Insert in chunks of 100 to avoid query size limits
  const CHUNK = 100;
  let imported = 0;
  const errors: string[] = [];

  for (let i = 0; i < rowsToInsert.length; i += CHUNK) {
    const chunk = rowsToInsert.slice(i, i + CHUNK);
    try {
      await db.insert(referrersTable).values(chunk).onConflictDoNothing();
      imported += chunk.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Chunk ${Math.floor(i / CHUNK) + 1}: ${msg}`);
    }
  }

  logger.info(
    { imported, skipped: skippedCount, total: normalized.length, od_total: all.length, officeId: resolvedOfficeId },
    "bulk-import: complete",
  );

  res.json({
    imported,
    skipped: skippedCount,
    total:   normalized.length,
    od_total: all.length,
    pages_fetched: page,
    has_more: hasMore,
    office_name: officeName,
    errors: errors.slice(0, 20),
  });
});

export default router;
