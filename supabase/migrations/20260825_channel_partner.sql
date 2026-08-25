-- Add channel_partner_id to practices table
-- Allows grouping practices under a reseller/channel partner user

ALTER TABLE practices
  ADD COLUMN IF NOT EXISTS channel_partner_id text REFERENCES user_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS practices_channel_partner_id_idx ON practices(channel_partner_id);
