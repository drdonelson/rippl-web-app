import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { referrersTable, practicesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod/v4";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function generateReferralCode(name: string): string {
  const clean = name.replace(/\s+/g, "").toUpperCase().slice(0, 4);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${clean}${rand}`;
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

const EnrollBody = z.object({
  slug:       z.string().min(1),
  first_name: z.string().min(1).max(100),
  last_name:  z.string().min(1).max(100),
  phone:      z.string().min(10).max(20),
});

// POST /api/enroll — self-enrollment (public, no auth)
// Creates a referrer record with explicit SMS consent.
// Deduplicates on phone + practice_id — safe to call twice.
router.post("/", async (req, res) => {
  try {
    const body = EnrollBody.parse(req.body);
    const phoneDigits = body.phone.replace(/\D/g, "").slice(-10);

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

    const fullName = `${body.first_name.trim()} ${body.last_name.trim()}`;

    // Dedup: already enrolled with this phone at this practice
    const existing = await db
      .select({
        id:            referrersTable.id,
        referral_code: referrersTable.referral_code,
        name:          referrersTable.name,
      })
      .from(referrersTable)
      .where(and(
        eq(referrersTable.practice_id, practice.id),
        eq(referrersTable.phone, phoneDigits),
      ))
      .limit(1);

    if (existing.length > 0) {
      res.json({ ...existing[0], already_enrolled: true });
      return;
    }

    const referral_code = generateReferralCode(fullName);
    const [referrer] = await db
      .insert(referrersTable)
      .values({
        practice_id:   practice.id,
        patient_id:    `self-${phoneDigits}`, // no EMR ID for self-enrolled customers
        name:          fullName,
        phone:         phoneDigits,
        referral_code,
        sms_opt_out:   false,
        reward_value:  practice.reward_value ?? 35,
        tier:          "starter",
      })
      .returning({
        id:            referrersTable.id,
        referral_code: referrersTable.referral_code,
        name:          referrersTable.name,
      });

    logger.info({ practice_id: practice.id, name: fullName, slug: body.slug }, "Self-enrollment via /enroll");
    res.status(201).json({ ...referrer, already_enrolled: false });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request", issues: err.issues });
      return;
    }
    logger.error({ err }, "POST /api/enroll failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
