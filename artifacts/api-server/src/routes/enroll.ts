import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { referrersTable, practicesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function generateReferralCode(name: string): string {
  const clean = name.replace(/\s+/g, "").toUpperCase().slice(0, 4);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${clean}${rand}`;
}

function validateEnrollBody(body: unknown): { slug: string; first_name: string; last_name: string; phone: string } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const slug       = typeof b.slug       === "string" && b.slug.trim()       ? b.slug.trim()       : null;
  const first_name = typeof b.first_name === "string" && b.first_name.trim() ? b.first_name.trim() : null;
  const last_name  = typeof b.last_name  === "string" && b.last_name.trim()  ? b.last_name.trim()  : null;
  const phone      = typeof b.phone      === "string" && b.phone.length >= 10 ? b.phone            : null;
  if (!slug || !first_name || !last_name || !phone) return null;
  return { slug, first_name, last_name, phone };
}

// GET /api/enroll/:slug — practice branding lookup (public, no auth)
router.get("/:slug", async (req, res) => {
  const { slug } = req.params;
  try {
    const [practice] = await db
      .select({
        id:               practicesTable.id,
        name:             practicesTable.name,
        vertical:         practicesTable.vertical,
        logo_url:         practicesTable.logo_url,
        primary_color:    practicesTable.primary_color,
        white_label_name: practicesTable.white_label_name,
        reward_value:     practicesTable.reward_value,
        status:           practicesTable.status,
      })
      .from(practicesTable)
      .where(eq(practicesTable.slug, slug))
      .limit(1);

    if (!practice || practice.status === "demo" || practice.status === "inactive") {
      res.status(404).json({ error: "Practice not found" });
      return;
    }

    res.json(practice);
  } catch (err) {
    logger.error({ err, slug }, "GET /api/enroll/:slug failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/enroll — self-enrollment (public, no auth)
// Creates a referrer record with explicit SMS consent.
// Retries use a browser-generated request ID. Shared phones never select another member.
router.post("/", async (req, res) => {
  try {
    const body = validateEnrollBody(req.body);
    if (!body) {
      res.status(400).json({ error: "Invalid request: slug, first_name, last_name, and phone are required" });
      return;
    }

    const requestId = req.body?.request_id;
    if (typeof requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
      res.status(400).json({ error: "Refresh the enrollment page and try again." }); return;
    }
    const phoneDigits = body.phone.replace(/\D/g, "").slice(-10);
    if (phoneDigits.length !== 10) { res.status(400).json({ error: "A valid phone number is required" }); return; }
    const patientId = `self-v2-${requestId.toLowerCase()}`;

    const [practice] = await db
      .select({
        id:           practicesTable.id,
        status:       practicesTable.status,
        reward_value: practicesTable.reward_value,
      })
      .from(practicesTable)
      .where(eq(practicesTable.slug, body.slug))
      .limit(1);

    if (!practice || practice.status === "demo" || practice.status === "inactive") {
      res.status(404).json({ error: "Practice not found" });
      return;
    }

    const fullName = `${body.first_name} ${body.last_name}`;

    // A request ID deduplicates retries, not people sharing contact information.
    const existing = await db
      .select({
        id:            referrersTable.id,
        referral_code: referrersTable.referral_code,
        name:          referrersTable.name,
        phone:         referrersTable.phone,
      })
      .from(referrersTable)
      .where(and(
        eq(referrersTable.practice_id, practice.id),
        eq(referrersTable.patient_id, patientId),
      ))
      .limit(1);

    if (existing.length > 0) {
      if (existing[0].name !== fullName || existing[0].phone !== phoneDigits) {
        res.status(409).json({ error: "This enrollment request was already used. Refresh to enroll another person." }); return;
      }
      res.json({ ...existing[0], already_enrolled: true });
      return;
    }

    const referral_code = generateReferralCode(fullName);
    const [referrer] = await db
      .insert(referrersTable)
      .values({
        practice_id:   practice.id,
        patient_id:    patientId,
        name:          fullName,
        phone:         phoneDigits,
        referral_code,
        sms_opt_out:   false,
        reward_value:  practice.reward_value ?? 35,
        tier:          "starter",
      })
      .onConflictDoNothing()
      .returning({
        id:            referrersTable.id,
        referral_code: referrersTable.referral_code,
        name:          referrersTable.name,
      });

    if (!referrer) {
      const [winner] = await db.select({ id: referrersTable.id, name: referrersTable.name, referral_code: referrersTable.referral_code }).from(referrersTable)
        .where(and(eq(referrersTable.practice_id, practice.id), eq(referrersTable.patient_id, patientId)));
      if (!winner) { res.status(409).json({ error: "Enrollment conflict. Please retry." }); return; }
      res.json({ ...winner, already_enrolled: true }); return;
    }
    logger.info({ practice_id: practice.id, name: fullName, slug: body.slug }, "Self-enrollment via /enroll");
    res.status(201).json({ ...referrer, already_enrolled: false });
  } catch (err) {
    logger.error({ err }, "POST /api/enroll failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
