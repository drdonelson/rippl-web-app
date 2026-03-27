import twilio from "twilio";
import sgMail from "@sendgrid/mail";
import { logger } from "../lib/logger";

const APP_URL = process.env.APP_URL || "https://localhost";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@hallmarkdental.com";

function getTwilioClient() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)");
  }
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

function getSendGridClient() {
  if (!SENDGRID_API_KEY) {
    throw new Error("SendGrid not configured (SENDGRID_API_KEY)");
  }
  sgMail.setApiKey(SENDGRID_API_KEY);
  return sgMail;
}

export async function sendRewardNotification(
  referrerName: string,
  referrerPhone: string,
  referrerEmail: string | null | undefined,
  newPatientName: string,
  claimToken: string
) {
  const claimUrl = `${APP_URL}/claim?ref=${claimToken}`;
  const smsBody = `Hi ${referrerName} 👋 You started a Rippl — ${newPatientName} just completed their visit at Hallmark Dental. Claim your reward here: ${claimUrl}`;

  const results: { sms?: string; email?: string; errors: string[] } = { errors: [] };

  // Send SMS via Twilio
  try {
    if (!TWILIO_PHONE_NUMBER) throw new Error("TWILIO_PHONE_NUMBER not set");
    const client = getTwilioClient();
    const msg = await client.messages.create({
      body: smsBody,
      from: TWILIO_PHONE_NUMBER,
      to: referrerPhone,
    });
    results.sms = msg.sid;
    logger.info({ sid: msg.sid, to: referrerPhone }, "SMS sent via Twilio");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    results.errors.push(`SMS: ${message}`);
    logger.error({ err, to: referrerPhone }, "Failed to send Twilio SMS");
  }

  // Send email via SendGrid
  if (referrerEmail) {
    try {
      const sg = getSendGridClient();
      await sg.send({
        to: referrerEmail,
        from: SENDGRID_FROM_EMAIL,
        subject: `🎉 Your Rippl reward is ready, ${referrerName}!`,
        text: smsBody,
        html: buildEmailHtml(referrerName, newPatientName, claimUrl),
      });
      results.email = "sent";
      logger.info({ to: referrerEmail }, "Email sent via SendGrid");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.errors.push(`Email: ${message}`);
      logger.error({ err, to: referrerEmail }, "Failed to send SendGrid email");
    }
  } else {
    logger.info({ referrerName }, "No email on file — skipping SendGrid notification");
  }

  return results;
}

function buildEmailHtml(referrerName: string, newPatientName: string, claimUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Rippl Reward</title>
</head>
<body style="margin:0;padding:0;background-color:#060e1c;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#060e1c;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#0a1628;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d9488 0%,#0a7a6e 100%);padding:36px 40px;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.7);">Hallmark Dental</p>
              <h1 style="margin:0;font-size:32px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Rippl</h1>
              <p style="margin:12px 0 0 0;font-size:14px;color:rgba(255,255,255,0.8);">Patient Referral Reward Program</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:48px 40px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#0d9488;">You've earned a reward</p>
              <h2 style="margin:0 0 24px 0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;">
                Thank you, ${referrerName}! 🎉
              </h2>
              <p style="margin:0 0 32px 0;font-size:16px;line-height:1.7;color:#94a3b8;">
                Great news — <strong style="color:#ffffff;">${newPatientName}</strong> just completed their visit at Hallmark Dental. As a thank you for your referral, we'd like to send you a reward.
              </p>

              <!-- Reward Options Summary -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(13,148,136,0.08);border:1px solid rgba(13,148,136,0.2);border-radius:12px;margin-bottom:32px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 12px 0;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#0d9488;">Choose your reward</p>
                    <p style="margin:0 0 8px 0;font-size:15px;color:#e2e8f0;">💎 &nbsp;<strong>$100 In-House Credit</strong> — Applied to your next visit</p>
                    <p style="margin:0 0 8px 0;font-size:15px;color:#e2e8f0;">📦 &nbsp;<strong>$50 Amazon Gift Card</strong> — Sent to your email</p>
                    <p style="margin:0;font-size:15px;color:#e2e8f0;">🤝 &nbsp;<strong>$75 Partner Gift Card</strong> — Support local businesses</p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${claimUrl}" style="display:inline-block;padding:16px 40px;background-color:#0d9488;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:12px;letter-spacing:0.3px;">
                      Claim My Reward →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:32px 0 0 0;font-size:13px;color:#64748b;text-align:center;">
                Or copy this link: <a href="${claimUrl}" style="color:#0d9488;word-break:break-all;">${claimUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0;font-size:12px;color:#475569;">
                © Hallmark Dental · Powered by Rippl<br/>
                You're receiving this because you referred a patient to our practice.
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
