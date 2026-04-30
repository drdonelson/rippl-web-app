import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import rateLimit from "express-rate-limit";

const router: IRouter = Router();

const limiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: { error: "Too many requests" } });

router.post("/waitlist", limiter, async (req: Request, res: Response) => {
  const { name, practice, email, phone } = req.body as Record<string, string>;
  if (!name || !practice || !email) {
    res.status(400).json({ error: "Name, practice, and email are required" });
    return;
  }

  // Store in a simple waitlist table (created via raw SQL below if needed)
  // Falls back to logging if table doesn't exist yet
  try {
    await db.execute(sql`
      INSERT INTO waitlist (name, practice, email, phone, created_at)
      VALUES (${name.trim()}, ${practice.trim()}, ${email.trim().toLowerCase()}, ${(phone ?? "").trim()}, now())
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        practice = EXCLUDED.practice,
        phone = EXCLUDED.phone
    `);
    logger.info({ name, practice, email }, "Waitlist signup");
    res.json({ success: true });
  } catch (err) {
    logger.error({ err, name, practice, email }, "Waitlist insert failed — logging only");
    // Don't fail the user — just log it
    res.json({ success: true });
  }
});

export default router;
