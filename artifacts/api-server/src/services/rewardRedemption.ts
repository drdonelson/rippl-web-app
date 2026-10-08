import { db } from "@workspace/db";
import {
  practicesTable,
  rewardClaimsTable,
  referrersTable,
  referralEventsTable,
  adminTasksTable,
  localPartnersTable,
} from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";
import type { AuthUser } from "../middleware/auth";
import { resolveTangoTemplate } from "../lib/practiceConfig";
import { sendAmazonRewardLink } from "./tango";
import { chargeGiftCardThreshold } from "./billingService";
import { logger } from "../lib/logger";

export class RewardError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function assertTenant(practiceId: string | null, actor?: AuthUser) {
  if (!practiceId)
    throw new RewardError(409, "Tenant ownership requires review");
  if (
    actor &&
    actor.role !== "super_admin" &&
    actor.practice_id !== practiceId
  ) {
    throw new RewardError(403, "forbidden");
  }
}

export function assertClaimable(claim: {
  status: string | null;
  expires_at: Date | null;
}) {
  if (claim.status === "claimed") throw new RewardError(409, "already_claimed");
  if (claim.status === "processing") throw new RewardError(409, "processing");
  if (claim.status !== "pending") throw new RewardError(410, "voided");
  if (claim.expires_at && claim.expires_at <= new Date())
    throw new RewardError(410, "expired");
}

