-- Backfills the migration file for referrers.advisor.
--
-- The advisor column was added to the Drizzle schema by commit 0ead80e (2026-09-16,
-- "advisor filter — assign/filter referrers by sales rep") and applied directly to
-- production, but no migration file was ever written. Production has the column; local
-- staging did not, which left staging unable to faithfully reproduce prod.
--
-- This is a no-op on production and brings local staging into line.
ALTER TABLE referrers
  ADD COLUMN IF NOT EXISTS advisor text;
