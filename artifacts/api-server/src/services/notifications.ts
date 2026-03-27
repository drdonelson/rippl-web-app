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
  const practiceName = "Hallmark Dental";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You started a Rippl 🎊</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 16px 0 !important; }
      .email-card { border-radius: 0 !important; }
      .email-body { padding: 32px 24px !important; }
      .reward-row { display: block !important; }
      .reward-cell {
        display: block !important;
        width: 100% !important;
        padding: 0 0 12px 0 !important;
      }
      .reward-box { width: 100% !important; box-sizing: border-box !important; }
      .cta-btn { padding: 16px 28px !important; font-size: 17px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0a1628;">

  <table width="100%" cellpadding="0" cellspacing="0" class="email-wrapper" style="background-color:#0a1628;padding:40px 0;">
    <tr>
      <td align="center" style="padding:0 16px;">

        <table width="600" cellpadding="0" cellspacing="0" class="email-card" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:20px;overflow:hidden;">

          <!-- ── HEADER ── -->
          <tr>
            <td align="center" style="background-color:#0a1628;padding:36px 40px 28px;">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:38px;font-weight:700;color:#ffffff;letter-spacing:-1px;line-height:1;">Rippl</h1>
              <div style="width:48px;height:3px;background-color:#0d9488;border-radius:2px;margin:10px auto 0;"></div>
              <p style="margin:14px 0 0;font-family:Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:#0d9488;">${practiceName}</p>
            </td>
          </tr>

          <!-- ── HERO BODY ── -->
          <tr>
            <td class="email-body" style="padding:48px 48px 36px;background-color:#ffffff;">

              <!-- Heading -->
              <h2 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:700;color:#0a1628;line-height:1.2;text-align:center;">
                You started a Rippl 🎊
              </h2>

              <!-- Intro -->
              <p style="margin:0 0 28px;font-family:Arial,sans-serif;font-size:16px;line-height:1.75;color:#374151;text-align:center;">
                Hi <strong style="color:#0a1628;">${referrerName}</strong> — great news!<br/>
                <strong style="color:#0a1628;">${newPatientName}</strong> just completed their visit at<br/>
                <strong style="color:#0d9488;">${practiceName}</strong>.<br/><br/>
                As a thank you for the referral, choose your reward below.
              </p>

              <!-- Divider -->
              <div style="width:100%;height:1px;background-color:#e5e7eb;margin:0 0 32px;"></div>

              <!-- Reward label -->
              <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#6b7280;text-align:center;">Choose your reward</p>

              <!-- ── 3 REWARD BOXES ── -->
              <table width="100%" cellpadding="0" cellspacing="0" class="reward-row" style="margin-bottom:36px;">
                <tr>
                  <!-- $100 In-House -->
                  <td class="reward-cell" style="width:33.33%;padding:0 6px 0 0;vertical-align:top;">
                    <table width="100%" cellpadding="0" cellspacing="0" class="reward-box" style="background-color:#f0fdf9;border:2px solid #0d9488;border-radius:14px;overflow:hidden;">
                      <tr>
                        <td align="center" style="padding:20px 16px 18px;">
                          <div style="font-size:28px;line-height:1;margin-bottom:10px;">💎</div>
                          <p style="margin:0 0 4px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#0a1628;">$100</p>
                          <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#0d9488;letter-spacing:0.5px;text-transform:uppercase;">In-House Credit</p>
                          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#6b7280;line-height:1.5;">Applied to your next visit</p>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- $50 Amazon -->
                  <td class="reward-cell" style="width:33.33%;padding:0 3px;vertical-align:top;">
                    <table width="100%" cellpadding="0" cellspacing="0" class="reward-box" style="background-color:#f8fafc;border:2px solid #cbd5e1;border-radius:14px;overflow:hidden;">
                      <tr>
                        <td align="center" style="padding:20px 16px 18px;">
                          <div style="font-size:28px;line-height:1;margin-bottom:10px;">📦</div>
                          <p style="margin:0 0 4px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#0a1628;">$50</p>
                          <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#0d9488;letter-spacing:0.5px;text-transform:uppercase;">Amazon Gift Card</p>
                          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#6b7280;line-height:1.5;">Sent to your email</p>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- $75 Partner -->
                  <td class="reward-cell" style="width:33.33%;padding:0 0 0 6px;vertical-align:top;">
                    <table width="100%" cellpadding="0" cellspacing="0" class="reward-box" style="background-color:#f8fafc;border:2px solid #cbd5e1;border-radius:14px;overflow:hidden;">
                      <tr>
                        <td align="center" style="padding:20px 16px 18px;">
                          <div style="font-size:28px;line-height:1;margin-bottom:10px;">🤝</div>
                          <p style="margin:0 0 4px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#0a1628;">$75</p>
                          <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#0d9488;letter-spacing:0.5px;text-transform:uppercase;">Partner Gift Card</p>
                          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#6b7280;line-height:1.5;">Support local businesses</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- ── CTA BUTTON ── -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${claimUrl}" class="cta-btn" style="display:inline-block;padding:18px 48px;background-color:#0d9488;color:#ffffff;font-family:Arial,sans-serif;font-size:18px;font-weight:700;text-decoration:none;border-radius:14px;letter-spacing:0.3px;line-height:1;">
                      Claim My Reward &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#9ca3af;text-align:center;">
                Button not working? <a href="${claimUrl}" style="color:#0d9488;text-decoration:underline;word-break:break-all;">${claimUrl}</a>
              </p>

            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td align="center" style="padding:20px 40px 28px;background-color:#f8fafc;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#9ca3af;line-height:1.6;">
                Sent with <strong style="color:#0d9488;">Rippl</strong> by ${practiceName}<br/>
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
