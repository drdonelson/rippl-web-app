import { Router, type IRouter } from "express";
import Stripe from "stripe";
import { db } from "@workspace/db";
import { practicesTable, referralEventsTable } from "@workspace/db/schema";
import { eq, and, gte, lt, inArray } from "drizzle-orm";
import { requireAuth, requireSuperAdmin } from "../middleware/auth";
import { logger } from "../lib/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-05-27.dahlia",
});

const APP_URL = (process.env.PUBLIC_APP_URL || process.env.APP_URL || "https://www.joinrippl.com").replace(/\/$/, "");

const router: IRouter = Router();

// GET /api/billing/config-check — super_admin only
// Verifies Stripe key is valid without doing anything billable
router.get("/config-check", requireAuth, requireSuperAdmin, async (_req, res) => {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!key) {
    res.status(500).json({ ok: false, error: "STRIPE_SECRET_KEY is not set" }); return;
  }
  if (!key.startsWith("sk_")) {
    res.status(500).json({ ok: false, error: `Key must start with sk_test_ or sk_live_, got: ${key.slice(0, 8)}…` }); return;
  }
  try {
    const acct = await stripe.accounts.retrieve();
    res.json({ ok: true, account_id: acct.id, livemode: acct.charges_enabled });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: msg });
  }
});

// POST /api/billing/create-setup-session — super_admin only
// Generates a Stripe Checkout setup URL for a practice to enter their card
router.post("/create-setup-session", requireAuth, requireSuperAdmin, async (req, res) => {
  const { practice_id } = req.body as { practice_id: string };
  if (!practice_id) { res.status(400).json({ error: "practice_id required" }); return; }

  const [practice] = await db.select().from(practicesTable).where(eq(practicesTable.id, practice_id)).limit(1);
  if (!practice) { res.status(404).json({ error: "Practice not found" }); return; }

  try {
    // Create or reuse Stripe customer
    let customerId = practice.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: practice.name,
        metadata: { practice_id: practice.id, slug: practice.slug },
      });
      customerId = customer.id;
      await db.update(practicesTable)
        .set({ stripe_customer_id: customerId })
        .where(eq(practicesTable.id, practice_id));
    }

    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      customer: customerId,
      currency: "usd",
      payment_method_types: ["card"],
      success_url: `${APP_URL}/billing/setup?session_id={CHECKOUT_SESSION_ID}&practice_id=${practice_id}`,
      cancel_url:  `${APP_URL}/billing/setup?cancelled=true&practice_id=${practice_id}`,
      metadata: { practice_id },
    });

    res.json({ url: session.url, session_id: session.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err, practice_id }, "[billing] create-setup-session failed");
    res.status(500).json({ error: "Failed to create billing session", detail: msg });
  }
});

// POST /api/billing/confirm-setup — public (called by practice after Stripe redirect)
router.post("/confirm-setup", async (req, res) => {
  const { session_id, practice_id } = req.body as { session_id: string; practice_id: string };
  if (!session_id || !practice_id) { res.status(400).json({ error: "session_id and practice_id required" }); return; }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["setup_intent"],
    });

    if (session.status !== "complete") {
      res.status(400).json({ error: "Session not yet complete" }); return;
    }

    const si = session.setup_intent as Stripe.SetupIntent;
    const paymentMethodId = typeof si.payment_method === "string"
      ? si.payment_method
      : si.payment_method?.id;

    if (!paymentMethodId) {
      res.status(400).json({ error: "No payment method on session" }); return;
    }

    await db.update(practicesTable)
      .set({ stripe_payment_method_id: paymentMethodId, billing_status: "active" })
      .where(eq(practicesTable.id, practice_id));

    logger.info({ practice_id, paymentMethodId }, "[billing] billing activated");
    res.json({ success: true });
  } catch (err) {
    logger.error({ err, session_id, practice_id }, "[billing] confirm-setup failed");
    res.status(500).json({ error: "Failed to confirm billing setup" });
  }
});

