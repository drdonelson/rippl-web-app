import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { referrersTable, referralLinkDeliveriesTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  CreateReferrerBody,
  GetReferrerQrParams,
} from "@workspace/api-zod";
import { isStaff, requireSuperAdmin } from "../middleware/auth";
import { sendReferralLinkToPatient, getLastDelivery, type SendChannel } from "../services/referralLinkService";
import { logger } from "../lib/logger";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const router: IRouter = Router();

function generateReferralCode(name: string): string {
  const clean = name.replace(/\s+/g, "").toUpperCase().slice(0, 4);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${clean}${rand}`;
}

router.get("/", async (req, res) => {
  const user = req.authUser!;
  // Non-super-admins are always scoped to their own practice
  const rawOfficeId = typeof req.query.office_id === "string" && req.query.office_id !== "all"
    ? req.query.office_id : undefined;
  const effectiveOfficeId = user.role !== "super_admin" && user.practice_id
    ? user.practice_id
    : rawOfficeId;

  const conditions = effectiveOfficeId
    ? [eq(referrersTable.office_id, effectiveOfficeId)]
    : [];

  try {
    const referrers = await db
      .select()
      .from(referrersTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(referrersTable.created_at);
    res.json(referrers);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, effectiveOfficeId }, "GET /api/referrers failed");
    res.status(500).json({ error: message });
  }
});

router.post("/", async (req, res) => {
  try {
    const user = req.authUser!;
    const body = CreateReferrerBody.parse(req.body);

    // Staff can only create patients tagged to their own assigned office.
    if (isStaff(user)) {
      if (!user.practice_id) {
        res.status(403).json({ error: "Your staff account has no assigned office." });
        return;
      }
      body.office_id = user.practice_id;
    }

    const referral_code = generateReferralCode(body.name);
    const [referrer] = await db.insert(referrersTable).values({
      ...body,
      referral_code,
    }).returning();
    res.status(201).json(referrer);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "POST /api/referrers failed");
    res.status(500).json({ error: message });
  }
});

// POST /api/referrers/bulk-send-links — super_admin only
// Sends referral links to all referrers where onboarding_sms_sent = false
// for the given office (or all offices). Rate-limited to 10/second.
router.post("/bulk-send-links", requireSuperAdmin, async (req, res) => {
  const { office_id, channels } = req.body as {
    office_id?: unknown;
    channels?: unknown;
  };

  // Validate channels
  const validChannels: SendChannel[] = ["sms", "email"];
  if (!Array.isArray(channels) || channels.length === 0) {
    res.status(400).json({ error: "channels must be a non-empty array of 'sms' and/or 'email'" });
    return;
  }
  const requested = channels as string[];
  const invalid = requested.filter(c => !validChannels.includes(c as SendChannel));
  if (invalid.length > 0) {
    res.status(400).json({ error: `Invalid channels: ${invalid.join(", ")}` });
    return;
  }

  // Validate office_id
  const officeFilter = typeof office_id === "string" && office_id !== "all"
    ? office_id
    : undefined;

  try {
    // Load all eligible referrers (onboarding_sms_sent = false for this office)
    const conditions = [eq(referrersTable.onboarding_sms_sent, false)];
    if (officeFilter) conditions.push(eq(referrersTable.office_id, officeFilter));

    const eligible = await db
      .select()
      .from(referrersTable)
      .where(and(...conditions))
      .orderBy(referrersTable.created_at);

    logger.info(
      { total: eligible.length, office_id: officeFilter ?? "all", channels: requested },
      "[bulk-send] Starting bulk referral link send"
    );

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const referrer of eligible) {
      // Skip if the requested channels have no contact info at all
      const wantsSms   = requested.includes("sms");
      const wantsEmail = requested.includes("email");
      const hasPhone   = !!referrer.phone;
      const hasEmail   = !!referrer.email;

      if ((wantsSms && !hasPhone) && (wantsEmail && !hasEmail)) {
        skipped++;
        errors.push(`${referrer.name} (${referrer.id}): No phone or email on file`);
        continue;
      }

      try {
        const result = await sendReferralLinkToPatient(referrer.id, {
          channels: requested as SendChannel[],
          respectCooldown: false,
          reason: "bulk_send",
        });

        // Consider a success if at least one channel was delivered
        const anySuccess =
          result.sms?.status === "sent" || result.email?.status === "sent";

        if (anySuccess) {
          // Flip the flag so this patient won't appear in future bulk sends
          await db
            .update(referrersTable)
            .set({ onboarding_sms_sent: true })
            .where(eq(referrersTable.id, referrer.id));
          sent++;
        } else {
          const smsReason   = result.sms?.reason   ?? "";
          const emailReason = result.email?.reason ?? "";
          const reason = [smsReason, emailReason].filter(Boolean).join("; ") || "All channels failed";
          failed++;
          errors.push(`${referrer.name} (${referrer.id}): ${reason}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        failed++;
        errors.push(`${referrer.name} (${referrer.id}): ${message}`);
        logger.error({ err, referrerId: referrer.id }, "[bulk-send] Error sending to referrer");
      }

      // Rate limit: 100ms between sends = 10/second ceiling
      await sleep(100);
    }

    logger.info(
      { total: eligible.length, sent, failed, skipped },
      "[bulk-send] Bulk send complete"
    );

    res.json({ total: eligible.length, sent, failed, skipped, errors });
  } catch (err) {
    logger.error({ err }, "[bulk-send] Fatal error in bulk send route");
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

router.get("/:id/qr", async (req, res) => {
  try {
    const { id } = GetReferrerQrParams.parse(req.params);
    const [referrer] = await db.select().from(referrersTable).where(eq(referrersTable.id, id));
    if (!referrer) {
      res.status(404).json({ error: "Referrer not found" });
      return;
    }

    // Resolve the public base URL using the priority chain:
    //   1. PUBLIC_APP_URL  — canonical production domain (https://www.joinrippl.com)
    //   2. APP_URL         — legacy secret, same purpose
    //   3. REPLIT_DOMAINS  — Replit dev preview (works in dev, not on Render)
    //   4. Hard-coded joinrippl.com — last resort so localhost never leaks into QR codes
    const publicAppUrl = (
      process.env.PUBLIC_APP_URL ||
      process.env.APP_URL ||
      (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "") ||
      "https://www.joinrippl.com"
    ).replace(/\/$/, "");

    const referral_url = `${publicAppUrl}/refer?ref=${encodeURIComponent(referrer.referral_code)}`;
    res.json({ referral_url, referral_code: referrer.referral_code });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "GET /api/referrers/:id/qr failed");
    res.status(500).json({ error: message });
  }
});

