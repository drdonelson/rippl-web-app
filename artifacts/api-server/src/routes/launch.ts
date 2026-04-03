import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { launchEmailsTable, referrersTable } from "@workspace/db/schema";
import { eq, and, count } from "drizzle-orm";
import { sendLaunchEmail } from "../services/launchEmail";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ── Rate limit ────────────────────────────────────────────────────────────────
const RATE_LIMIT_PER_HOUR = 50;
const DELAY_BETWEEN_SENDS_MS = Math.ceil(3_600_000 / RATE_LIMIT_PER_HOUR); // 72 s

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

// ── Queue processor (one instance per server lifetime) ─────────────────────
let processorRunning = false;

async function startProcessor(): Promise<void> {
  if (processorRunning) return;
  processorRunning = true;
  logger.info("Launch email processor started");

  try {
    while (true) {
      const [job] = await db
        .select()
        .from(launchEmailsTable)
        .where(eq(launchEmailsTable.status, "pending"))
        .orderBy(launchEmailsTable.created_at)
        .limit(1);

      if (!job) break; // nothing left to send

      const result = await sendLaunchEmail({
        firstName:    job.first_name,
        fullName:     job.first_name,
        email:        job.email,
        referralCode: job.referral_code,
      });

      if (result.success) {
        await db
          .update(launchEmailsTable)
          .set({ status: "sent", sent_at: new Date() })
          .where(eq(launchEmailsTable.id, job.id));
        logger.info({ id: job.id, email: job.email }, "Launch email delivered");
      } else {
        await db
          .update(launchEmailsTable)
          .set({ status: "failed", error: result.error ?? "unknown" })
          .where(eq(launchEmailsTable.id, job.id));
        logger.error({ id: job.id, email: job.email, error: result.error }, "Launch email failed");
      }

      // Respect rate limit — wait before next send
      await sleep(DELAY_BETWEEN_SENDS_MS);
    }
  } finally {
    processorRunning = false;
    logger.info("Launch email processor finished");
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface PatientInput {
  name:      string;
  firstName: string;
  email:     string;
  patientId: string;
  phone?:    string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateBlastBody(body: unknown): { valid: true; data: PatientInput[] } | { valid: false; error: string } {
  if (!Array.isArray(body)) return { valid: false, error: "Body must be an array" };
  if (body.length === 0) return { valid: false, error: "Array must not be empty" };
  if (body.length > 5_000) return { valid: false, error: "Maximum 5,000 patients per request" };
  for (let i = 0; i < body.length; i++) {
    const p = body[i];
    if (typeof p !== "object" || p === null) return { valid: false, error: `Item ${i}: must be an object` };
    if (!p.name  || typeof p.name  !== "string") return { valid: false, error: `Item ${i}: 'name' is required` };
    if (!p.firstName || typeof p.firstName !== "string") return { valid: false, error: `Item ${i}: 'firstName' is required` };
    if (!p.email || typeof p.email !== "string" || !isValidEmail(p.email)) return { valid: false, error: `Item ${i}: valid 'email' is required` };
    if (!p.patientId || typeof p.patientId !== "string") return { valid: false, error: `Item ${i}: 'patientId' is required` };
  }
  return { valid: true, data: body as PatientInput[] };
}

// ── Helper: look up or create a referrer record for a patient ─────────────────
async function resolveReferralCode(
  patientId: string,
  name: string,
  firstName: string,
  email: string,
  phone: string
): Promise<string> {
  // Check by patient_id first
  const [existing] = await db
    .select({ referral_code: referrersTable.referral_code })
    .from(referrersTable)
    .where(eq(referrersTable.patient_id, patientId));

  if (existing) return existing.referral_code;

  // Also check by email to avoid creating duplicates for existing patients
  const [byEmail] = await db
    .select({ referral_code: referrersTable.referral_code })
    .from(referrersTable)
    .where(eq(referrersTable.email, email));

  if (byEmail) return byEmail.referral_code;

  // Create new referrer
  const newId = crypto.randomUUID();
  const first4 = firstName.toUpperCase().replace(/[^A-Z]/g, "").padEnd(4, "X").slice(0, 4);
  const last4  = newId.replace(/-/g, "").toUpperCase().slice(-4);
  let referralCode = `${first4}-${last4}`;

  // Collision guard
  const [collision] = await db
    .select({ id: referrersTable.id })
    .from(referrersTable)
    .where(eq(referrersTable.referral_code, referralCode));
  if (collision) referralCode = `${first4}-${Math.floor(Math.random() * 9000 + 1000)}`;

  await db.insert(referrersTable).values({
    id:            newId,
    patient_id:    patientId,
    name,
    phone:         phone || "launch-import",
    email,
    referral_code: referralCode,
  });

  logger.info({ patientId, referralCode }, "New referrer created via launch blast");
  return referralCode;
}

// ── POST /api/launch/email-blast ──────────────────────────────────────────────
router.post("/email-blast", async (req, res) => {
  const validation = validateBlastBody(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error });
    return;
  }

  const patients = validation.data;
  let queued = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const patient of patients) {
    try {
      // Skip if already sent to this email
      const [alreadySent] = await db
        .select({ id: launchEmailsTable.id })
        .from(launchEmailsTable)
        .where(
          and(
            eq(launchEmailsTable.email, patient.email),
            eq(launchEmailsTable.status, "sent")
          )
        );

      if (alreadySent) {
        skipped++;
        continue;
      }

      // Skip if already pending (duplicate in same request)
      const [alreadyPending] = await db
        .select({ id: launchEmailsTable.id })
        .from(launchEmailsTable)
        .where(
          and(
            eq(launchEmailsTable.email, patient.email),
            eq(launchEmailsTable.status, "pending")
          )
        );

      if (alreadyPending) {
        skipped++;
        continue;
      }

      const referralCode = await resolveReferralCode(
        patient.patientId,
        patient.name,
        patient.firstName,
        patient.email,
        patient.phone ?? ""
      );

      await db.insert(launchEmailsTable).values({
        patient_id:    patient.patientId,
        email:         patient.email,
        first_name:    patient.firstName,
        referral_code: referralCode,
        status:        "pending",
      });

      queued++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${patient.email}: ${msg}`);
    }
  }

  // Kick off the background processor (fire-and-forget)
  startProcessor().catch(err => logger.error({ err }, "Launch processor crashed"));

  const estimatedMinutes = Math.ceil((queued * DELAY_BETWEEN_SENDS_MS) / 60_000);

  req.log.info({ queued, skipped, errors: errors.length }, "Launch blast queued");
  res.status(202).json({
    accepted: true,
    queued,
    skipped,
    errors: errors.slice(0, 20),
    estimated_completion_minutes: estimatedMinutes,
    rate_limit: `${RATE_LIMIT_PER_HOUR} per hour`,
  });
});

// ── GET /api/launch/status ────────────────────────────────────────────────────
router.get("/status", async (_req, res) => {
  const rows = await db
    .select({
      status: launchEmailsTable.status,
      count:  count(),
    })
    .from(launchEmailsTable)
    .groupBy(launchEmailsTable.status);

  const totals: Record<string, number> = { pending: 0, sent: 0, failed: 0 };
  for (const row of rows) {
    totals[row.status] = Number(row.count);
  }

  const total = totals.pending + totals.sent + totals.failed;
  const pct = total > 0 ? Math.round((totals.sent / total) * 100) : 0;

  res.json({
    pending: totals.pending,
    sent: totals.sent,
    failed: totals.failed,
    total,
    completion_pct: pct,
    processor_running: processorRunning,
  });
});

// ── POST /api/launch/test ─────────────────────────────────────────────────────
router.post("/test", async (req, res) => {
  const body = req.body as { email?: string; firstName?: string; referralCode?: string };
  if (!body.email || !isValidEmail(body.email)) {
    res.status(400).json({ error: "Provide a valid { email }" });
    return;
  }

  const email        = body.email;
  const firstName    = body.firstName?.trim() || "Friend";
  const referralCode = body.referralCode?.trim() || "TEST-0001";

  req.log.info({ email }, "Sending test launch email");

  const result = await sendLaunchEmail({
    firstName,
    fullName:     firstName,
    email,
    referralCode,
  });

  if (!result.success) {
    res.status(500).json({ success: false, error: result.error });
    return;
  }

  res.json({
    success: true,
    message: `Preview launch email sent to ${email}. Check inbox.`,
    previewUrl: `${(process.env.PUBLIC_APP_URL || process.env.APP_URL || "https://www.joinrippl.com").replace(/\/$/, "")}/refer?ref=${referralCode}`,
  });
});

export default router;
