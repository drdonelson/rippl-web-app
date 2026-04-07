import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  referrersTable,
  campaignsTable,
} from "@workspace/db/schema";
import { eq, and, gt, sql, desc } from "drizzle-orm";
import twilio from "twilio";
import { SMS_ENABLED } from "../lib/smsEnabled";
import sgMail from "@sendgrid/mail";

const router: IRouter = Router();

const APP_URL = (process.env.PUBLIC_APP_URL || process.env.APP_URL || "https://www.joinrippl.com").replace(/\/$/, "");
const TWILIO_ACCOUNT_SID  = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN   = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const SENDGRID_API_KEY    = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "hello@joinrippl.com";

const TIER_NAMES: Record<string, string> = {
  starter:       "Influencer",
  rippler:       "Amplifier",
  super_rippler: "Ambassador",
  rippl_legend:  "Legend",
};

const VALID_FILTERS = [
  "not_contacted",
  "active_referrers",
  "tier_starter",
  "tier_rippler",
  "tier_super_rippler",
  "tier_rippl_legend",
  "office_brentwood",
  "office_lewisburg",
  "office_greenbrier",
  "no_referrals_90d",
] as const;
type AudienceFilter = typeof VALID_FILTERS[number];

// ── Permission check ──────────────────────────────────────────────────────────

function canAccess(role: string) {
  return role === "super_admin" || role === "practice_admin";
}

// ── Audience query ────────────────────────────────────────────────────────────

interface ReferrerRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  referral_code: string;
  tier: string | null;
  reward_value: number | null;
  office_id: string | null;
  onboarding_sms_sent: boolean;
  office_name: string | null;
}

async function getFilteredReferrers(filter: AudienceFilter): Promise<ReferrerRow[]> {
  // Complex subquery: no referrals in the last 90 days
  if (filter === "no_referrals_90d") {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const { rows } = await db.execute(sql`
      SELECT
        r.id, r.name, r.phone, r.email,
        r.referral_code, r.tier, r.reward_value,
        r.office_id, r.onboarding_sms_sent,
        o.name AS office_name
      FROM referrers r
      LEFT JOIN offices o ON o.id = r.office_id
      WHERE r.sms_opt_out = false
        AND NOT EXISTS (
          SELECT 1 FROM referral_events re
          WHERE re.referrer_id = r.id
            AND re.created_at > ${cutoff}
        )
      ORDER BY r.name
    `);
    return rows as ReferrerRow[];
  }

  // Office filters: resolve location_code → office id first
  if (filter.startsWith("office_")) {
    const locationCode = filter.replace("office_", "");
    const { rows } = await db.execute(sql`
      SELECT
        r.id, r.name, r.phone, r.email,
        r.referral_code, r.tier, r.reward_value,
        r.office_id, r.onboarding_sms_sent,
        o.name AS office_name
      FROM referrers r
      INNER JOIN offices o ON o.id = r.office_id
      WHERE r.sms_opt_out = false
        AND o.location_code = ${locationCode}
      ORDER BY r.name
    `);
    return rows as ReferrerRow[];
  }

  // Simple Drizzle conditions
  let condition;
  if (filter === "not_contacted")       condition = eq(referrersTable.onboarding_sms_sent, false);
  else if (filter === "active_referrers") condition = gt(referrersTable.total_referrals, 0);
  else if (filter.startsWith("tier_")) {
    const tier = filter.replace("tier_", "");
    condition = eq(referrersTable.tier, tier);
  }

  const { rows } = await db.execute(sql`
    SELECT
      r.id, r.name, r.phone, r.email,
      r.referral_code, r.tier, r.reward_value,
      r.office_id, r.onboarding_sms_sent,
      o.name AS office_name
    FROM referrers r
    LEFT JOIN offices o ON o.id = r.office_id
    WHERE r.sms_opt_out = false
    ${condition ? sql`AND ${condition}` : sql``}
    ORDER BY r.name
  `);
  return rows as ReferrerRow[];
}

// ── Template rendering ────────────────────────────────────────────────────────

function renderTemplate(template: string, referrer: ReferrerRow): string {
  const firstName   = referrer.name?.split(" ")[0] ?? "there";
  const tierName    = TIER_NAMES[referrer.tier ?? "starter"] ?? "Influencer";
  const referralLink = `${APP_URL}/refer?code=${referrer.referral_code}`;
  const rewardValue = `$${referrer.reward_value ?? 35}`;
  const officeName  = referrer.office_name ?? "Hallmark Dental";

  return template
    .replace(/\{\{first_name\}\}/g,    firstName)
    .replace(/\{\{referral_link\}\}/g, referralLink)
    .replace(/\{\{tier_name\}\}/g,     tierName)
    .replace(/\{\{reward_value\}\}/g,  rewardValue)
    .replace(/\{\{office_name\}\}/g,   officeName);
}

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

