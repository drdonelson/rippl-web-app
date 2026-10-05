-- admin_tasks.amount: drop NOT NULL to match the Drizzle schema.
--
-- The Drizzle schema declares `amount: integer("amount")` — nullable, no default — but the
-- database had it NOT NULL with no default. Tasks that legitimately have no amount yet omit
-- the field, Drizzle emits DEFAULT for it, DEFAULT resolves to NULL, and Postgres rejected the
-- row with 23502.
--
-- Live impact: every DriveCentric SFTP sync detected the same 2 unmatched referrals for Carlock
-- (deals 941ed09b-29b7-4e6a-b03e-ad61f379ba69 and 223bafa3-f32a-4cb8-bad9-93e90bf7138d) and
-- failed to file either one as an admin task — on every run, for weeks. The referrals were
-- detected and then silently dropped, so they never appeared in the Admin Tasks queue.
--
-- An unmatched-referral task has no amount by definition: no referrer has been matched yet, so
-- no reward value is known. Nullable is the correct shape; the code was right and the DB was wrong.
--
-- Note: this class of drift (nullability, not a missing column) is invisible to a diff that only
-- compares column NAMES between the Drizzle schema and information_schema. Compare is_nullable
-- and column_default too.
ALTER TABLE admin_tasks
  ALTER COLUMN amount DROP NOT NULL;
