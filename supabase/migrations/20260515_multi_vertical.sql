-- ─────────────────────────────────────────────────────────────────────────────
-- Multi-vertical support: new practice config columns + nullable customer_key
-- Safe to re-run (IF NOT EXISTS / IF column does not exist everywhere).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. New columns on practices table
ALTER TABLE practices
  ADD COLUMN IF NOT EXISTS integration_config       jsonb   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notification_template    jsonb   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS white_label_name         text,
  ADD COLUMN IF NOT EXISTS white_label_logo_url     text,
  ADD COLUMN IF NOT EXISTS white_label_primary_color text   DEFAULT '0d9488',
  ADD COLUMN IF NOT EXISTS show_powered_by_rippl    boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS in_house_credit_label    text    DEFAULT '$100 Dental Account Credit',
  ADD COLUMN IF NOT EXISTS in_house_credit_value    integer DEFAULT 100;

-- 2. Make offices.customer_key nullable — non-dental practices don't use OD
ALTER TABLE offices
  ALTER COLUMN customer_key DROP NOT NULL;

-- 3. Stamp Hallmark Dental with correct config (idempotent)
UPDATE practices
SET vertical             = 'dental',
    in_house_credit_label = '$100 Dental Account Credit',
    in_house_credit_value = 100,
    show_powered_by_rippl = true
WHERE slug = 'hallmark-dental';

-- Done.
