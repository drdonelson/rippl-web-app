import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { practicesTable, officesTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth, requireSuperAdmin } from "../middleware/auth";
import { invalidatePracticeCache } from "../lib/practiceConfig";

const router: IRouter = Router();

// GET /api/practices — list all practices (super_admin only)
router.get("/", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const practices = await db.execute(sql`
      SELECT
        p.*,
        COUNT(o.id)::int AS office_count
      FROM practices p
      LEFT JOIN offices o ON o.practice_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    res.json(practices.rows);
  } catch (err) {
    req.log.error({ err }, "[practices] GET failed");
    res.status(500).json({ error: "Failed to load practices" });
  }
});

// GET /api/practices/:id — single practice
router.get("/:id", requireAuth, requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const [practice] = await db
      .select()
      .from(practicesTable)
      .where(eq(practicesTable.id, id));
    if (!practice) { res.status(404).json({ error: "Practice not found" }); return; }

    const offices = await db
      .select()
      .from(officesTable)
      .where(eq(officesTable.practice_id, id));

    res.json({ ...practice, offices });
  } catch (err) {
    req.log.error({ err, id }, "[practices] GET/:id failed");
    res.status(500).json({ error: "Failed to load practice" });
  }
});

// POST /api/practices — create a new practice (super_admin only)
router.post("/", requireAuth, requireSuperAdmin, async (req, res) => {
  const {
    name, slug, vertical, plan, monthly_fee, per_referral_fee,
    reward_value, twilio_phone_number, sendgrid_from_email,
    sendgrid_from_name, tango_email_template_id, primary_color,
  } = req.body as Record<string, string | number | undefined>;

  if (!name || !slug) {
    res.status(400).json({ error: "name and slug are required" });
    return;
  }

  const slugStr = String(slug).toLowerCase().replace(/[^a-z0-9-]/g, "-");

  try {
    const [practice] = await db
      .insert(practicesTable)
      .values({
        name:                    String(name),
        slug:                    slugStr,
        vertical:                vertical ? String(vertical) : "dental",
        plan:                    plan ? String(plan) : "per_referral",
        monthly_fee:             monthly_fee ? Number(monthly_fee) : 0,
        per_referral_fee:        per_referral_fee ? Number(per_referral_fee) : 20,
        reward_value:            reward_value ? Number(reward_value) : 35,
        twilio_phone_number:     twilio_phone_number ? String(twilio_phone_number) : null,
        sendgrid_from_email:     sendgrid_from_email ? String(sendgrid_from_email) : null,
        sendgrid_from_name:      sendgrid_from_name ? String(sendgrid_from_name) : null,
        tango_email_template_id: tango_email_template_id ? String(tango_email_template_id) : null,
        primary_color:           primary_color ? String(primary_color).replace("#", "") : "E0622A",
      })
      .returning();

    res.status(201).json(practice);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      res.status(409).json({ error: "A practice with that slug already exists" });
      return;
    }
    req.log.error({ err }, "[practices] POST failed");
    res.status(500).json({ error: "Failed to create practice" });
  }
});

// PATCH /api/practices/:id — update practice config
router.patch("/:id", requireAuth, requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    name, status, plan, monthly_fee, per_referral_fee,
    reward_value, twilio_phone_number, sendgrid_from_email,
    sendgrid_from_name, tango_email_template_id, primary_color,
    vertical, integration_config,
    white_label_name, white_label_logo_url, white_label_primary_color, show_powered_by_rippl,
    in_house_credit_label, in_house_credit_value,
  } = req.body as Record<string, string | number | boolean | undefined | null>;

  const updates: Partial<typeof practicesTable.$inferInsert> = {};
  if (name                      !== undefined) updates.name                      = String(name);
  if (status                    !== undefined) updates.status                    = String(status);
  if (plan                      !== undefined) updates.plan                      = String(plan);
  if (vertical                  !== undefined) updates.vertical                  = String(vertical);
  if (monthly_fee               !== undefined) updates.monthly_fee               = Number(monthly_fee);
  if (per_referral_fee          !== undefined) updates.per_referral_fee          = Number(per_referral_fee);
  if (reward_value              !== undefined) updates.reward_value              = Number(reward_value);
  if (twilio_phone_number       !== undefined) updates.twilio_phone_number       = twilio_phone_number ? String(twilio_phone_number) : null;
  if (sendgrid_from_email       !== undefined) updates.sendgrid_from_email       = sendgrid_from_email ? String(sendgrid_from_email) : null;
  if (sendgrid_from_name        !== undefined) updates.sendgrid_from_name        = sendgrid_from_name ? String(sendgrid_from_name) : null;
  if (tango_email_template_id   !== undefined) updates.tango_email_template_id   = tango_email_template_id ? String(tango_email_template_id) : null;
  if (primary_color             !== undefined) updates.primary_color             = primary_color ? String(primary_color).replace("#", "") : "E0622A";
  if (integration_config        !== undefined) updates.integration_config        = integration_config as Record<string, string>;
  if (white_label_name          !== undefined) updates.white_label_name          = white_label_name ? String(white_label_name) : null;
  if (white_label_logo_url      !== undefined) updates.white_label_logo_url      = white_label_logo_url ? String(white_label_logo_url) : null;
  if (white_label_primary_color !== undefined) updates.white_label_primary_color = white_label_primary_color ? String(white_label_primary_color).replace("#", "") : null;
  if (show_powered_by_rippl     !== undefined) updates.show_powered_by_rippl     = Boolean(show_powered_by_rippl);
  if (in_house_credit_label     !== undefined) updates.in_house_credit_label     = in_house_credit_label ? String(in_house_credit_label) : "$100 Dental Account Credit";
  if (in_house_credit_value     !== undefined) updates.in_house_credit_value     = Number(in_house_credit_value);

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  try {
    const [practice] = await db
      .update(practicesTable)
      .set(updates)
      .where(eq(practicesTable.id, id))
      .returning();

    if (!practice) { res.status(404).json({ error: "Practice not found" }); return; }

    invalidatePracticeCache(id);
    res.json(practice);
  } catch (err) {
    req.log.error({ err, id }, "[practices] PATCH failed");
    res.status(500).json({ error: "Failed to update practice" });
  }
});

export default router;
