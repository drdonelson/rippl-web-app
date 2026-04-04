import twilio from "twilio";
import sgMail from "@sendgrid/mail";
import { logger } from "../lib/logger";

const APP_URL = (process.env.PUBLIC_APP_URL || process.env.APP_URL || "https://www.joinrippl.com").replace(/\/$/, "");
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "hello@joinrippl.com";

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
  claimToken: string,
  officeName: string = "Hallmark Dental",
  rewardValue: number = 50
) {
  const claimUrl = `${APP_URL}/claim?token=${claimToken}`;
  logger.info({ claimToken, claimUrl }, "sendRewardNotification — claim URL being sent");
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

  // Send email via SendGrid — HTML only, click tracking disabled
  if (referrerEmail) {
    try {
      const sg = getSendGridClient();
      await sg.send({
        to: referrerEmail,
        from: { email: SENDGRID_FROM_EMAIL, name: `${officeName} via Rippl` },
        subject: `You started a Rippl 🎊`,
        html: buildEmailHtml(referrerName, newPatientName, claimUrl, officeName, rewardValue),
        // No text fallback — HTML only
        trackingSettings: {
          clickTracking: { enable: false, enableText: false },
        },
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

function buildEmailHtml(referrerName: string, newPatientName: string, claimUrl: string, officeName: string, rewardValue: number = 50): string {
  const practice = officeName;
  const font     = "system-ui,-apple-system,sans-serif";
  const rv       = rewardValue;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You started a Rippl &#x1F38A;</title>
</head>
<body style="margin:0;padding:0;background-color:#060e1a;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <!-- OUTER WRAPPER -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#060e1a;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- CARD -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background-color:#0a1628;border:1px solid #1e3352;">

          <!-- ── HEADER ── -->
          <tr>
            <td align="center" style="padding:36px 40px 28px;background-color:#060e1a;border-bottom:1px solid #1e3352;">
              <p style="margin:0;font-family:${font};font-size:32px;font-weight:700;color:#2dd4bf;letter-spacing:2px;line-height:1;">Rippl</p>
              <p style="margin:8px 0 0;font-family:${font};font-size:11px;font-weight:400;letter-spacing:3px;text-transform:uppercase;color:#64748b;">Hallmark Dental</p>
            </td>
          </tr>

          <!-- ── HERO ── -->
          <tr>
            <td align="center" style="padding:40px 40px 8px;background-color:#0f1f38;">
              <p style="margin:0 0 16px;font-family:${font};font-size:28px;font-weight:700;color:#f8fafc;line-height:1.3;">You started a Rippl &#x1F38A;</p>
              <p style="margin:0;font-family:${font};font-size:16px;color:#94a3b8;line-height:1.7;">
                Hi <span style="color:#f8fafc;font-weight:700;">${escHtml(referrerName)}</span> &#8212;<br/>
                <span style="color:#f8fafc;font-weight:700;">${escHtml(newPatientName)}</span> just completed their visit at Hallmark Dental.<br/><br/>
                As a thank you for your referral, choose your reward below.
              </p>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="padding:32px 40px 0;background-color:#0f1f38;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="height:1px;background-color:#1e3352;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CHOOSE YOUR REWARD LABEL -->
          <tr>
            <td align="center" style="padding:24px 40px 16px;background-color:#0f1f38;">
              <p style="margin:0;font-family:${font};font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#64748b;">Choose your reward</p>
            </td>
          </tr>

          <!-- ── 3 REWARD CARDS ── -->
          <tr>
            <td style="padding:0 32px 32px;background-color:#0f1f38;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>

                  <!-- $100 In-House Credit -->
                  <td width="33%" valign="top" style="padding:0 6px 0 0;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0a1628;border:2px solid #1e3352;">
                      <tr>
                        <td align="center" style="padding:0;">
                          <a href="${claimUrl}&amp;reward=in-house-credit" target="_blank" style="display:block;text-decoration:none;color:inherit;padding:20px 12px;">
                            <p style="margin:0 0 8px;font-family:${font};font-size:26px;line-height:1;">&#x1F48E;</p>
                            <p style="margin:0 0 4px;font-family:${font};font-size:22px;font-weight:700;color:#2dd4bf;line-height:1;">$100</p>
                            <p style="margin:0 0 6px;font-family:${font};font-size:12px;font-weight:700;color:#f8fafc;line-height:1.3;">In-House Credit</p>
                            <p style="margin:0;font-family:${font};font-size:11px;color:#64748b;line-height:1.5;">Applied to your next visit</p>
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- Gift Card -->
                  <td width="33%" valign="top" style="padding:0 3px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0a1628;border:2px solid #1e3352;">
                      <tr>
                        <td align="center" style="padding:0;">
                          <a href="${claimUrl}&amp;reward=amazon-gift-card" target="_blank" style="display:block;text-decoration:none;color:inherit;padding:20px 12px;">
                            <p style="margin:0 0 8px;font-family:${font};font-size:26px;line-height:1;">&#x1F381;</p>
                            <p style="margin:0 0 4px;font-family:${font};font-size:22px;font-weight:700;color:#2dd4bf;line-height:1;">$${rv}</p>
                            <p style="margin:0 0 6px;font-family:${font};font-size:12px;font-weight:700;color:#f8fafc;line-height:1.3;">Gift Card</p>
                            <p style="margin:0;font-family:${font};font-size:11px;color:#64748b;line-height:1.5;">Sent to your email</p>
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- Charity Donation -->
                  <td width="33%" valign="top" style="padding:0 0 0 6px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0a1628;border:2px solid #1e3352;">
                      <tr>
                        <td align="center" style="padding:0;">
                          <a href="${claimUrl}&amp;reward=charity-donation" target="_blank" style="display:block;text-decoration:none;color:inherit;padding:20px 12px;">
                            <p style="margin:0 0 8px;font-family:${font};font-size:26px;line-height:1;">&#x1F49B;</p>
                            <p style="margin:0 0 4px;font-family:${font};font-size:22px;font-weight:700;color:#2dd4bf;line-height:1;">$${rv}</p>
                            <p style="margin:0 0 6px;font-family:${font};font-size:12px;font-weight:700;color:#f8fafc;line-height:1.3;">Charity Donation</p>
                            <p style="margin:0;font-family:${font};font-size:11px;color:#64748b;line-height:1.5;">We donate on your behalf</p>
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>

                </tr>
              </table>
            </td>
          </tr>

          <!-- FALLBACK LINK -->
          <tr>
            <td align="center" style="padding:0 40px 16px;background-color:#0a1628;">
              <p style="margin:0;font-family:${font};font-size:12px;color:#475569;line-height:1.6;">
                Cards not clickable? Visit:<br/>
                <a href="${claimUrl}" target="_blank" style="color:#2dd4bf;text-decoration:underline;word-break:break-all;">${escHtml(claimUrl)}</a>
              </p>
            </td>
          </tr>

          <!-- HOW IT WORKS LINK -->
          <tr>
            <td align="center" style="padding:0 40px 24px;background-color:#0a1628;">
              <a href="https://www.joinrippl.com/how-it-works" target="_blank" style="font-family:${font};font-size:13px;color:#2dd4bf;text-decoration:none;">
                Learn how the referral program works &#8594;
              </a>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="padding:0 40px;background-color:#0a1628;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="height:1px;background-color:#1e3352;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td align="center" style="padding:24px 40px 28px;background-color:#060e1a;">
              <p style="margin:0;font-family:${font};font-size:12px;color:#475569;line-height:1.7;">
                Sent with <span style="color:#2dd4bf;font-weight:700;">Rippl</span> by Hallmark Dental<br/>
                You&#39;re receiving this because you referred a patient to our practice.
              </p>
            </td>
          </tr>

        </table>
        <!-- /CARD -->

      </td>
    </tr>
  </table>
  <!-- /OUTER WRAPPER -->

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
