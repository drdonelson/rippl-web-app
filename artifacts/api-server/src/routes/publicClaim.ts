import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  rewardClaimsTable,
  referralEventsTable,
  referrersTable,
  adminTasksTable,
  localPartnersTable,
} from "@workspace/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { sendAmazonRewardLink } from "../services/tango";

const router: IRouter = Router();

// ── GET /api/claim/by-token/:token ────────────────────────────────────────────
// Validate a claim token and return everything needed to render the reward page.
// No auth — patients open this from their phone without a Rippl account.
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
    db.select().from(referrersTable)
      .where(eq(referrersTable.id, claim.referrer_id!))
      .then(r => r[0] ?? null),
    claim.referral_event_id
      ? db.select().from(referralEventsTable)
          .where(eq(referralEventsTable.id, claim.referral_event_id))
          .then(r => r[0] ?? null)
      : Promise.resolve(null),
  ]);

  let localPartner = null;
  const officeId = referral?.office_id ?? null;
  if (officeId) {
    const [partner] = await db
      .select()
      .from(localPartnersTable)
      .where(and(
        eq(localPartnersTable.office_id, officeId),
        eq(localPartnersTable.active, true),
      ))
      .limit(1);
    localPartner = partner ?? null;
  }

  res.json({ claim, referrer, referral, localPartner });
});

// ── POST /api/claim ───────────────────────────────────────────────────────────
// Process the patient's reward selection and mark the claim as used.
// No auth — token is the sole credential.
router.post("/", async (req, res) => {
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
    res.status(400).json({ error: `Invalid reward_type` });
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

  const rewardValue    = claim.reward_value;
  let pinCode: string | null = null;
  let tangoOrderId: string | null = null;
  let adminTaskCreated = false;

  // Helper: only include referral_event_id when it's non-null (column has NOT NULL constraint)
  const maybeEventId = claim.referral_event_id
    ? { referral_event_id: claim.referral_event_id }
    : {};

  if (reward_type === "gift-card") {
    // Always attempt Tango using the referrer's email from the referrers table.
    // Only fall back to an admin_task if Tango fails or there is genuinely no email.
    const referrerEmail = referrer.email ?? null;
    let tangoResult: { success: boolean; orderId?: string; error?: string } | null = null;

    if (referrerEmail) {
      const nameParts = referrer.name?.trim().split(" ") ?? ["Valued", "Patient"];
      tangoResult = await sendAmazonRewardLink(
        {
          email:     referrerEmail,
          firstName: nameParts[0] ?? "Valued",
          lastName:  nameParts.slice(1).join(" ") || "Patient",
        },
        rewardValue,
        claim.id,
      );
    }

    if (tangoResult?.success && tangoResult.orderId) {
      tangoOrderId = tangoResult.orderId;
    } else {
      const failReason = !referrerEmail
        ? `No email on file for referrer.`
        : `Tango failed: ${tangoResult?.error ?? "unknown"}.`;
      await db.insert(adminTasksTable).values({
        task_type:   "gift-card",
        referrer_id: claim.referrer_id!,
        ...maybeEventId,
        amount:      rewardValue,
        notes:       `${failReason} Brand: ${gift_card_brand ?? "Amazon"}. Send $${rewardValue} gift card manually.`,
        status:      "pending",
      });
      adminTaskCreated = true;
    }
  } else if (reward_type === "local-partner") {
    pinCode = Math.floor(1000 + Math.random() * 9000).toString();
  } else if (reward_type === "in-house-credit") {
    await db.insert(adminTasksTable).values({
      task_type:   "apply-credit",
      referrer_id: claim.referrer_id!,
      ...maybeEventId,
      amount:      100,
      notes:       `Apply $100 dental credit to account: ${referrer.name}.`,
      status:      "pending",
    });
    adminTaskCreated = true;
  } else if (reward_type === "charity") {
    await db.insert(adminTasksTable).values({
      task_type:   "charity-donation",
      referrer_id: claim.referrer_id!,
      ...maybeEventId,
      amount:      rewardValue,
      notes:       `Donate $${rewardValue} to charity in ${referrer.name}'s name. Email: ${referrer.email ?? "none on file"}.`,
      status:      "pending",
    });
    adminTaskCreated = true;
  }

  await db
    .update(rewardClaimsTable)
    .set({
      status:         "claimed",
      claimed_at:     new Date(),
      reward_type,
      pin_code:       pinCode,
      tango_order_id: tangoOrderId,
    })
    .where(eq(rewardClaimsTable.id, claim.id));

  if (claim.referral_event_id) {
    await db
      .update(referralEventsTable)
      .set({ status: "Reward Sent", reward_type })
      .where(eq(referralEventsTable.id, claim.referral_event_id));
  }

  await db
    .update(referrersTable)
    .set({ total_rewards_issued: sql`${referrersTable.total_rewards_issued} + 1` })
    .where(eq(referrersTable.id, referrer.id));

  req.log.info({ referrerId: referrer.id, reward_type, rewardValue }, "Reward claimed");

  res.status(200).json({
    success:            true,
    reward_type,
    reward_value:       reward_type === "in-house-credit" ? 100 : rewardValue,
    pin_code:           pinCode,
    tango_order_id:     tangoOrderId,
    admin_task_created: adminTaskCreated,
    gift_card_brand:    reward_type === "gift-card" ? (gift_card_brand ?? "Amazon") : null,
    referral_code:      referrer.referral_code,
  });
});

export default router;
