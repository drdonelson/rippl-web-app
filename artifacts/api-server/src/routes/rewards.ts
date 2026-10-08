import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { rewardClaimsTable, referralEventsTable } from "@workspace/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { CreateRewardBody } from "@workspace/api-zod";
import { getClaim, redeemClaim } from "./publicClaim";
import { assertTenant, RewardError } from "../services/rewardRedemption";

const router: IRouter = Router();
router.get("/by-token/:token", getClaim);
router.post("/claim", redeemClaim);

// Preserve the staff UI endpoint, but redeem the existing entitlement through the same
// reservation as the public link. Never manufacture a second $50 reward for an event.
router.post("/", async (req, res, next) => {
  const body = CreateRewardBody.parse(req.body);
  const [event] = await db.select().from(referralEventsTable).where(eq(referralEventsTable.id, body.referral_event_id));
  if (!event || event.referrer_id !== body.referrer_id) { res.status(404).json({ error: "Referral not found" }); return; }
  try { assertTenant(event.practice_id, req.authUser); }
  catch (err) { if (err instanceof RewardError) { res.status(err.status).json({ error: err.message }); return; } throw err; }
  const claims = await db.select().from(rewardClaimsTable).where(and(
    eq(rewardClaimsTable.referral_event_id, event.id), ne(rewardClaimsTable.status, "voided"),
  ));
  if (claims.length !== 1) { res.status(409).json({ error: "Reward entitlement requires review" }); return; }
  const types: Record<string, string> = { "amazon-gift-card": "gift-card", "charity-donation": "charity", "in-house-credit": "in-house-credit" };
  req.body = { token: claims[0].claim_token, reward_type: types[body.reward_type] ?? body.reward_type };
  await redeemClaim(req, res, next);
});
export default router;
