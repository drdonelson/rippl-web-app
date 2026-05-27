import twilio from "twilio";
import { SMS_ENABLED } from "../lib/smsEnabled";
import { Resend } from "resend";
import { logger } from "../lib/logger";
import { getPracticeConfig, resolveTwilioPhone, resolveFromEmail } from "../lib/practiceConfig";
import type { Practice } from "@workspace/db/schema";

const APP_URL = (process.env.PUBLIC_APP_URL || process.env.APP_URL || "https://www.joinrippl.com").replace(/\/$/, "");
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// ── Vertical-aware notification copy ─────────────────────────────────────────

export interface NotificationCopy {
  sms: string;            // {{firstName}} and {{claimUrl}} are template tokens
  email_subject: string;
  referral_trigger: string;
}

export function getNotificationCopy(practice: Practice | null): NotificationCopy {
  const name = practice?.white_label_name ?? practice?.name ?? "your practice";
  const vertical = practice?.vertical ?? "dental";

  switch (vertical) {
    case "automotive":
      return {
        sms:              `Hi {{firstName}}, your referral just purchased a vehicle at ${name}! Click to claim your reward: {{claimUrl}}`,
        email_subject:    `Your referral reward from ${name} is ready!`,
        referral_trigger: "purchased a vehicle",
      };
    case "salon":
      return {
        sms:              `Hi {{firstName}}, your referred friend completed their first appointment at ${name}! Click to claim your reward: {{claimUrl}}`,
        email_subject:    `You've earned a reward from ${name}!`,
        referral_trigger: "completed their first appointment",
      };
    default:
      return {
        sms:              `Hi {{firstName}}, your referred patient completed their first visit at ${name}! Click to claim your reward: {{claimUrl}}`,
        email_subject:    `You've earned a reward from ${name}!`,
        referral_trigger: "completed their first visit",
      };
  }
}

function resolveSmsBody(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

function getTwilioClient() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)");
  }
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

