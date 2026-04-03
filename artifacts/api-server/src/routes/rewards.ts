import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  rewardsTable,
  referralEventsTable,
  referrersTable,
  adminTasksTable,
  rewardClaimsTable,
  localPartnersTable,
} from "@workspace/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { CreateRewardBody } from "@workspace/api-zod";
import { sendAmazonRewardLink } from "../services/tango";

const router: IRouter = Router();

// ── GET /api/rewards/by-token/:token ─────────────────────────────────────────
// Patient-facing: validates a claim token and returns everything needed to
// render the reward selection page.
router.get("/by-token/:token", async (req, res) => {
  const { token } = req.params;

  if (!token) {
    res.status(400).json({ error: "invalid" });
    return;
  }

  const [claim] = await db
    .select()
    .from(rewardClaimsTable)
    .where(eq(rewardClaimsTable.claim_token, token));

  if (!claim) {
    res.status(404).json({ error: "invalid" });
    return;
  }

  if (claim.expires_at && new Date() > new Date(claim.expires_at)) {
    res.status(410).json({ error: "expired", expiresAt: claim.expires_at });
    return;
  }

  if (claim.status === "claimed") {
    res.status(409).json({ error: "already_claimed", claimedAt: claim.claimed_at });
    return;
  }

  const [referrer, referral] = await Promise.all([
    db.select().from(referrersTable).where(eq(referrersTable.id, claim.referrer_id!)).then(r => r[0] ?? null),
    db.select().from(referralEventsTable).where(eq(referralEventsTable.id, claim.referral_event_id!)).then(r => r[0] ?? null),
  ]);

  let localPartner = null;
  if (referral?.office_id) {
    const [partner] = await db
      .select()
      .from(localPartnersTable)
      .where(and(
        eq(localPartnersTable.office_id, referral.office_id),
        eq(localPartnersTable.active, true),
      ))
      .limit(1);
    localPartner = partner ?? null;
  }

  res.json({ claim, referrer, referral, localPartner });
});

// ── POST /api/rewards/claim ───────────────────────────────────────────────────
// Patient-facing: processes the reward selection and marks the claim as used.
router.post("/claim", async (req, res) => {
  const { token, reward_type, gift_card_brand } = req.body as {
    token: string;
    reward_type: string;
    gift_card_brand?: string;
  };

  if (!token || !reward_type) {
    res.status(400).json({ error: "token and reward_type are required" });
    return;
  }

  const validTypes = ["gift-card", "local-partner", "in-house-credit", "charity"];
  if (!validTypes.includes(reward_type)) {
    res.status(400).json({ error: `Invalid reward_type. Must be one of: ${validTypes.join(", ")}` });
    return;
  }

  const [claim] = await db
    .select()
    .from(rewardClaimsTable)
    .where(eq(rewardClaimsTable.claim_token, token));

  if (!claim) {
    res.status(404).json({ error: "Invalid token" });
    return;
  }

  if (claim.status === "claimed") {
    res.status(409).json({ error: "already_claimed", claimedAt: claim.claimed_at });
    return;
  }

  if (claim.expires_at && new Date() > new Date(claim.expires_at)) {
    res.status(410).json({ error: "expired" });
    return;
  }

  const [referrer] = await db
    .select()
    .from(referrersTable)
    .where(eq(referrersTable.id, claim.referrer_id!));

  if (!referrer) {
    res.status(404).json({ error: "Referrer not found" });
    return;
  }

  const rewardValue = claim.reward_value;
  let pinCode: string | null = null;
  let tangoOrderId: string | null = null;
  let adminTaskCreated = false;

  // ── Fulfilment per reward type ────────────────────────────────────────────

  if (reward_type === "gift-card") {
    if (referrer.email) {
      const nameParts = referrer.name?.trim().split(" ") ?? ["Valued", "Patient"];
      const firstName = nameParts[0] ?? "Valued";
      const lastName  = nameParts.slice(1).join(" ") || "Patient";
      const brand     = gift_card_brand ?? "Amazon";

      const tangoResult = await sendAmazonRewardLink(
        { email: referrer.email, firstName, lastName },
        rewardValue,
        claim.id,
      );

      if (tangoResult.success && tangoResult.orderId) {
        tangoOrderId = tangoResult.orderId;
        req.log.info({ orderId: tangoResult.orderId, brand }, "Tango gift card sent");
      } else {
        await db.insert(adminTasksTable).values({
          task_type:         "gift-card",
          referrer_id:       claim.referrer_id!,
          referral_event_id: claim.referral_event_id!,
          amount:            rewardValue,
          notes:             `Tango auto-delivery failed: ${tangoResult.error ?? "unknown"}. Brand: ${brand}. Send $${rewardValue} gift card manually.`,
          completed:         false,
        });
        adminTaskCreated = true;
        req.log.warn({ error: tangoResult.error }, "Tango failed — admin task created");
      }
    } else {
      const brand = gift_card_brand ?? "Amazon";
      await db.insert(adminTasksTable).values({
        task_type:         "gift-card",
        referrer_id:       claim.referrer_id!,
        referral_event_id: claim.referral_event_id!,
        amount:            rewardValue,
        notes:             `No email on file. Brand: ${brand}. Deliver $${rewardValue} gift card manually.`,
        completed:         false,
      });
      adminTaskCreated = true;
      req.log.warn({ referrerId: referrer.id }, "No referrer email — admin task created for gift card");
    }
  } else if (reward_type === "local-partner") {
    pinCode = Math.floor(1000 + Math.random() * 9000).toString();
    req.log.info({ pin: pinCode, referrerId: referrer.id }, "Local partner PIN generated");
  } else if (reward_type === "in-house-credit") {
    await db.insert(adminTasksTable).values({
      task_type:         "apply-credit",
      referrer_id:       claim.referrer_id!,
      referral_event_id: claim.referral_event_id!,
      amount:            100,
      notes:             `Apply $100 dental credit to patient account (${referrer.name}).`,
      completed:         false,
    });
    adminTaskCreated = true;
  } else if (reward_type === "charity") {
    await db.insert(adminTasksTable).values({
      task_type:         "charity-donation",
      referrer_id:       claim.referrer_id!,
      referral_event_id: claim.referral_event_id!,
      amount:            rewardValue,
      notes:             `Donate $${rewardValue} to charity in ${referrer.name}'s name. Send confirmation email to ${referrer.email ?? "patient (no email on file)"}.`,
      completed:         false,
    });
    adminTaskCreated = true;
  }

  // ── Mark claim as used ────────────────────────────────────────────────────
  await db
    .update(rewardClaimsTable)
    .set({
      status:        "claimed",
      claimed_at:    new Date(),
      reward_type,
      pin_code:      pinCode,
      tango_order_id: tangoOrderId,
    })
    .where(eq(rewardClaimsTable.id, claim.id));

  // Update referral event to "Reward Sent"
  if (claim.referral_event_id) {
    await db
      .update(referralEventsTable)
      .set({ status: "Reward Sent", reward_type })
      .where(eq(referralEventsTable.id, claim.referral_event_id));
  }

  // Increment referrer's total_rewards_issued
  await db
    .update(referrersTable)
    .set({ total_rewards_issued: sql`${referrersTable.total_rewards_issued} + 1` })
    .where(eq(referrersTable.id, referrer.id));

  req.log.info({ referrerId: referrer.id, reward_type, rewardValue }, "Reward claimed successfully");

  res.status(200).json({
    success:            true,
    reward_type,
    reward_value:       reward_type === "in-house-credit" ? 100 : rewardValue,
    pin_code:           pinCode,
    tango_order_id:     tangoOrderId,
    admin_task_created: adminTaskCreated,
    gift_card_brand:    reward_type === "gift-card" ? (gift_card_brand ?? "Amazon") : null,
  });
});

