-- Staff Incentive Pool: config per practice + one entry per completed referral
-- Safe to re-run (IF NOT EXISTS everywhere).

CREATE TABLE IF NOT EXISTS staff_pool_configs (
  id                  text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  practice_id         text NOT NULL UNIQUE REFERENCES practices(id),
  enabled             boolean NOT NULL DEFAULT false,
  amount_per_referral integer NOT NULL DEFAULT 10,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_pool_entries (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  practice_id text NOT NULL REFERENCES practices(id),
  reward_id   text REFERENCES rewards(id),
  amount      integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_pool_entries_practice_id ON staff_pool_entries(practice_id);
CREATE INDEX IF NOT EXISTS idx_staff_pool_entries_created_at  ON staff_pool_entries(created_at DESC);
