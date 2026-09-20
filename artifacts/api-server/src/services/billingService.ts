import Stripe from "stripe";
import { db } from "@workspace/db";
import { referralEventsTable, practicesTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

// Lazy singleton — only initialize when first needed so a missing key
// doesn't crash the server at startup.
let _stripe: Stripe | null = null;
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!_stripe) {
    _stripe = new Stripe(key, { apiVersion: "2026-05-27.dahlia" });
  }
  return _stripe;
}

/**
 * Charge the practice's card on file for a single completed referral.
 * Idempotent — skips if already charged. Never throws — billing failures
 * are logged but must not interrupt the referral reward flow.
 */
export async function chargeReferralCompletion(eventId: string): Promise<void> {
  try {
    const [row] = await db
      .select({
        stripe_charge_id:          referralEventsTable.stripe_charge_id,
        practice_id:               referralEventsTable.practice_id,
        billing_status:            practicesTable.billing_status,
        stripe_customer_id:        practicesTable.stripe_customer_id,
        stripe_payment_method_id:  practicesTable.stripe_payment_method_id,
        per_referral_fee:          practicesTable.per_referral_fee,
        practice_name:             practicesTable.name,
      })
      .from(referralEventsTable)
      .leftJoin(practicesTable, eq(referralEventsTable.practice_id, practicesTable.id))
      .where(eq(referralEventsTable.id, eventId))
      .limit(1);

    if (!row) {
      logger.warn({ eventId }, "[billing] chargeReferralCompletion: event not found");
      return;
    }

    // Already charged — idempotent exit
    if (row.stripe_charge_id) {
      logger.info({ eventId, chargeId: row.stripe_charge_id }, "[billing] Already charged, skipping");
      return;
    }

    // Practice not configured for billing
    if (!row.practice_id || row.billing_status !== "active") {
      logger.info(
        { eventId, practiceId: row.practice_id, billing_status: row.billing_status },
        "[billing] Practice not active for billing — skipping charge"
      );
      return;
    }

    if (!row.stripe_customer_id || !row.stripe_payment_method_id) {
      logger.info({ eventId }, "[billing] No payment method on file — skipping charge");
      return;
    }

    const amountCents = (row.per_referral_fee ?? 0) * 100;
    if (amountCents === 0) {
      logger.info({ eventId }, "[billing] Per-referral fee is $0 — skipping charge");
      return;
    }

    const stripe = getStripe();
    if (!stripe) {
      logger.warn({ eventId }, "[billing] STRIPE_SECRET_KEY not set — skipping charge");
      return;
    }

    const pi = await stripe.paymentIntents.create(
      {
        amount:         amountCents,
        currency:       "usd",
        customer:       row.stripe_customer_id,
        payment_method: row.stripe_payment_method_id,
        off_session:    true,
        confirm:        true,
        description:    `Rippl referral — ${row.practice_name ?? "unknown"}`,
        metadata: {
          referral_event_id: eventId,
          practice_id:       row.practice_id,
        },
      },
      { idempotencyKey: `referral-charge-${eventId}` }
    );

    await db
      .update(referralEventsTable)
      .set({
        stripe_charge_id:    pi.id,
        charged_at:          new Date(),
        charge_amount_cents: amountCents,
      })
      .where(eq(referralEventsTable.id, eventId));

    logger.info(
      { eventId, paymentIntentId: pi.id, amountCents, practice: row.practice_name },
      "[billing] Per-referral charge succeeded"
    );
  } catch (err) {
    // Log but never rethrow — billing must not block the referral flow
    logger.error({ err, eventId }, "[billing] chargeReferralCompletion failed");
  }
}

/**
 * Track gift card pass-through cost and auto-charge when the $100 threshold is hit.
 * Never throws — billing must not block gift card delivery.
 */
export async function chargeGiftCardThreshold(practiceId: string, amountCents: number): Promise<void> {
  try {
    const [practice] = await db
      .select({
        billing_status:            practicesTable.billing_status,
        stripe_customer_id:        practicesTable.stripe_customer_id,
        stripe_payment_method_id:  practicesTable.stripe_payment_method_id,
        name:                      practicesTable.name,
      })
      .from(practicesTable)
      .where(eq(practicesTable.id, practiceId))
      .limit(1);

    if (!practice) {
      logger.warn({ practiceId }, "[billing:gc] Practice not found");
      return;
    }

    if (practice.billing_status !== "active") {
      logger.info({ practiceId, billing_status: practice.billing_status }, "[billing:gc] Practice not active — skipping gift card threshold tracking");
      return;
    }

    if (!practice.stripe_customer_id || !practice.stripe_payment_method_id) {
      logger.info({ practiceId }, "[billing:gc] No payment method on file — skipping");
      return;
    }

    // Atomically increment balance and return new values
    const [updated] = await db
      .update(practicesTable)
      .set({ gift_card_balance_cents: sql`${practicesTable.gift_card_balance_cents} + ${amountCents}` })
      .where(eq(practicesTable.id, practiceId))
      .returning({
        gift_card_balance_cents:   practicesTable.gift_card_balance_cents,
        gift_card_threshold_cents: practicesTable.gift_card_threshold_cents,
      });

    if (!updated) return;

    const { gift_card_balance_cents, gift_card_threshold_cents } = updated;
    logger.info({ practiceId, gift_card_balance_cents, gift_card_threshold_cents, addedCents: amountCents }, "[billing:gc] Balance updated");

    if (gift_card_balance_cents < gift_card_threshold_cents) return;

    // Threshold reached — charge the accumulated balance
    const stripe = getStripe();
    if (!stripe) {
      logger.warn({ practiceId }, "[billing:gc] STRIPE_SECRET_KEY not set — skipping charge");
      return;
    }

    const pi = await stripe.paymentIntents.create(
      {
        amount:         gift_card_balance_cents,
        currency:       "usd",
        customer:       practice.stripe_customer_id,
        payment_method: practice.stripe_payment_method_id,
        off_session:    true,
        confirm:        true,
        description:    `Rippl gift card pass-through — ${practice.name ?? "unknown"}`,
        metadata: {
          practice_id: practiceId,
          type:        "gift_card_passthrough",
        },
      },
      { idempotencyKey: `gc-threshold-${practiceId}-${Date.now()}` }
    );

    // Reset balance on success
    await db
      .update(practicesTable)
      .set({ gift_card_balance_cents: 0 })
      .where(eq(practicesTable.id, practiceId));

    logger.info(
      { practiceId, paymentIntentId: pi.id, chargedCents: gift_card_balance_cents, practice: practice.name },
      "[billing:gc] Gift card threshold charge succeeded — balance reset"
    );
  } catch (err) {
    logger.error({ err, practiceId }, "[billing:gc] chargeGiftCardThreshold failed");

    // Mark billing failed so super_admin can investigate; don't reset balance
    await db
      .update(practicesTable)
      .set({ billing_status: "failed" })
      .where(eq(practicesTable.id, practiceId))
      .catch(dbErr => logger.error({ dbErr, practiceId }, "[billing:gc] Failed to mark billing_status=failed"));
  }
}
