import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// POST /api/webhooks/vagaro
// Vagaro uses webhooks to push appointment events — no polling needed.
// Logs the full payload for debugging; full processing implemented after API access.
router.post("/vagaro", (req, res) => {
  logger.info({ body: req.body, headers: req.headers }, "[webhook/vagaro] Incoming payload");
  // TODO: validate Vagaro webhook signature using req.headers["x-vagaro-signature"]
  // TODO: detect first completed appointments and fire referral events for salon practices
  res.status(200).json({ received: true });
});

// POST /api/webhooks/manual/:officeId
// Generic manual trigger — allows any practice to fire a referral event by HTTP POST.
// Useful for "Other" vertical practices with custom workflows.
router.post("/manual/:officeId", (req, res) => {
  const { officeId } = req.params;
  logger.info({ officeId, body: req.body }, "[webhook/manual] Manual referral trigger received");
  // TODO: validate a shared secret, create referral_event + reward_claim
  res.status(200).json({ received: true, officeId });
});

export default router;
