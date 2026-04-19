import { Router } from "express";
import sgMail from "@sendgrid/mail";
import { logger } from "../lib/logger";

const router = Router();

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "hello@joinrippl.com";
const NOTIFY_EMAIL = "hello@joinrippl.com";

router.post("/", async (req, res) => {
  const { name, email, phone, practice, emr, locations } = req.body;

  if (!name || !email || !phone || !practice) {
    return res.status(400).json({ error: "name, email, phone, and practice are required" });
  }

  logger.info({ name, email, practice, emr, locations }, "Demo request received");

  if (!SENDGRID_API_KEY) {
    logger.warn("SendGrid not configured — demo request not emailed");
    return res.json({ ok: true, warn: "email_not_sent" });
  }

  sgMail.setApiKey(SENDGRID_API_KEY);

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#0d9488;margin-bottom:4px">New Demo Request — Rippl</h2>
      <p style="color:#64748b;margin-top:0;margin-bottom:24px">Someone wants to see Rippl in action.</p>

      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;width:40%">Name</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600">${name}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b">Email</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0"><a href="mailto:${email}">${email}</a></td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b">Phone</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0"><a href="tel:${phone}">${phone}</a></td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b">Practice</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600">${practice}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b">EMR</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0">${emr || "Not specified"}</td></tr>
        <tr><td style="padding:10px 0;color:#64748b">Locations</td><td style="padding:10px 0">${locations || "Not specified"}</td></tr>
      </table>

      <p style="margin-top:32px;color:#64748b;font-size:13px">Submitted via joinrippl.com/practices</p>
    </div>
  `;

  try {
    await sgMail.send({
      to: NOTIFY_EMAIL,
      from: SENDGRID_FROM_EMAIL,
      replyTo: email,
      subject: `Demo Request: ${practice} (${name})`,
      html,
    });
    logger.info({ to: NOTIFY_EMAIL, practice }, "Demo request email sent");
    return res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err: message }, "Failed to send demo request email");
    return res.status(500).json({ error: "Failed to send email" });
  }
});

export default router;