// ── GET /api/campaigns ────────────────────────────────────────────────────────

router.get("/", async (req, res) => {
  if (!canAccess(req.authUser?.role ?? "")) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  try {
    const campaigns = await db
      .select()
      .from(campaignsTable)
      .orderBy(desc(campaignsTable.created_at))
      .limit(100);
    res.json(campaigns);
  } catch (err) {
    req.log.error({ err }, "[campaigns] GET failed");
    res.status(500).json({ error: "Failed to load campaigns" });
  }
});

// ── POST /api/campaigns/count ─────────────────────────────────────────────────
// Returns the patient count and a preview patient for the given filter.

router.post("/count", async (req, res) => {
  if (!canAccess(req.authUser?.role ?? "")) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const { filter } = req.body as { filter: string };
  if (!VALID_FILTERS.includes(filter as AudienceFilter)) {
    res.status(400).json({ error: "Invalid filter" });
    return;
  }
  try {
    const referrers = await getFilteredReferrers(filter as AudienceFilter);
    const first     = referrers[0] ?? null;
    res.json({
      count: referrers.length,
      preview_patient: first
        ? {
            name:          first.name,
            referral_code: first.referral_code,
            tier:          first.tier,
            reward_value:  first.reward_value,
            office_name:   first.office_name,
          }
        : null,
    });
  } catch (err) {
    req.log.error({ err }, "[campaigns] count failed");
    res.status(500).json({ error: "Failed to count patients" });
  }
});

// ── POST /api/campaigns/send ──────────────────────────────────────────────────

router.post("/send", async (req, res) => {
  if (!canAccess(req.authUser?.role ?? "")) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { name, channel, filter, message_template } = req.body as {
    name: string;
    channel: string;
    filter: string;
    message_template: string;
  };

  if (!name?.trim() || !channel || !filter || !message_template?.trim()) {
    res.status(400).json({ error: "name, channel, filter, and message_template are required" });
    return;
  }
  if (!["sms", "email"].includes(channel)) {
    res.status(400).json({ error: "channel must be 'sms' or 'email'" });
    return;
  }
  if (!VALID_FILTERS.includes(filter as AudienceFilter)) {
    res.status(400).json({ error: "Invalid filter" });
    return;
  }

  // Check credentials early
  if (channel === "sms" && (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER)) {
    res.status(500).json({ error: "Twilio not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)" });
    return;
  }
  if (channel === "email" && !SENDGRID_API_KEY) {
    res.status(500).json({ error: "SendGrid not configured (SENDGRID_API_KEY)" });
    return;
  }

  // Create campaign record immediately
  const [campaign] = await db
    .insert(campaignsTable)
    .values({
      name:             name.trim(),
      channel,
      audience_filter:  filter,
      message_template: message_template.trim(),
      status:           "draft",
      created_by:       req.authUser!.id,
      sent_count:       0,
      failed_count:     0,
    })
    .returning();

  // Respond immediately — processing continues in background
  res.json({
    success:     true,
    campaign_id: campaign.id,
    status:      "processing",
    message:     "Campaign is being sent. Check history for status.",
  });

  // ── Background send (fire-and-forget) ─────────────────────────────────────
  setImmediate(async () => {
    try {
      const referrers = await getFilteredReferrers(filter as AudienceFilter);

      // Set up clients
      const twilioClient = channel === "sms"
        ? twilio(TWILIO_ACCOUNT_SID!, TWILIO_AUTH_TOKEN!)
        : null;
      if (channel === "email") sgMail.setApiKey(SENDGRID_API_KEY!);

      let sentCount  = 0;
      let failCount  = 0;

      for (let i = 0; i < referrers.length; i++) {
        // Rate limit: 10/second — sleep 1 s after every 10th message
        if (i > 0 && i % 10 === 0) await sleep(1000);

        const referrer = referrers[i];
        const message  = renderTemplate(message_template.trim(), referrer);

        try {
          if (channel === "sms") {
            if (!referrer.phone) { failCount++; continue; }
            if (!SMS_ENABLED) {
              logger.info({ to: referrer.phone, body: message }, "[SMS-SUPPRESSED] Campaign SMS not sent (SMS_ENABLED=false)");
            } else {
              await twilioClient!.messages.create({
                body: message,
                from: TWILIO_PHONE_NUMBER!,
                to:   referrer.phone,
              });
            }
            // Mark contacted if this was an onboarding campaign
            if (filter === "not_contacted") {
              await db
                .update(referrersTable)
                .set({ onboarding_sms_sent: true })
                .where(eq(referrersTable.id, referrer.id));
            }
          } else {
            if (!referrer.email) { failCount++; continue; }
            await sgMail.send({
              to:   referrer.email,
              from: { email: SENDGRID_FROM_EMAIL, name: "Rippl by Hallmark Dental" },
              subject: name.trim(),
              text:    message,
              html:    `<p style="font-family:system-ui,sans-serif;white-space:pre-wrap;line-height:1.7">${message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>")}</p>`,
              trackingSettings: { clickTracking: { enable: false, enableText: false } },
            });
          }
          sentCount++;
        } catch (sendErr) {
          failCount++;
          console.error(`[campaigns] Failed to send to ${referrer.name}:`, sendErr);
        }
      }

      await db
        .update(campaignsTable)
        .set({
          status:       failCount === referrers.length && referrers.length > 0 ? "failed" : "sent",
          sent_count:   sentCount,
          failed_count: failCount,
          sent_at:      new Date(),
        })
        .where(eq(campaignsTable.id, campaign.id));

      console.log(`[campaigns] ${campaign.id} done — sent: ${sentCount}, failed: ${failCount}`);
    } catch (bgErr) {
      console.error("[campaigns] Background send crashed:", bgErr);
      await db
        .update(campaignsTable)
        .set({ status: "failed" })
        .where(eq(campaignsTable.id, campaign.id))
        .catch(() => {});
    }
  });
});

