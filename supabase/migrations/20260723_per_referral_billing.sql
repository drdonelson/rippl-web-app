-- Per-referral billing: track Stripe charge per referral event as it fires
ALTER TABLE referral_events
  ADD COLUMN IF NOT EXISTS stripe_charge_id      TEXT,
  ADD COLUMN IF NOT EXISTS charged_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS charge_amount_cents    INTEGER;

-- Index for fast billing queries (find uncharged completed events)
CREATE INDEX IF NOT EXISTS idx_referral_events_stripe_charge
  ON referral_events (practice_id, status, stripe_charge_id)
  WHERE stripe_charge_id IS NULL;
