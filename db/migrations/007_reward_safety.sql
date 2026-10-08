-- Run preflight queries in docs/office-launch.md first. No data is merged or repriced.
-- Pause OD/DC ingestion and reward writes during deployment. These small-table indexes
-- deliberately fail on conflicting history instead of silently deleting records.
CREATE UNIQUE INDEX IF NOT EXISTS referrers_od_identity_unique
  ON referrers (office_id, patient_id)
  WHERE office_id IS NOT NULL AND patient_id ~ '^[0-9]+$';
CREATE UNIQUE INDEX IF NOT EXISTS referral_events_od_source_unique
  ON referral_events (office_id, external_proc_num)
  WHERE office_id IS NOT NULL AND external_proc_num IS NOT NULL AND team_source = 'open-dental-sync';
CREATE UNIQUE INDEX IF NOT EXISTS referral_events_dc_source_unique
  ON referral_events (practice_id, external_proc_num)
  WHERE practice_id IS NOT NULL AND external_proc_num IS NOT NULL AND team_source IN ('drivecentric-sftp', 'drivecentric-poll');
-- Voided historical claims may coexist with an explicitly approved replacement.
CREATE UNIQUE INDEX IF NOT EXISTS reward_claims_live_event_unique
  ON reward_claims (referral_event_id)
  WHERE referral_event_id IS NOT NULL AND status IS DISTINCT FROM 'voided';

CREATE UNIQUE INDEX IF NOT EXISTS referrers_self_request_unique
  ON referrers (practice_id, patient_id)
  WHERE practice_id IS NOT NULL AND patient_id LIKE 'self-v2-%';
