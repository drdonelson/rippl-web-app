import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { referrersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const OPEN_DENTAL_URL = process.env.OPEN_DENTAL_URL;
const OPEN_DENTAL_KEY = process.env.OPEN_DENTAL_CUSTOMER_KEY || process.env.OPEN_DENTAL_KEY;
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
  // OD REST API returns PatStatus as a string label, not a numeric code.
  // String values: "Patient" (active=0), "NonPatient" (1), "Inactive" (2),
  //                "Deceased" (3), "Archived" (4), "Prospect" (5)
  // Numeric code 0 may also appear in some API versions.
  PatStatus?:      string | number;
}

function buildAuthHeader(): string | null {
  const customerKey = OPEN_DENTAL_KEY?.trim();
  const developerKey = OPEN_DENTAL_DEVELOPER_KEY?.trim();
  if (!customerKey) return null;
  return developerKey ? `ODFHIR ${developerKey}/${customerKey}` : `ODFHIR ${customerKey}`;
}

function getBestPhone(p: OdPatient): string {
  return (p.WirelessPhone || p.HmPhone || p.WkPhone || "").trim();
}

function buildReferralCode(firstName: string, patNum: string | number): string {
  const first4 = firstName.toUpperCase().replace(/[^A-Z]/g, "").padEnd(4, "X").slice(0, 4);
  const last4  = String(patNum).replace(/\D/g, "").padStart(4, "0").slice(-4);
  return `${first4}-${last4}`;
}

// ── GET /api/opendental/test ───────────────────────────────────────────────
// Quick connectivity check: hits GET /api/v1/patients and returns first 5 results.
router.get("/test", async (_req, res) => {
  if (!OPEN_DENTAL_URL || !OPEN_DENTAL_KEY) {
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
      res.status(response.status).json({
        error: `Open Dental returned ${response.status}`,
        body: parsed,
      });
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
// Probes GET /api/v1/procedurelogs with no filters — reveals field names and accepted params.
router.get("/test/procedurelogs", async (req, res) => {
  if (!OPEN_DENTAL_URL || !OPEN_DENTAL_KEY) {
    res.status(503).json({ error: "Open Dental API is not configured" });
    return;
  }

  const authHeader = buildAuthHeader();
  if (!authHeader) {
    res.status(503).json({ error: "Auth header could not be built" });
    return;
  }

  try {
    // Pass through any query params from the caller so we can experiment
    const url = new URL("/api/v1/procedurelogs", OPEN_DENTAL_URL);
    for (const [key, val] of Object.entries(req.query)) {
      if (typeof val === "string") url.searchParams.set(key, val);
    }
    // Default: just limit to 3 results so the response is readable
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
      od_status: response.status,
      od_status_text: response.statusText,
      url: url.toString(),
      raw: parsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: `Request failed: ${message}` });
  }
});

// ── GET /api/opendental/test/procedures ───────────────────────────────────
// Hits GET /api/v1/procedures?ProcStatus=2 and returns the raw first 5 results.
router.get("/test/procedures", async (_req, res) => {
  if (!OPEN_DENTAL_URL || !OPEN_DENTAL_KEY) {
    res.status(503).json({ error: "Open Dental API is not configured" });
    return;
  }

  const authHeader = buildAuthHeader();
  if (!authHeader) {
    res.status(503).json({ error: "Auth header could not be built" });
    return;
  }

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
      od_status: response.status,
      od_status_text: response.statusText,
      url: url.toString(),
      raw: parsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: `Request failed: ${message}` });
  }
});

// ── GET /api/opendental/patients/active ────────────────────────────────────
// Fetches active patients from Open Dental (PatStatus=0) and returns them.
// Does NOT modify the database — call POST /import to actually enroll them.
router.get("/patients/active", async (req, res) => {
  if (!OPEN_DENTAL_URL || !OPEN_DENTAL_KEY) {
    res.status(503).json({ error: "Open Dental API is not configured (OPEN_DENTAL_URL / OPEN_DENTAL_KEY missing)" });
    return;
  }

  const authHeader = buildAuthHeader();
  if (!authHeader) {
    res.status(503).json({ error: "Open Dental auth header could not be built" });
    return;
  }

  try {
    // Fetch all patients — no PatStatus filter (OD rejects it as invalid).
    // We filter client-side below.
    const url = new URL("/api/v1/patients", OPEN_DENTAL_URL);

    logger.info({ url: url.toString() }, "Fetching all patients from Open Dental (will filter active client-side)");

    const response = await fetch(url.toString(), {
      headers: { "Authorization": authHeader, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      res.status(502).json({ error: `Open Dental returned ${response.status}: ${body}` });
      return;
    }

    const raw = await response.json() as OdPatient | OdPatient[];
    const all = Array.isArray(raw) ? raw : [raw];

    // Keep only active patients: PatStatus === 0 (numeric) or === "Patient" (string label).
    // OD REST API returns the string form ("Patient", "NonPatient", "Inactive", etc.)
    const active = all.filter(p =>
      p.PatStatus === 0 || p.PatStatus === "Patient"
    );

    logger.info({ total: all.length, active: active.length }, "Filtered to active patients (PatStatus=0/Patient)");

    // Normalise into a clean list
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

    res.json({ patients: normalized, total: normalized.length, od_total: all.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "Failed to fetch OD patients");
    res.status(502).json({ error: `Open Dental request failed: ${message}` });
  }
});

// ── POST /api/opendental/patients/import ───────────────────────────────────
// Accepts the patient list from GET /patients/active and bulk-inserts them
// into the referrers table, skipping any whose patient_id already exists.
router.post("/patients/import", async (req, res) => {
  const incoming = req.body as Array<{
    patNum: string;
    name: string;
    firstName: string;
    phone: string;
    email?: string | null;
  }>;

  if (!Array.isArray(incoming) || incoming.length === 0) {
    res.status(400).json({ error: "Body must be a non-empty array of patients" });
    return;
  }

  let imported = 0;
  let skipped  = 0;
  const errors: string[] = [];

  for (const p of incoming) {
    try {
      if (!p.patNum || !p.name) { skipped++; continue; }

      // Check for existing referrer with this patient_id
      const [existing] = await db
        .select({ id: referrersTable.id })
        .from(referrersTable)
        .where(eq(referrersTable.patient_id, p.patNum));

      if (existing) { skipped++; continue; }

      // Build referral code: FIRST4-LAST4(patNum)
      const referralCode = buildReferralCode(p.firstName || p.name.split(" ")[0] || "ANON", p.patNum);

      // Check referral_code collision
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
      });

      imported++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${p.patNum} (${p.name}): ${msg}`);
    }
  }

  logger.info({ imported, skipped, errors: errors.length }, "OD patient import complete");

  res.json({
    imported,
    skipped,
    total: incoming.length,
    errors: errors.slice(0, 20),
  });
});

export default router;
