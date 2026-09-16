-- Per-practice Twilio credentials
-- Allows each practice to have its own Twilio subaccount (SID + auth token)
-- distinct from the global env-var credentials.
-- Falls back to TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN env vars when NULL.

ALTER TABLE practices
  ADD COLUMN IF NOT EXISTS twilio_account_sid text,
  ADD COLUMN IF NOT EXISTS twilio_auth_token  text;