function getResendClient() {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendRewardNotification(
  referrerName: string,
  referrerPhone: string,
  referrerEmail: string | null | undefined,
  newPatientName: string,
  claimToken: string,
  officeName: string = "Hallmark Dental",
  rewardValue: number = 50,
  practiceId?: string,
) {
  const practice = await getPracticeConfig(practiceId ?? null);
  const fromPhone = resolveTwilioPhone(practice);
  const fromEmail = resolveFromEmail(practice);
  const copy = getNotificationCopy(practice);

  const claimUrl = `${APP_URL}/claim?token=${claimToken}`;
  logger.info({ claimToken, claimUrl }, "sendRewardNotification — claim URL being sent");
  const firstName = referrerName.split(" ")[0] || referrerName;
  const smsBody = resolveSmsBody(copy.sms, { firstName, claimUrl });

  const results: { sms?: string; email?: string; errors: string[] } = { errors: [] };

  // Send SMS via Twilio
  if (!SMS_ENABLED) {
    logger.info({ to: referrerPhone, body: smsBody }, "[SMS-SUPPRESSED] Reward notification SMS not sent (SMS_ENABLED=false)");
    results.sms = "suppressed";
  } else {
    try {
      if (!fromPhone) throw new Error("TWILIO_PHONE_NUMBER not set");
      const client = getTwilioClient();
      const msg = await client.messages.create({
        body: smsBody,
        from: fromPhone,
        to: referrerPhone,
      });
      results.sms = msg.sid;
      logger.info({ sid: msg.sid, to: referrerPhone }, "SMS sent via Twilio");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.errors.push(`SMS: ${message}`);
      logger.error({ err, to: referrerPhone }, "Failed to send Twilio SMS");
    }
  }

  // Send email via Resend — HTML only
  if (referrerEmail) {
    try {
      const resend = getResendClient();
      const { error: emailError } = await resend.emails.send({
        to: referrerEmail,
        from: `${officeName} via Rippl <${fromEmail.email}>`,
        subject: copy.email_subject,
        html: buildEmailHtml(referrerName, newPatientName, claimUrl, officeName, rewardValue, copy.referral_trigger),
      });
      if (emailError) throw new Error(emailError.message);
      results.email = "sent";
      logger.info({ to: referrerEmail }, "Email sent via Resend");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.errors.push(`Email: ${message}`);
      logger.error({ err, to: referrerEmail }, "Failed to send Resend email");
    }
  } else {
    logger.info({ referrerName }, "No email on file — skipping email notification");
  }

  return results;
}

function buildEmailHtml(referrerName: string, newPatientName: string, claimUrl: string, officeName: string, rewardValue: number = 50, referralTrigger = "completed their first visit"): string {
  const practice  = officeName;
  const font      = "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
  const rv        = rewardValue;
  const firstName = referrerName.split(" ")[0] || referrerName;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You've earned a reward &#x1F381;</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5f5f5;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <!-- CARD -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8e8e8;">

          <!-- ── HEADER ── -->
          <tr>
            <td style="padding:20px 32px;border-bottom:1px solid #f0f0f0;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <span style="font-family:${font};font-size:22px;font-weight:700;color:#E0622A;letter-spacing:1px;">Rippl</span>
                  </td>
                  <td align="right">
                    <span style="font-family:${font};font-size:12px;color:#999999;font-weight:500;">${escHtml(practice)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── HERO ── -->
          <tr>
            <td align="center" style="background:linear-gradient(135deg,#F5A623 0%,#E0622A 100%);padding:40px 32px;">
              <p style="margin:0 0 6px;font-family:${font};font-size:16px;font-weight:500;color:rgba(255,255,255,0.88);">Hey ${escHtml(firstName)} &#8212;</p>
              <p style="margin:0 0 20px;font-family:Georgia,Times,'Times New Roman',serif;font-size:16px;font-style:italic;font-weight:300;color:rgba(255,255,255,0.80);">You've earned it.</p>
              <p style="margin:0;font-family:Georgia,Times,'Times New Roman',serif;font-size:80px;font-weight:700;color:#ffffff;line-height:1;">$${rv}</p>
              <p style="margin:8px 0 0;font-family:${font};font-size:15px;color:rgba(255,255,255,0.85);font-weight:500;">reward for you</p>
            </td>
          </tr>

          <!-- ── TRIGGER MESSAGE ── -->
          <tr>
            <td align="center" style="padding:28px 40px 8px;">
              <p style="margin:0;font-family:${font};font-size:15px;color:#555555;line-height:1.7;">
                <strong style="color:#111111;">${escHtml(newPatientName)}</strong> just ${escHtml(referralTrigger)} at ${escHtml(practice)}.<br/>
                Choose your reward below.
              </p>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="padding:20px 32px 0;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr><td style="height:1px;background-color:#f0f0f0;font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- CHOOSE YOUR REWARD LABEL -->
          <tr>
            <td align="center" style="padding:20px 32px 12px;">
              <p style="margin:0;font-family:${font};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#aaaaaa;">Choose your reward</p>
            </td>
          </tr>

          <!-- ── REWARD CARDS ── -->
          <tr>
            <td style="padding:0 24px 24px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>

                  <!-- In-house credit (highlighted) -->
                  <td width="33%" valign="top" style="padding:0 4px 0 0;">
                    <a href="${claimUrl}" target="_blank" style="display:block;text-decoration:none;background-color:#fff7f2;border:2px solid #E0622A;border-radius:12px;padding:18px 10px;text-align:center;">
                      <p style="margin:0 0 6px;font-family:${font};font-size:24px;line-height:1;">&#x1F48E;</p>
                      <p style="margin:0 0 3px;font-family:${font};font-size:20px;font-weight:700;color:#E0622A;line-height:1;">$100</p>
                      <p style="margin:0 0 4px;font-family:${font};font-size:11px;font-weight:700;color:#333333;line-height:1.3;">Account Credit</p>
                      <p style="margin:0;font-family:${font};font-size:10px;color:#E0622A;font-weight:600;">Most Valuable</p>
                    </a>
                  </td>

                  <!-- Gift card -->
                  <td width="33%" valign="top" style="padding:0 2px;">
                    <a href="${claimUrl}" target="_blank" style="display:block;text-decoration:none;background-color:#fafafa;border:2px solid #e8e8e8;border-radius:12px;padding:18px 10px;text-align:center;">
                      <p style="margin:0 0 6px;font-family:${font};font-size:24px;line-height:1;">&#x1F381;</p>
                      <p style="margin:0 0 3px;font-family:${font};font-size:20px;font-weight:700;color:#E0622A;line-height:1;">$${rv}</p>
                      <p style="margin:0 0 4px;font-family:${font};font-size:11px;font-weight:700;color:#333333;line-height:1.3;">Gift Card</p>
                      <p style="margin:0;font-family:${font};font-size:10px;color:#888888;">Sent to email</p>
                    </a>
                  </td>

                  <!-- Charity -->
                  <td width="33%" valign="top" style="padding:0 0 0 4px;">
                    <a href="${claimUrl}" target="_blank" style="display:block;text-decoration:none;background-color:#fafafa;border:2px solid #e8e8e8;border-radius:12px;padding:18px 10px;text-align:center;">
                      <p style="margin:0 0 6px;font-family:${font};font-size:24px;line-height:1;">&#x2764;&#xFE0F;</p>
                      <p style="margin:0 0 3px;font-family:${font};font-size:20px;font-weight:700;color:#E0622A;line-height:1;">$${rv}</p>
                      <p style="margin:0 0 4px;font-family:${font};font-size:11px;font-weight:700;color:#333333;line-height:1.3;">Charity</p>
                      <p style="margin:0;font-family:${font};font-size:10px;color:#888888;">In your name</p>
                    </a>
                  </td>

                </tr>
              </table>
            </td>
          </tr>

          <!-- ── CTA BUTTON ── -->
          <tr>
            <td align="center" style="padding:0 32px 24px;">
              <a href="${claimUrl}" target="_blank" style="display:inline-block;background-color:#E0622A;color:#ffffff;font-family:${font};font-size:15px;font-weight:700;padding:14px 40px;border-radius:9999px;text-decoration:none;">
                Claim My Reward &#8594;
              </a>
            </td>
          </tr>

          <!-- FALLBACK LINK -->
          <tr>
            <td align="center" style="padding:0 32px 24px;">
              <p style="margin:0;font-family:${font};font-size:11px;color:#aaaaaa;line-height:1.6;">
                Button not working? <a href="${claimUrl}" target="_blank" style="color:#E0622A;text-decoration:underline;word-break:break-all;">${escHtml(claimUrl)}</a>
              </p>
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td align="center" style="background-color:#fafafa;border-top:1px solid #f0f0f0;padding:20px 32px 24px;">
              <p style="margin:0;font-family:${font};font-size:12px;color:#aaaaaa;line-height:1.7;">
                Sent with <span style="color:#E0622A;font-weight:700;">Rippl</span> by ${escHtml(practice)}<br/>
                You&#39;re receiving this because you referred a patient to our practice.
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

/** Escape HTML special characters to prevent injection in email content */
function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
