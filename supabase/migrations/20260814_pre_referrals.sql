-- Pre-referral capture table
-- Stores contact info for people who clicked an automotive referral link before visiting.
-- Used to match them to their DriveCentric deal (by phone) when it closes via SFTP export.
CREATE TABLE IF NOT EXISTS pre_referrals (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  referral_code TEXT NOT NULL,
  practice_id   TEXT NOT NULL,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  phone         TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  matched       TEXT DEFAULT 'no'
);

CREATE INDEX IF NOT EXISTS pre_referrals_phone_idx         ON pre_referrals(phone);
CREATE INDEX IF NOT EXISTS pre_referrals_referral_code_idx ON pre_referrals(referral_code);
CREATE INDEX IF NOT EXISTS pre_referrals_practice_matched_idx ON pre_referrals(practice_id, matched);
