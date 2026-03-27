import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { rewardsTable, referralEventsTable, referrersTable, adminTasksTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { CreateRewardBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/", async (req, res) => {
  const body = CreateRewardBody.parse(req.body);

  const [reward] = await db.insert(rewardsTable).values({
    referrer_id: body.referrer_id,
    referral_event_id: body.referral_event_id,
    reward_type: body.reward_type,
    fulfilled: false,
  }).returning();

  // Update referral event status to Reward Sent and set reward_type
  await db
    .update(referralEventsTable)
    .set({ status: "Reward Sent", reward_type: body.reward_type })
    .where(eq(referralEventsTable.id, body.referral_event_id));

  // Increment referrer's total_rewards_issued
  await db
    .update(referrersTable)
    .set({ total_rewards_issued: sql`${referrersTable.total_rewards_issued} + 1` })
    .where(eq(referrersTable.id, body.referrer_id));

  // For charity-donation, create an admin task for manual processing
  if (body.reward_type === "charity-donation") {
    await db.insert(adminTasksTable).values({
      task_type: "charity-donation",
      referrer_id: body.referrer_id,
      referral_event_id: body.referral_event_id,
      amount: 50,
      notes: "Manually process $50 charity donation on behalf of referrer.",
      completed: false,
    });
    req.log.info({ referralEventId: body.referral_event_id }, "Admin task created for charity-donation");
  }

  res.status(201).json(reward);
});

export default router;