// POST /api/billing/charge-month — super_admin only
// Charges active practices for a given month's referrals
router.post("/charge-month", requireAuth, requireSuperAdmin, async (req, res) => {
  const { month, practice_id } = req.body as { month?: string; practice_id?: string };

  // Default to prior calendar month
  const now = new Date();
  const targetMonth = month ?? `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`;
  const [yr, mo] = targetMonth.split("-").map(Number);
  const periodStart = new Date(yr, mo - 1, 1);
  const periodEnd   = new Date(yr, mo,     1);

  try {
    const whereClause = practice_id
      ? and(eq(practicesTable.billing_status, "active"), eq(practicesTable.id, practice_id))
      : eq(practicesTable.billing_status, "active");

    const practices = await db.select().from(practicesTable).where(whereClause);

    const results: object[] = [];

    for (const practice of practices) {
      if (!practice.stripe_customer_id || !practice.stripe_payment_method_id) {
        results.push({ practice_id: practice.id, name: practice.name, status: "skipped", reason: "no payment method" });
        continue;
      }

      const completedStatuses = practice.vertical === "automotive"
        ? ["Completed", "Rewarded"]
        : ["Exam Completed", "Rewarded"];

      const events = await db
        .select({ id: referralEventsTable.id })
        .from(referralEventsTable)
        .where(and(
          eq(referralEventsTable.practice_id, practice.id),
          inArray(referralEventsTable.status, completedStatuses),
          gte(referralEventsTable.created_at, periodStart),
          lt(referralEventsTable.created_at, periodEnd),
        ));

      const referralCount = events.length;
      const monthlyFeeCents  = practice.monthly_fee ?? 0;           // already cents
      const perRefCents      = (practice.per_referral_fee ?? 0) * 100; // dollars → cents
      const totalCents       = monthlyFeeCents + referralCount * perRefCents;

      if (totalCents === 0) {
        results.push({ practice_id: practice.id, name: practice.name, status: "skipped", reason: "zero charges", referral_count: 0 });
        continue;
      }

      try {
        const pi = await stripe.paymentIntents.create({
          amount:         totalCents,
          currency:       "usd",
          customer:       practice.stripe_customer_id,
          payment_method: practice.stripe_payment_method_id,
          off_session:    true,
          confirm:        true,
          description:    `Rippl — ${practice.name} — ${targetMonth} (${referralCount} referrals)`,
          metadata: {
            practice_id:        practice.id,
            month:              targetMonth,
            referral_count:     String(referralCount),
            monthly_fee_cents:  String(monthlyFeeCents),
            per_ref_cents:      String(perRefCents),
          },
        });

        results.push({
          practice_id:       practice.id,
          name:              practice.name,
          status:            "charged",
          amount_cents:      totalCents,
          amount_dollars:    (totalCents / 100).toFixed(2),
          referral_count:    referralCount,
          payment_intent_id: pi.id,
        });
      } catch (chargeErr: unknown) {
        await db.update(practicesTable)
          .set({ billing_status: "failed" })
          .where(eq(practicesTable.id, practice.id));

        results.push({
          practice_id:    practice.id,
          name:           practice.name,
          status:         "failed",
          referral_count: referralCount,
          error:          chargeErr instanceof Error ? chargeErr.message : String(chargeErr),
        });
      }
    }

    res.json({ month: targetMonth, results });
  } catch (err) {
    logger.error({ err }, "[billing] charge-month failed");
    res.status(500).json({ error: "Billing run failed" });
  }
});

// GET /api/billing/status/:practiceId — super_admin only
router.get("/status/:practiceId", requireAuth, requireSuperAdmin, async (req, res) => {
  const { practiceId } = req.params;
  const [row] = await db
    .select({
      id:                       practicesTable.id,
      billing_status:           practicesTable.billing_status,
      stripe_customer_id:       practicesTable.stripe_customer_id,
      stripe_payment_method_id: practicesTable.stripe_payment_method_id,
    })
    .from(practicesTable)
    .where(eq(practicesTable.id, practiceId))
    .limit(1);

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

export default router;
