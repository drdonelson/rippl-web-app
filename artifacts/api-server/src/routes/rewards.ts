import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { rewardsTable, referralEventsTable, referrersTable, adminTasksTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { CreateRewardBody } from "@workspace/api-zod";
import { sendAmazonRewardLink } from "../services/tango";

const router: IRouter = Router();

router.post("/", async (req, res) => {
  const body = CreateRewardBody.parse(req.body);

  // Look up referrer details (needed for Tango fulfilment)
  const [referrer] = await db
    .select()
    .from(referrersTable)
    .where(eq(referrersTable.id, body.referrer_id));

  if (!referrer) {
    res.status(404).json({ error: "Referrer not found" });
    return;
  }

  // Look up the event's office_id so we can tag the reward to the same office
  const [event] = await db
    .select({ office_id: referralEventsTable.office_id })
    .from(referralEventsTable)
    .where(eq(referralEventsTable.id, body.referral_event_id));

  // Insert the reward record (initially unfulfilled)
  const [reward] = await db.insert(rewardsTable).values({
    referrer_id:        body.referrer_id,
    referral_event_id:  body.referral_event_id,
    reward_type:        body.reward_type,
    fulfilled:          false,
    office_id:          event?.office_id ?? null,
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

  // ── Fulfilment logic per reward type ──────────────────────────────────────

  if (body.reward_type === "amazon-gift-card") {
    // Automatically fulfil via Tango Reward Link if referrer has an email
    if (referrer.email) {
      const nameParts = referrer.name?.trim().split(" ") ?? ["Valued", "Patient"];
      const firstName = nameParts[0] ?? "Valued";
      const lastName  = nameParts.slice(1).join(" ") || "Patient";

      const tangoResult = await sendAmazonRewardLink(
        { email: referrer.email, firstName, lastName },
        50,
        reward.id
      );

      if (tangoResult.success && tangoResult.orderId) {
        // Mark fulfilled and store Tango order ID
        await db
          .update(rewardsTable)
          .set({ fulfilled: true, tango_order_id: tangoResult.orderId })
          .where(eq(rewardsTable.id, reward.id));

        reward.fulfilled     = true;
        reward.tango_order_id = tangoResult.orderId;
        req.log.info({ orderId: tangoResult.orderId, referrerId: body.referrer_id }, "Tango gift card sent");
      } else {
        // Tango failed — create an admin task for manual follow-up
        await db.insert(adminTasksTable).values({
          task_type:          "amazon-gift-card",
          referrer_id:        body.referrer_id,
          referral_event_id:  body.referral_event_id,
          amount:             50,
          notes:              `Tango auto-delivery failed: ${tangoResult.error ?? "unknown error"}. Send gift card manually.`,
          completed:          false,
        });
        req.log.warn({ error: tangoResult.error, referrerId: body.referrer_id }, "Tango failed — admin task created");
      }
    } else {
      // No email on file — create admin task
      await db.insert(adminTasksTable).values({
        task_type:          "amazon-gift-card",
        referrer_id:        body.referrer_id,
        referral_event_id:  body.referral_event_id,
        amount:             50,
        notes:              "Referrer has no email address on file. Deliver gift card manually.",
        completed:          false,
      });
      req.log.warn({ referrerId: body.referrer_id }, "No referrer email — admin task created for gift card");
    }
  }

  if (body.reward_type === "charity-donation") {
    // Create admin task for manual charity processing
    await db.insert(adminTasksTable).values({
      task_type:          "charity-donation",
      referrer_id:        body.referrer_id,
      referral_event_id:  body.referral_event_id,
      amount:             50,
      notes:              "Manually process $50 charity donation on behalf of referrer.",
      completed:          false,
    });
    req.log.info({ referralEventId: body.referral_event_id }, "Admin task created for charity-donation");
  }

  res.status(201).json(reward);
});

export default router;
