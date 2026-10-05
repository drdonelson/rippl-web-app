-- Observability for the automotive (DriveCentric SFTP) sync path.
--
-- Why: the dental poller writes offices.last_poll_at, which is what made the Sept 2026 outage
-- findable at all. The automotive SFTP path recorded NOTHING — no cursor, no timestamp, no error.
-- That is why admin_tasks.amount silently dropped two real Carlock referrals on every hourly run
-- for weeks: the failure logged to a file nobody reads and returned {"success":false} to a cron
-- job that ignores the response body. Carlock has 0 offices, so office-level tracking cannot
-- cover it; this has to live on the practice.
--
-- last_sync_at    — set ONLY on a clean run (no errors), so staleness means "nothing has fully
--                   succeeded recently", mirroring offices.last_poll_at semantics.
-- last_sync_error — the first error from the most recent run, or NULL when the run was clean.
--
-- MIGRATION ORDER IS LOAD-BEARING: getPracticeConfig (lib/practiceConfig.ts) and
-- pollDriveCentricSftp both issue a bare db.select() on practicesTable, which makes Drizzle emit
-- every declared column. Adding these to the Drizzle schema before this migration lands would
-- throw 42703 on every call and take down both the poller and practice config resolution.
-- Apply this FIRST, verify, then ship the schema change.
ALTER TABLE practices
  ADD COLUMN IF NOT EXISTS last_sync_at    timestamp,
  ADD COLUMN IF NOT EXISTS last_sync_error text;
