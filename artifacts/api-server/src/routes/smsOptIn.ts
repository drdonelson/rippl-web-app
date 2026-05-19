import { Router, type IRouter, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const limiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: "Too many requests" } });

// POST /api/sms-opt-in — public patient self-enrollment for SMS program
// Records the consent event; staff confirmation required to enroll in referral system.
router.post("/sms-opt-in", limiter, async (req: Request, res: Response) => {
  const { name, phone } = req.body as Record<string, string>;

  if (!name?.trim()) {
    res.status(400).json({ error: "Name is required." });
    return;
  }
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length !== 11 || !digits.startsWith("1")) {
    res.status(400).json({ error: "Valid U.S. phone number is required." });
    return;
  }

  logger.info({ name: name.trim(), phone: `+${digits}` }, "SMS opt-in submission");
  res.json({ success: true });
});

export default router;
