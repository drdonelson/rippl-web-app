-- Applied to prod: 2026-09-02
-- Adds Stripe billing + channel partner columns to practices.
-- Already included in 001_baseline.sql for fresh installs.

ALTER TABLE practices
  ADD COLUMN IF NOT EXISTS channel_partner_id       text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id       text,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id text,
  ADD COLUMN IF NOT EXISTS billing_status           text DEFAULT 'pending';
