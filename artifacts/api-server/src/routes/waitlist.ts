import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { waitlistTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAuth, requireSuperAdmin } from "../middleware/auth";
import rateLimit from "express-rate-limit";

const router: IRouter = Router();

const limiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: { error: "Too many requests" } });

router.post("/waitlist", limiter, async (req: Request, res: Response) => {
  const { name, practice, email, phone } = req.body as Record<string, string>;
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
      })
      .onConflictDoUpdate({
        target: waitlistTable.email,
        set: {
          name:     name.trim(),
          practice: practice.trim(),
          phone:    (phone ?? "").trim(),
        },
      });
    logger.info({ name, practice, email }, "Waitlist signup");
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
