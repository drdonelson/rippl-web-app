import sgMail from "@sendgrid/mail";
import { logger } from "../lib/logger";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = "frontdesk@hallmarkdds.com";
const REFERRAL_BASE_URL = "https://joinrippl.com";

function getSgClient() {
  if (!SENDGRID_API_KEY) throw new Error("SENDGRID_API_KEY not configured");
  sgMail.setApiKey(SENDGRID_API_KEY);
  return sgMail;
}

export interface LaunchEmailParams {
  firstName: string;
  fullName: string;
  email: string;
  referralCode: string;
}

export async function sendLaunchEmail(params: LaunchEmailParams): Promise<{ success: boolean; error?: string }> {
  const { firstName, fullName, email, referralCode } = params;
  const referralUrl = `${REFERRAL_BASE_URL}/refer?ref=${referralCode}`;

  try {
    const sg = getSgClient();
    await sg.send({
      to: email,
      from: { email: FROM_EMAIL, name: "Hallmark Dental" },
      subject: `A thank you waiting for you, ${firstName} 🦷`,
      html: buildLaunchEmailHtml(firstName, fullName, referralUrl, referralCode),
      trackingSettings: {
        clickTracking: { enable: false, enableText: false },
        openTracking: { enable: true },
      },
    });
    logger.info({ to: email, referralCode }, "Launch email sent");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, to: email }, "Launch email failed");
    return { success: false, error: message };
  }
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildLaunchEmailHtml(
  firstName: string,
  _fullName: string,
  referralUrl: string,
  _referralCode: string
): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>A thank you waiting for you &#x1F9B7;</title>
</head>
<body style="margin:0;padding:0;background-color:#0a1628;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <!-- OUTER WRAPPER -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0a1628;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- CARD -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background-color:#0f1f38;border:1px solid #1e3a5f;border-radius:4px;">

          <!-- ── HEADER ── -->
          <tr>
            <td align="center" style="padding:36px 40px 28px;background-color:#0a1628;border-bottom:1px solid #1e3a5f;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:32px;font-weight:700;color:#0d9488;letter-spacing:2px;line-height:1;">Rippl</p>
              <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:400;letter-spacing:3px;text-transform:uppercase;color:#64748b;">Hallmark Dental</p>
            </td>
          </tr>

          <!-- ── HERO TEXT ── -->
          <tr>
            <td style="padding:40px 40px 8px;">
              <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:700;color:#ffffff;line-height:1.3;">Introducing a new way to say thank you</p>
              <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#94a3b8;line-height:1.75;">
                Hi <strong style="color:#ffffff;">${esc(firstName)}</strong> &#8212; at Hallmark Dental, our best patients come from people like you.
              </p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#94a3b8;line-height:1.75;">
                We just launched <strong style="color:#0d9488;">Rippl</strong> &#8212; our new referral reward program. When you refer a friend or family member and they come in for a visit, we send you a thank you gift. No forms, no waiting. It happens automatically.
              </p>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="padding:28px 40px 0;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr><td style="height:1px;background-color:#1e3a5f;font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- REWARD OPTIONS LABEL -->
          <tr>
            <td align="center" style="padding:24px 40px 16px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#64748b;">Choose your reward when a friend becomes a patient</p>
            </td>
          </tr>

          <!-- ── 3 REWARD CARDS ── -->
          <tr>
            <td style="padding:0 32px 32px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>

                  <!-- $100 In-House Credit -->
                  <td width="33%" valign="top" style="padding:0 6px 0 0;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0a1628;border:2px solid #1e3a5f;">
                      <tr>
                        <td align="center" style="padding:20px 12px;">
                          <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1;">&#x1F48E;</p>
                          <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#0d9488;line-height:1;">$100</p>
                          <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#ffffff;line-height:1.3;">In-House<br/>Credit</p>
                          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#64748b;line-height:1.5;">Applied to your next visit</p>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- $50 Amazon Gift Card -->
                  <td width="33%" valign="top" style="padding:0 3px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0a1628;border:2px solid #1e3a5f;">
                      <tr>
                        <td align="center" style="padding:20px 12px;">
                          <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1;">&#x1F4E6;</p>
                          <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#0d9488;line-height:1;">$50</p>
                          <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#ffffff;line-height:1.3;">Amazon<br/>Gift Card</p>
                          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#64748b;line-height:1.5;">Sent to your email</p>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- $50 Charity Donation -->
                  <td width="33%" valign="top" style="padding:0 0 0 6px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0a1628;border:2px solid #1e3a5f;">
                      <tr>
                        <td align="center" style="padding:20px 12px;">
                          <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1;">&#x1F49B;</p>
                          <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#0d9488;line-height:1;">$50</p>
                          <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#ffffff;line-height:1.3;">Charity<br/>Donation</p>
                          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#64748b;line-height:1.5;">We donate on your behalf</p>
                        </td>
                      </tr>
                    </table>
                  </td>

                </tr>
              </table>
            </td>
          </tr>

          <!-- ── AMBER NOTICE ── -->
          <tr>
            <td style="padding:0 32px 32px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#451a03;border:1px solid #92400e;border-left:4px solid #f59e0b;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#fbbf24;">Important</p>
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#fde68a;line-height:1.7;">
                      One reward per household. Reward is earned only after your referred friend or family member completes their first visit and becomes a patient of record.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── YOUR REFERRAL LINK ── -->
          <tr>
            <td align="center" style="padding:0 40px 16px;">
              <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#64748b;">Your unique referral link</p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#0d9488;font-weight:600;word-break:break-all;line-height:1.6;">${esc(referralUrl)}</p>
            </td>
          </tr>

          <!-- ── CTA BUTTON ── -->
          <tr>
            <td align="center" style="padding:8px 40px 40px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background-color:#0d9488;">
                    <a href="${esc(referralUrl)}" target="_blank" style="display:inline-block;padding:16px 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.5px;">Share My Link &#x2192;</a>
                  </td>
                </tr>
              </table>
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

          <!-- ── FOOTER ── -->
          <tr>
            <td align="center" style="padding:24px 40px 32px;background-color:#0a1628;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#475569;line-height:1.8;">
                Sent with <span style="color:#0d9488;font-weight:700;">Rippl</span> by Hallmark Dental<br/>
                You&#39;re receiving this because you&#39;re a valued patient of Hallmark Dental.<br/>
                This is a one-time program announcement.
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
