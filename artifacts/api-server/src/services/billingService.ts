import Stripe from "stripe";
import { db } from "@workspace/db";
import { referralEventsTable, practicesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-05-27.dahlia",
});

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