// ── POST /api/campaigns/test-send ─────────────────────────────────────────────
// Sends a single test email to the specified address using real patient data.
// Does NOT create a campaign record. Logs with [TEST-SEND] prefix.

router.post("/test-send", async (req, res) => {
  if (!canAccess(req.authUser?.role ?? "")) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { filter, message_template, test_email } = req.body as {
    filter: string;
    message_template: string;
    test_email?: string;
  };

  if (!filter || !message_template?.trim()) {
    res.status(400).json({ error: "filter and message_template are required" });
    return;
  }
  if (!VALID_FILTERS.includes(filter as AudienceFilter)) {
    res.status(400).json({ error: "Invalid filter" });
    return;
  }

  const recipientEmail = (test_email?.trim() || SENDGRID_FROM_EMAIL).toLowerCase();

  if (!SENDGRID_API_KEY) {
    res.status(500).json({ error: "SendGrid not configured (SENDGRID_API_KEY)" });
    return;
  }

  try {
    // Get the first matching patient for real template data
    const referrers = await getFilteredReferrers(filter as AudienceFilter);
    const patient   = referrers[0] ?? null;

    // If no real patient, synthesise a placeholder referrer
    const referrerData: ReferrerRow = patient ?? {
      id:                  "test",
      name:                "Sarah Johnson",
      phone:               null,
      email:               null,
      referral_code:       "TEST-1234",
      tier:                "starter",
      reward_value:        35,
      office_id:           null,
      onboarding_sms_sent: false,
      office_name:         "Hallmark Dental",
    };

    const renderedMessage = renderTemplate(message_template.trim(), referrerData);

    sgMail.setApiKey(SENDGRID_API_KEY);
    await sgMail.send({
      to:   recipientEmail,
      from: { email: SENDGRID_FROM_EMAIL, name: "Rippl by Hallmark Dental" },
      subject: `[TEST] Campaign Preview — ${referrerData.name.split(" ")[0]}'s data`,
      text:    renderedMessage,
      html:    `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0d9488;color:#fff;padding:8px 16px;border-radius:6px 6px 0 0;font-size:12px;font-weight:600;letter-spacing:.05em">
          TEST PREVIEW — rendered with ${patient ? referrerData.name + "'s real data" : "placeholder data (no matching patients)"}
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 6px 6px">
          <p style="white-space:pre-wrap;line-height:1.7;margin:0">${renderedMessage.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>")}</p>
        </div>
      </div>`,
      trackingSettings: { clickTracking: { enable: false, enableText: false } },
    });

    req.log.info(
      { recipientEmail, patientName: referrerData.name, filter },
      "[TEST-SEND] Campaign test email sent"
    );

    res.json({
      success:      true,
      sent_to:      recipientEmail,
      patient_name: referrerData.name,
      used_placeholder: !patient,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    req.log.error({ err }, "[TEST-SEND] Failed to send test email");
    res.status(500).json({ error: message });
  }
});

export default router;
