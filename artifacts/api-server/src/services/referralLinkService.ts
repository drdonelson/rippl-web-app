/**
 * referralLinkService.ts
 *
 * Sends a patient their unique referral link via SMS and/or email.
 * Also provides the auto-trigger hook:
 *   sendReferralLinkToPatient(referrerId, channels, reason)
 * which can be called from appointment-completion logic in the Open Dental poller.
 */

import twilio from "twilio";
import sgMail from "@sendgrid/mail";
import { db } from "@workspace/db";
import { referrersTable, referralLinkDeliveriesTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { logger } from "../lib/logger";

// ── Config ────────────────────────────────────────────────────────────────────

const APP_URL               = process.env.APP_URL || "https://localhost";
const TWILIO_ACCOUNT_SID    = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN     = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER   = process.env.TWILIO_PHONE_NUMBER;
const SENDGRID_API_KEY      = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL   = "hello@joinrippl.com";

// Auto-send cooldown — do not auto-send to the same patient more often than this.
// Manual sends are always allowed regardless of cooldown.
const AUTO_SEND_COOLDOWN_DAYS = 90;

// ── Types ─────────────────────────────────────────────────────────────────────

export type SendChannel = "sms" | "email";

export interface SendReferralLinkOptions {
  channels: SendChannel[];
  customMessage?: string;
  /** If true, respects the auto-send cooldown window. Manual sends always bypass it. */
  respectCooldown?: boolean;
  reason?: string;
}

export interface ChannelResult {
  status: "sent" | "failed" | "skipped";
  reason?: string;
  provider_message_id?: string;
}

export interface SendReferralLinkResult {
  sms?: ChannelResult;
  email?: ChannelResult;
  referral_url?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTwilioClient() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials not configured");
  }
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

function getSgClient() {
  if (!SENDGRID_API_KEY) throw new Error("SendGrid not configured");
  sgMail.setApiKey(SENDGRID_API_KEY);
  return sgMail;
}

function buildReferralUrl(code: string): string {
  return `${APP_URL}/refer?ref=${encodeURIComponent(code)}`;
}

function buildSmsBody(referrerName: string, referralUrl: string, custom?: string): string {
  if (custom) return custom;
  const first = referrerName.split(" ")[0];
  return `Hi ${first} — thanks for being a Hallmark Dental patient! If you know someone looking for a great dentist, share your personal link and we'll take great care of them: ${referralUrl}`;
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailHtml(referrerName: string, referralUrl: string): string {
  const firstName = escHtml(referrerName.split(" ")[0]);
  const safeUrl   = escHtml(referralUrl);

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Hallmark Dental referral link</title>
</head>
<body style="margin:0;padding:0;background-color:#0a1628;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0a1628;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background-color:#0f1f38;border:1px solid #1e3a5f;border-radius:12px;overflow:hidden;">

          <!-- HEADER -->
          <tr>
            <td align="center" style="padding:32px 40px 24px;background-color:#0a1628;border-bottom:1px solid #1e3a5f;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:700;color:#0d9488;letter-spacing:2px;line-height:1;">Rippl</p>
              <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:400;letter-spacing:3px;text-transform:uppercase;color:#64748b;">Hallmark Dental</p>
            </td>
          </tr>

          <!-- HERO -->
          <tr>
            <td align="center" style="padding:40px 40px 8px;background-color:#0f1f38;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:700;color:#ffffff;line-height:1.3;">
                Your personal referral link is ready
              </p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#94a3b8;line-height:1.7;">
                Hi <span style="color:#ffffff;font-weight:700;">${firstName}</span> &#8212;<br/>
                Thanks for being a Hallmark Dental patient. If you have a friend or family member looking for a great dental home, share your link below and we'll take great care of them.
              </p>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="padding:32px 40px 0;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr><td style="height:1px;background-color:#1e3a5f;font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- PRIMARY CTA -->
          <tr>
            <td align="center" style="padding:36px 40px 16px;">
              <a href="${safeUrl}"
                target="_blank"
                style="display:inline-block;background-color:#0d9488;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:8px;letter-spacing:0.5px;">
                Share My Link
              </a>
            </td>
          </tr>

          <!-- VISIBLE URL -->
          <tr>
            <td align="center" style="padding:0 40px 24px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#475569;line-height:1.8;">
                Or copy this link directly:<br/>
                <a href="${safeUrl}" target="_blank" style="color:#0d9488;text-decoration:underline;word-break:break-all;">${safeUrl}</a>
              </p>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="padding:0 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr><td style="height:1px;background-color:#1e3a5f;font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="padding:24px 40px 28px;background-color:#0a1628;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#475569;line-height:1.7;">
                Sent with <span style="color:#0d9488;font-weight:700;">Rippl</span> by Hallmark Dental<br/>
                You&#39;re receiving this because you&#39;re enrolled in our referral program.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Cooldown check ────────────────────────────────────────────────────────────

/**
 * Returns true if an auto-send was already delivered within the cooldown window.
 * Manual sends always bypass this check.
 */
export async function isWithinCooldown(referrerId: string): Promise<boolean> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - AUTO_SEND_COOLDOWN_DAYS);

  const [recent] = await db
    .select({ sent_at: referralLinkDeliveriesTable.sent_at })
    .from(referralLinkDeliveriesTable)
    .where(eq(referralLinkDeliveriesTable.referrer_id, referrerId))
    .orderBy(desc(referralLinkDeliveriesTable.created_at))
    .limit(1);

  if (!recent?.sent_at) return false;
  return recent.sent_at > cutoff;
}

/**
 * Returns the most recent successful delivery for a referrer, or null.
 */
export async function getLastDelivery(referrerId: string) {
  const [last] = await db
    .select()
    .from(referralLinkDeliveriesTable)
    .where(eq(referralLinkDeliveriesTable.referrer_id, referrerId))
    .orderBy(desc(referralLinkDeliveriesTable.created_at))
    .limit(1);
  return last ?? null;
}

// ── Core send function ────────────────────────────────────────────────────────

/**
 * Sends the referral link to a patient via selected channels.
 * Logs every attempt to referral_link_deliveries.
 *
 * This is the canonical function. Call it from:
 *   - Manual UI sends (respectCooldown = false)
 *   - Automatic appointment-completion triggers (respectCooldown = true)
 */
export async function sendReferralLinkToPatient(
  referrerId: string,
  options: SendReferralLinkOptions
): Promise<SendReferralLinkResult> {
  const { channels, customMessage, respectCooldown = false, reason } = options;

  // Load referrer
  const [referrer] = await db
    .select()
    .from(referrersTable)
    .where(eq(referrersTable.id, referrerId));

  if (!referrer) throw new Error(`Referrer not found: ${referrerId}`);

  // Cooldown guard for auto-sends
  if (respectCooldown) {
    const withinWindow = await isWithinCooldown(referrerId);
    if (withinWindow) {
      logger.info({ referrerId, reason }, "Auto-send skipped — within cooldown window");
      return {};
    }
  }

  const referralUrl = buildReferralUrl(referrer.referral_code);
  const result: SendReferralLinkResult = { referral_url: referralUrl };

  logger.info({ referrerId, name: referrer.name, channels, reason }, "Sending referral link");

  // ── SMS ──────────────────────────────────────────────────────────────────
  if (channels.includes("sms")) {
    const smsBody = buildSmsBody(referrer.name, referralUrl, customMessage);

    const [logRow] = await db.insert(referralLinkDeliveriesTable).values({
      referrer_id: referrerId,
      referral_code: referrer.referral_code,
      channel: "sms",
      recipient: referrer.phone,
      message_body: smsBody,
      status: "pending",
    }).returning();

    try {
      if (!TWILIO_PHONE_NUMBER) throw new Error("TWILIO_PHONE_NUMBER not set");
      const client = getTwilioClient();
      const msg = await client.messages.create({
        body: smsBody,
        from: TWILIO_PHONE_NUMBER,
        to: referrer.phone,
      });
      await db.update(referralLinkDeliveriesTable)
        .set({ status: "sent", provider_message_id: msg.sid, sent_at: new Date() })
        .where(eq(referralLinkDeliveriesTable.id, logRow.id));
      result.sms = { status: "sent", provider_message_id: msg.sid };
      logger.info({ sid: msg.sid, to: referrer.phone }, "Referral link SMS sent");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db.update(referralLinkDeliveriesTable)
        .set({ status: "failed", error_message: message })
        .where(eq(referralLinkDeliveriesTable.id, logRow.id));
      result.sms = { status: "failed", reason: message };
      logger.error({ err, to: referrer.phone }, "Failed to send referral link SMS");
    }
  }

  // ── Email ────────────────────────────────────────────────────────────────
  if (channels.includes("email")) {
    const email = referrer.email;
    if (!email) {
      result.email = { status: "skipped", reason: "No email on file" };
    } else {
      const [logRow] = await db.insert(referralLinkDeliveriesTable).values({
        referrer_id: referrerId,
        referral_code: referrer.referral_code,
        channel: "email",
        recipient: email,
        status: "pending",
      }).returning();

      try {
        const sg = getSgClient();
        await sg.send({
          to: email,
          from: { email: SENDGRID_FROM_EMAIL, name: "Hallmark Dental via Rippl" },
          subject: "Your Hallmark Dental referral link",
          html: buildEmailHtml(referrer.name, referralUrl),
          trackingSettings: {
            clickTracking: { enable: false, enableText: false },
          },
        });
        await db.update(referralLinkDeliveriesTable)
          .set({ status: "sent", provider_message_id: "sg", sent_at: new Date() })
          .where(eq(referralLinkDeliveriesTable.id, logRow.id));
        result.email = { status: "sent" };
        logger.info({ to: email }, "Referral link email sent");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await db.update(referralLinkDeliveriesTable)
          .set({ status: "failed", error_message: message })
          .where(eq(referralLinkDeliveriesTable.id, logRow.id));
        result.email = { status: "failed", reason: message };
        logger.error({ err, to: email }, "Failed to send referral link email");
      }
    }
  }

  return result;
}

// ── Auto-trigger hook point ───────────────────────────────────────────────────
//
// Call this from appointment-completion logic (e.g. Open Dental poller):
//
//   import { triggerAutoReferralLinkSend } from "./referralLinkService";
//   await triggerAutoReferralLinkSend(referrerId, "exam_completed");
//
// It will check the cooldown window and skip if a link was already sent recently.

export const AUTO_SEND_CHANNELS: SendChannel[] = ["sms", "email"];

export async function triggerAutoReferralLinkSend(
  referrerId: string,
  reason: string
): Promise<SendReferralLinkResult> {
  return sendReferralLinkToPatient(referrerId, {
    channels: AUTO_SEND_CHANNELS,
    respectCooldown: true,
    reason,
  });
}