// GET /api/referrers/:id/last-delivery — most recent link delivery for a referrer
router.get("/:id/last-delivery", async (req, res) => {
  try {
    const { id } = req.params;
    const [referrer] = await db.select({ id: referrersTable.id }).from(referrersTable).where(eq(referrersTable.id, id));
    if (!referrer) {
      res.status(404).json({ error: "Referrer not found" });
      return;
    }
    const last = await getLastDelivery(id);
    res.json(last ?? null);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "GET /api/referrers/:id/last-delivery failed");
    res.status(500).json({ error: message });
  }
});

// POST /api/referrers/:id/send-link — manually send referral link via SMS and/or email
router.post("/:id/send-link", async (req, res) => {
  const { id } = req.params;
  try {
    const { channels, customMessage } = req.body as {
      channels?: unknown;
      customMessage?: string;
    };

    // Validate channels array
    if (!Array.isArray(channels) || channels.length === 0) {
      res.status(400).json({ error: "channels must be a non-empty array of 'sms' and/or 'email'" });
      return;
    }
    const validChannels: SendChannel[] = ["sms", "email"];
    const requested = channels as string[];
    const invalid = requested.filter(c => !validChannels.includes(c as SendChannel));
    if (invalid.length > 0) {
      res.status(400).json({ error: `Invalid channels: ${invalid.join(", ")}` });
      return;
    }

    // Load referrer
    const [referrer] = await db.select().from(referrersTable).where(eq(referrersTable.id, id));
    if (!referrer) {
      res.status(404).json({ error: "Referrer not found" });
      return;
    }

    const result = await sendReferralLinkToPatient(id, {
      channels: requested as SendChannel[],
      customMessage: customMessage?.trim() || undefined,
      respectCooldown: false, // manual sends always bypass cooldown
      reason: "manual_staff_send",
    });

    // If at least one channel was successfully delivered, mark the patient as
    // contacted so they're excluded from future automated post-visit sweeps.
    const anyDelivered = result.sms?.status === "sent" || result.email?.status === "sent";
    if (anyDelivered) {
      await db
        .update(referrersTable)
        .set({ onboarding_sms_sent: true })
        .where(eq(referrersTable.id, id));
    }

    res.json({ success: true, ...result });
  } catch (err) {
    logger.error({ err }, "send-link failed");
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// ── PATCH /:id/opt-out — toggle SMS/email opt-out ─────────────────────────────
router.patch("/:id/opt-out", async (req, res) => {
  try {
    const { id } = req.params;
    const { sms_opt_out, opt_out_reason } = req.body as { sms_opt_out: boolean; opt_out_reason?: string };

    if (typeof sms_opt_out !== "boolean") {
      return void res.status(400).json({ error: "sms_opt_out must be a boolean" });
    }

    const updated = await db
      .update(referrersTable)
      .set({
        sms_opt_out,
        opt_out_reason: sms_opt_out ? (opt_out_reason ?? null) : null,
      })
      .where(eq(referrersTable.id, id))
      .returning({ id: referrersTable.id, sms_opt_out: referrersTable.sms_opt_out });

    if (!updated.length) return void res.status(404).json({ error: "Referrer not found" });

    logger.info({ referrerId: id, sms_opt_out, opt_out_reason }, "Opt-out updated");
    return void res.json({ ok: true, sms_opt_out: updated[0].sms_opt_out });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "PATCH /api/referrers/:id/opt-out failed");
    return void res.status(500).json({ error: message });
  }
});

export default router;
