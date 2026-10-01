-- Repairs three Drizzle-schema-vs-database mismatches found 2026-10-01.
--
-- 1. practices.agreement_accepted_at — declared in the Drizzle schema by commit 44ba4f2
--    (2026-09-19) on the mistaken assumption it already existed in the DB. It did not.
--    Because syncAllOffices() opens with a bare db.select().from(practicesTable), Drizzle
--    emitted the missing column and Postgres threw 42703 on the first query of every poll
--    cycle, halting ALL Open Dental polling from 2026-09-20 00:55 UTC onward.
--
-- 2. campaigns.audience_filter / failed_count — declared in the schema, absent from prod,
--    so the campaigns list endpoint (bare select) returned 500. Also relaxes the superseded
--    filter_type column, which is NOT NULL in prod but is no longer supplied by the code.
--
-- 3. referral_leads — declared in the schema since 2026-04-02 (a4a3af2) but the table was
--    never created in prod, so POST /api/referral/leads has always failed and the /refer
--    lead form has always shown "Something went wrong."
--
-- Every statement is guarded. Local staging and prod have diverged (prod has the legacy
-- campaigns.filter_type column, local does not; local already has referral_leads), so this
-- must be a safe no-op for objects that already exist and must not assume filter_type.

-- ── 1. practices ─────────────────────────────────────────────────────────────────────────
ALTER TABLE practices
  ADD COLUMN IF NOT EXISTS agreement_accepted_at timestamp;

-- ── 2. campaigns ─────────────────────────────────────────────────────────────────────────
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS audience_filter text,
  ADD COLUMN IF NOT EXISTS failed_count    integer NOT NULL DEFAULT 0;

DO $$
DECLARE
  has_filter_type boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'campaigns'
       AND column_name  = 'filter_type'
  ) INTO has_filter_type;

  -- Backfill audience_filter before enforcing NOT NULL to match the Drizzle schema.
  IF has_filter_type THEN
    UPDATE campaigns
       SET audience_filter = COALESCE(audience_filter, filter_type, 'all')
     WHERE audience_filter IS NULL;
  ELSE
    UPDATE campaigns
       SET audience_filter = 'all'
     WHERE audience_filter IS NULL;
  END IF;

  ALTER TABLE campaigns ALTER COLUMN audience_filter SET NOT NULL;

  -- filter_type is NOT NULL in prod but the current insert path no longer supplies it,
  -- which would fail every new campaign. Relax it rather than dropping data.
  IF has_filter_type THEN
    ALTER TABLE campaigns ALTER COLUMN filter_type DROP NOT NULL;
  END IF;
END $$;

-- ── 3. referral_leads ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_leads (
  id                 text PRIMARY KEY,
  referral_code      text,
  referrer_id        text,
  first_name         text NOT NULL,
  last_name          text NOT NULL,
  phone              text NOT NULL,
  email              text,
  office_preference  text,
  contact_preference text,
  message            text,
  source             text,
  created_at         timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referral_leads_referrer_id_idx ON referral_leads (referrer_id);
CREATE INDEX IF NOT EXISTS referral_leads_created_at_idx  ON referral_leads (created_at DESC);

-- Match the RLS posture of every other table: enabled, no public policies.
-- The backend uses the service role key, which bypasses RLS.
ALTER TABLE referral_leads ENABLE ROW LEVEL SECURITY;
