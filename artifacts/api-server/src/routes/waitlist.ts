import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { waitlistTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAuth, requireSuperAdmin } from "../middleware/auth";
import { sendEmail } from "../lib/email";
import rateLimit from "express-rate-limit";

const NOTIFY_EMAIL = "david@joinrippl.com";

const router: IRouter = Router();

const limiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: { error: "Too many requests" } });

router.post("/waitlist", limiter, async (req: Request, res: Response) => {
  const { name, practice, email, phone, source, emr } = req.body as Record<string, string>;
  if (!name || !practice || !email) {
    res.status(400).json({ error: "Name, practice, and email are required" });
    return;
  }

  try {
    await db
      .insert(waitlistTable)
      .values({
        name:     name.trim(),
        practice: practice.trim(),
        email:    email.trim().toLowerCase(),
        phone:    (phone ?? "").trim(),
        source:   (source ?? "").trim() || null,
        emr:      (emr ?? "").trim() || null,
      })
      .onConflictDoUpdate({
        target: waitlistTable.email,
        set: {
          name:     name.trim(),
          practice: practice.trim(),
          phone:    (phone ?? "").trim(),
          source:   (source ?? "").trim() || null,
          emr:      (emr ?? "").trim() || null,
        },
      });

    logger.info({ name, practice, email, source, emr }, "Waitlist signup");

    // Fire-and-forget notification — don't block the response
    const sourceLabel = source === "dental-collective-demo"     ? "DC — Demo Request"
                      : source === "dental-collective-waitlist" ? "DC — Non-OD Waitlist"
                      : source === "dental-collective"          ? "DC — Get Started"
                      : source ?? "Direct";
    sendEmail({
      to:      NOTIFY_EMAIL,
      from:    { email: "noreply@joinrippl.com", name: "Rippl" },
      subject: `New signup: ${name} · ${practice} (${sourceLabel})`,
      html: `
        <p><strong>New Rippl signup</strong></p>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
          <tr><td style="padding:4px 12px 4px 0;color:#666">Name</td><td><strong>${name}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Practice</td><td>${practice}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Email</td><td>${email}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Phone</td><td>${phone || "—"}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">EMR</td><td>${emr || "—"}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Source</td><td>${sourceLabel}</td></tr>
        </table>
      `,
      text: `New signup: ${name} · ${practice} · ${email} · ${phone || "no phone"} · EMR: ${emr || "not specified"} · Source: ${sourceLabel}`,
    }).catch(err => logger.error({ err }, "Waitlist notification email failed"));

    res.json({ success: true });
  } catch (err) {
    logger.error({ err, name, practice, email }, "Waitlist insert failed");
    res.status(500).json({ error: "Failed to save. Please try again." });
  }
});

// GET /admin/waitlist-leads — super_admin only
router.get("/waitlist-leads", requireAuth, requireSuperAdmin, async (_req: Request, res: Response) => {
  try {
    const leads = await db
      .select()
      .from(waitlistTable)
      .orderBy(desc(waitlistTable.created_at));
    res.json(leads);
  } catch (err) {
    logger.error({ err }, "Failed to fetch waitlist leads");
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

export default router;