// ── POST /api/rewards (legacy — kept for backward compatibility) ───────────────
router.post("/", async (req, res) => {
  const body = CreateRewardBody.parse(req.body);

  const [referrer] = await db
    .select()
    .from(referrersTable)
    .where(eq(referrersTable.id, body.referrer_id));

  if (!referrer) {
    res.status(404).json({ error: "Referrer not found" });
    return;
  }

  const [event] = await db
    .select({ office_id: referralEventsTable.office_id })
    .from(referralEventsTable)
    .where(eq(referralEventsTable.id, body.referral_event_id));

  const [reward] = await db.insert(rewardsTable).values({
    referrer_id:       body.referrer_id,
    referral_event_id: body.referral_event_id,
    reward_type:       body.reward_type,
    fulfilled:         false,
    office_id:         event?.office_id ?? null,
  }).returning();

  await db
    .update(referralEventsTable)
    .set({ status: "Reward Sent", reward_type: body.reward_type })
    .where(eq(referralEventsTable.id, body.referral_event_id));

  await db
    .update(referrersTable)
    .set({ total_rewards_issued: sql`${referrersTable.total_rewards_issued} + 1` })
    .where(eq(referrersTable.id, body.referrer_id));

  if (body.reward_type === "amazon-gift-card") {
    if (referrer.email) {
      const nameParts = referrer.name?.trim().split(" ") ?? ["Valued", "Patient"];
      const firstName = nameParts[0] ?? "Valued";
      const lastName  = nameParts.slice(1).join(" ") || "Patient";

      const tangoResult = await sendAmazonRewardLink(
        { email: referrer.email, firstName, lastName },
        50,
        reward.id,
      );

      if (tangoResult.success && tangoResult.orderId) {
        await db
          .update(rewardsTable)
          .set({ fulfilled: true, tango_order_id: tangoResult.orderId })
          .where(eq(rewardsTable.id, reward.id));
        reward.fulfilled      = true;
        reward.tango_order_id = tangoResult.orderId;
      } else {
        await db.insert(adminTasksTable).values({
          task_type:         "amazon-gift-card",
          referrer_id:       body.referrer_id,
          referral_event_id: body.referral_event_id,
          amount:            50,
          notes:             `Tango auto-delivery failed: ${tangoResult.error ?? "unknown error"}. Send gift card manually.`,
          completed:         false,
        });
      }
    } else {
      await db.insert(adminTasksTable).values({
        task_type:         "amazon-gift-card",
        referrer_id:       body.referrer_id,
        referral_event_id: body.referral_event_id,
        amount:            50,
        notes:             "Referrer has no email address on file. Deliver gift card manually.",
        completed:         false,
      });
    }
  }

  if (body.reward_type === "charity-donation") {
    await db.insert(adminTasksTable).values({
      task_type:         "charity-donation",
      referrer_id:       body.referrer_id,
      referral_event_id: body.referral_event_id,
      amount:            50,
      notes:             "Manually process $50 charity donation on behalf of referrer.",
      completed:         false,
    });
  }

  res.status(201).json(reward);
});

export default router;
