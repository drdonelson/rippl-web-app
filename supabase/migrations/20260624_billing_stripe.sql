-- Add Stripe billing fields to practices table
ALTER TABLE practices ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS stripe_payment_method_id text;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS billing_status text DEFAULT 'pending';
