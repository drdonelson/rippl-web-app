-- ============================================================
-- Enable Row Level Security on all public tables
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Step 1: Enable RLS on every public table
ALTER TABLE public.referrers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launch_emails     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_tasks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offices           ENABLE ROW LEVEL SECURITY;

-- Step 2: Add service_role bypass policies
-- The backend API server uses the service_role key (via DATABASE_URL as the
-- postgres superuser, which bypasses RLS) and via supabaseAdmin (service_role JWT).
-- These policies ensure service_role JWT calls also have full access.

CREATE POLICY "Service role full access" ON public.referrers
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.referral_events
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.rewards
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.user_profiles
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.admin_tasks
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.offices
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.launch_emails
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- Verify: run this SELECT after the above to confirm RLS is on
-- ============================================================
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