// Shared by the public, authenticated, and legacy reward routes. Reserve durably BEFORE
// any external request. A crashed/uncertain operation stays processing with a review task;
// it must never be reset to pending simply because a request timed out.
export async function redeemReward(
  input: { token: string; reward_type: string; gift_card_brand?: string },
  actor?: AuthUser,
) {
  const { token, reward_type } = input;
  const reservation = await db.transaction(async (tx) => {
    const [claim] = await tx
      .select()
      .from(rewardClaimsTable)
      .where(eq(rewardClaimsTable.claim_token, token))
      .for("update");
    if (!claim) throw new RewardError(404, "Invalid token");
    assertTenant(claim.practice_id, actor);
    assertClaimable(claim);
    const [referrer] = await tx
      .select()
      .from(referrersTable)
      .where(eq(referrersTable.id, claim.referrer_id ?? ""));
    if (!referrer || referrer.practice_id !== claim.practice_id)
      throw new RewardError(409, "Referrer ownership requires review");
    const [event] = claim.referral_event_id
      ? await tx
          .select()
          .from(referralEventsTable)
          .where(eq(referralEventsTable.id, claim.referral_event_id))
      : [];
    if (
      claim.referral_event_id &&
      (!event ||
        event.practice_id !== claim.practice_id ||
        event.referrer_id !== referrer.id)
    ) {
      throw new RewardError(409, "Referral ownership requires review");
    }
    const [practice] = await tx
      .select()
      .from(practicesTable)
      .where(eq(practicesTable.id, claim.practice_id!));
    if (!practice) throw new RewardError(409, "Practice configuration missing");
    let amount = claim.reward_value;
    let label: string | null = null;
    let taskType: string | null = null;
    let pin: string | null = null;
    if (reward_type.startsWith("custom:")) {
      const cfg = practice.integration_config as {
        custom_rewards?: Array<{ id: string; label: string; value: number }>;
      } | null;
      const reward = cfg?.custom_rewards?.find(
        (r) => r.id === reward_type.slice(7),
      );
      if (!reward || !Number.isFinite(reward.value) || reward.value < 0)
        throw new RewardError(400, "Invalid reward_type");
      amount = reward.value;
      label = reward.label;
      taskType = "custom-reward";
    } else if (reward_type === "in-house-credit") {
      amount =
        practice.in_house_credit_value ??
        (practice.vertical === "dental" ? 100 : 0);
      if (amount <= 0)
        throw new RewardError(400, "Credit is not available for this practice");
      label = practice.in_house_credit_label ?? "Account credit";
      taskType = "apply-credit";
    } else if (reward_type === "charity") {
      taskType = "charity-donation";
    } else if (reward_type === "local-partner") {
      const [partner] = event?.office_id
        ? await tx
            .select({ id: localPartnersTable.id })
            .from(localPartnersTable)
            .where(
              and(
                eq(localPartnersTable.office_id, event.office_id),
                eq(localPartnersTable.active, true),
              ),
            )
            .limit(1)
        : [];
      if (!partner)
        throw new RewardError(400, "Local partner is not available");
      pin = String(Math.floor(1000 + Math.random() * 9000));
    } else if (reward_type !== "gift-card") {
      throw new RewardError(400, "Invalid reward_type");
    }
    if (!Number.isFinite(amount) || amount < 0)
      throw new RewardError(409, "Invalid reward amount");
    const taskId = crypto.randomUUID();
    await tx
      .update(rewardClaimsTable)
      .set({ status: "processing", reward_type, pin_code: pin })
      .where(eq(rewardClaimsTable.id, claim.id));
    await tx.insert(adminTasksTable).values({
      id: taskId,
      practice_id: claim.practice_id,
      referrer_id: referrer.id,
      referral_event_id: claim.referral_event_id,
      task_type: "reward-reconciliation",
      amount,
      notes: `Claim ${claim.id}: redemption started (${reward_type}). If interrupted, reconcile before fulfilment. For Tango, look up externalRefID ${claim.id}; never create a replacement order without checking.`,
      status: "pending",
    });
    return {
      claim,
      referrer,
      taskId,
      taskType,
      pin,
      amount,
      label,
      template: resolveTangoTemplate(practice),
    };
  });

  const { claim, referrer, taskId, pin, amount, label } = reservation;
  let orderId: string | null = null;
  let taskType = reservation.taskType;
  let notes = `Claim ${claim.id}: ${label ?? reward_type} for ${referrer.name}.`;
  if (reward_type === "gift-card") {
    if (!referrer.email) {
      taskType = "gift-card";
      notes = `Claim ${claim.id}: no email on file. No provider request was made. Arrange $${amount} fulfilment with the recipient.`;
    } else {
      const [firstName, ...lastName] = referrer.name.trim().split(/\s+/);
      const result = await sendAmazonRewardLink(
        {
          email: referrer.email,
          firstName: firstName || "Valued",
          lastName: lastName.join(" ") || "Patient",
        },
        amount,
        claim.id,
        reservation.template,
      );
      if (!result.success || !result.orderId) {
        // Provider errors can mean an accepted order whose response was lost. Keep the
        // reservation, not a second payable gift-card task. A support operator reconciles it.
        await db
          .update(adminTasksTable)
          .set({
            notes: `Claim ${claim.id}: provider outcome requires reconciliation (${result.error ?? "no order ID"}). Check Tango externalRefID ${claim.id}. Do not send a manual replacement until the outcome is known.`,
          })
          .where(eq(adminTasksTable.id, taskId));
        return {
          success: false as const,
          error: "processing",
          claim_id: claim.id,
        };
      }
      orderId = result.orderId;
    }
  }

  await db.transaction(async (tx) => {
    const [completed] = await tx
      .update(rewardClaimsTable)
      .set({
        status: "claimed",
        claimed_at: new Date(),
        tango_order_id: orderId,
      })
      .where(
        and(
          eq(rewardClaimsTable.id, claim.id),
          eq(rewardClaimsTable.status, "processing"),
        ),
      )
      .returning({ id: rewardClaimsTable.id });
    if (!completed)
      throw new RewardError(
        409,
        "Redemption state changed; reconciliation required",
      );
    await tx
      .update(adminTasksTable)
      .set(
        taskType
          ? { task_type: taskType, notes, status: "pending", completed: false }
          : {
              notes: `Claim ${claim.id}: fulfilment recorded${orderId ? ` as Tango order ${orderId}` : ""}.`,
              status: "completed",
              completed: true,
              completed_at: new Date(),
            },
      )
      .where(eq(adminTasksTable.id, taskId));
    if (claim.referral_event_id)
      await tx
        .update(referralEventsTable)
        .set({ status: "Reward Sent", reward_type })
        .where(eq(referralEventsTable.id, claim.referral_event_id));
    await tx
      .update(referrersTable)
      .set({
        total_rewards_issued: sql`${referrersTable.total_rewards_issued} + 1`,
      })
      .where(eq(referrersTable.id, referrer.id));
  });
  if (orderId)
    chargeGiftCardThreshold(claim.practice_id!, amount * 100).catch((err) =>
      logger.error(
        { err, claimId: claim.id },
        "Gift-card billing requires reconciliation",
      ),
    );
  return {
    success: true as const,
    reward_type,
    reward_value: amount,
    pin_code: pin,
    tango_order_id: orderId,
    admin_task_created: !!taskType,
    gift_card_brand:
      reward_type === "gift-card" ? (input.gift_card_brand ?? "Amazon") : null,
    referral_code: referrer.referral_code,
    custom_reward_label: label,
  };
}
