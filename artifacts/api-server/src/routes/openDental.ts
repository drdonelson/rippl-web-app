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
  PatStatus?:      number; // 0=Patient, 1=NonPatient, 2=Inactive, 3=Deceased, 4=Deleted
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
    // PatStatus=0 → active patients only
    const url = new URL("/api/v1/patients", OPEN_DENTAL_URL);
    url.searchParams.set("PatStatus", "0");

    logger.info({ url: url.toString() }, "Fetching active patients from Open Dental");

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
    const patients = Array.isArray(raw) ? raw : [raw];

    // Normalise into a clean list
    const normalized = patients
      .filter(p => p.PatNum && (p.FName || p.LName))
      .map(p => ({
        patNum:    String(p.PatNum),
        name:      [p.FName, p.LName].filter(Boolean).join(" ").trim(),
        firstName: p.Preferred?.trim() || p.FName?.trim() || "",
        lastName:  p.LName?.trim() || "",
        phone:     getBestPhone(p),
        email:     p.Email?.trim() || null,
      }));

    logger.info({ count: normalized.length }, "Active patients fetched from OD");

    res.json({ patients: normalized, total: normalized.length });
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
