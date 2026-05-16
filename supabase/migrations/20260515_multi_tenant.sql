-- ─────────────────────────────────────────────────────────────────────────────
-- Multi-tenancy groundwork: practices table + practice_id on all data tables
-- All ID/FK columns use TEXT to match the existing Drizzle schema convention.
-- Run once against Supabase SQL editor. Safe to re-run (IF NOT EXISTS everywhere).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create practices table
--    id is text (Drizzle uses text PKs via crypto.randomUUID(), not the uuid type)
CREATE TABLE IF NOT EXISTS practices (
  id                      text DEFAULT gen_random_uuid()::text PRIMARY KEY,
  name                    text NOT NULL,
  slug                    text UNIQUE NOT NULL,
  vertical                text DEFAULT 'dental',
  status                  text DEFAULT 'active',
  plan                    text DEFAULT 'per_referral',
  monthly_fee             integer DEFAULT 0,
  per_referral_fee        integer DEFAULT 20,
  reward_value            integer DEFAULT 35,
  twilio_phone_number     text,
  sendgrid_from_email     text,
  sendgrid_from_name      text,
  tango_email_template_id text,
  logo_url                text,
  primary_color           text DEFAULT 'E0622A',
  created_at              timestamp DEFAULT now()
);

-- 2. Add practice_id to all data tables (nullable, text to match practices.id)
ALTER TABLE offices          ADD COLUMN IF NOT EXISTS practice_id text REFERENCES practices(id);
ALTER TABLE referrers        ADD COLUMN IF NOT EXISTS practice_id text REFERENCES practices(id);
ALTER TABLE referral_events  ADD COLUMN IF NOT EXISTS practice_id text REFERENCES practices(id);
ALTER TABLE reward_claims    ADD COLUMN IF NOT EXISTS practice_id text REFERENCES practices(id);
ALTER TABLE admin_tasks      ADD COLUMN IF NOT EXISTS practice_id text REFERENCES practices(id);
ALTER TABLE campaigns        ADD COLUMN IF NOT EXISTS practice_id text REFERENCES practices(id);

-- 3. Add office_id to user_profiles (text to match offices.id type)
--    The current practice_id column stores an office UUID as text —
--    copy it to office_id, then re-purpose practice_id to reference practices.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS office_id text REFERENCES offices(id);

-- Copy existing practice_id (office UUIDs stored as text) → office_id
UPDATE user_profiles
SET office_id = practice_id
WHERE practice_id IS NOT NULL
  AND practice_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 4. Seed Hallmark Dental as the first practice
INSERT INTO practices (
  id,
  name,
  slug,
  vertical,
  twilio_phone_number,
  sendgrid_from_email,
  sendgrid_from_name,
  tango_email_template_id,
  primary_color
) VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Hallmark Dental',
  'hallmark-dental',
  'dental',
  '+16158824095',
  'frontdesk@hallmarkdds.com',
  'Hallmark Dental',
  'E813474',
  'E0622A'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Backfill practice_id = Hallmark on all existing data
UPDATE offices         SET practice_id = 'a1b2c3d4-0000-0000-0000-000000000001' WHERE practice_id IS NULL;
UPDATE referrers       SET practice_id = 'a1b2c3d4-0000-0000-0000-000000000001' WHERE practice_id IS NULL;
UPDATE referral_events SET practice_id = 'a1b2c3d4-0000-0000-0000-000000000001' WHERE practice_id IS NULL;
UPDATE reward_claims   SET practice_id = 'a1b2c3d4-0000-0000-0000-000000000001' WHERE practice_id IS NULL;
UPDATE admin_tasks     SET practice_id = 'a1b2c3d4-0000-0000-0000-000000000001' WHERE practice_id IS NULL;
UPDATE campaigns       SET practice_id = 'a1b2c3d4-0000-0000-0000-000000000001' WHERE practice_id IS NULL;

-- 6. Update user_profiles.practice_id to reference practices table
--    Drop old FK (pointed to offices), set all non-null rows to Hallmark UUID,
--    then add new FK pointing to practices.
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_practice_id_fkey;

-- Replace old office UUID values with the Hallmark practice UUID
UPDATE user_profiles
SET practice_id = 'a1b2c3d4-0000-0000-0000-000000000001'
WHERE practice_id IS NOT NULL;

-- Add new FK to practices (both practice_id and practices.id are text)
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_practice_id_fkey
  FOREIGN KEY (practice_id) REFERENCES practices(id);

-- Also stamp practice_id for super_admin / demo accounts (currently NULL — keep NULL, they're cross-tenant)
-- No action needed; NULL means "all practices" in the app layer.

-- 7. Useful indexes for tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_referrers_practice_id        ON referrers(practice_id);
CREATE INDEX IF NOT EXISTS idx_referral_events_practice_id  ON referral_events(practice_id);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_practice_id      ON admin_tasks(practice_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_practice_id        ON campaigns(practice_id);
CREATE INDEX IF NOT EXISTS idx_reward_claims_practice_id    ON reward_claims(practice_id);
CREATE INDEX IF NOT EXISTS idx_offices_practice_id          ON offices(practice_id);

-- Done. All existing Hallmark data is now scoped to practice 'a1b2c3d4-0000-0000-0000-000000000001'.
