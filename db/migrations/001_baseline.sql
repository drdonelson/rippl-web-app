-- ============================================================
-- Rippl baseline schema — applies to a fresh Supabase project
-- Run in: Supabase SQL editor → paste → Run
-- Or: psql $DATABASE_URL -f db/migrations/001_baseline.sql
-- ============================================================

-- ── practices ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS practices (
  id                        text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name                      text        NOT NULL,
  slug                      text        NOT NULL,
  vertical                  text        DEFAULT 'dental',
  status                    text        DEFAULT 'active',
  plan                      text        DEFAULT 'per_referral',
  monthly_fee               integer     DEFAULT 0,
  per_referral_fee          integer     DEFAULT 20,
  reward_value              integer     DEFAULT 35,
  twilio_phone_number       text,
  sendgrid_from_email       text,
  sendgrid_from_name        text,
  tango_email_template_id   text,
  logo_url                  text,
  primary_color             text        DEFAULT 'E0622A',
  integration_config        jsonb       DEFAULT '{}',
  notification_template     jsonb       DEFAULT '{}',
  white_label_name          text,
  white_label_logo_url      text,
  white_label_primary_color text        DEFAULT '0d9488',
  show_powered_by_rippl     boolean     DEFAULT true,
  in_house_credit_label     text        DEFAULT '$100 Dental Account Credit',
  in_house_credit_value     integer     DEFAULT 100,
  tier_reward_starter       integer,
  tier_reward_rippler       integer,
  tier_reward_super_rippler integer,
  tier_reward_legend        integer,
  channel_partner_id        text,
  stripe_customer_id        text,
  stripe_payment_method_id  text,
  billing_status            text        DEFAULT 'pending',
  created_at                timestamptz NOT NULL DEFAULT now()
);

-- ── offices ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offices (
  id                   text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  practice_id          text        REFERENCES practices(id),
  name                 text        NOT NULL,
  customer_key         text,
  location_code        text        NOT NULL,
  od_url               text,
  logo_url             text,
  active               boolean     NOT NULL DEFAULT true,
  agreement_accepted_at timestamptz,
  last_poll_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- ── referrers ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrers (
  id                          text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  practice_id                 text        REFERENCES practices(id),
  patient_id                  text        NOT NULL,
  name                        text        NOT NULL,
  phone                       text        NOT NULL,
  email                       text,
  referral_code               text        NOT NULL UNIQUE,
  total_referrals             integer     NOT NULL DEFAULT 0,
  total_rewards_issued        integer     NOT NULL DEFAULT 0,
  onboarding_sms_sent         boolean     NOT NULL DEFAULT false,
  office_id                   text        REFERENCES offices(id),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  tier                        text        DEFAULT 'starter',
  tier_unlocked_at            timestamptz,
  reward_value                integer     DEFAULT 35,
  sms_opt_out                 boolean     DEFAULT false,
  sms_opt_out_permanent       boolean     DEFAULT false,
  opt_out_reason              text,
  onboarding_sms_scheduled_at timestamptz,
  onboarding_sms_sent_at      timestamptz
);

-- ── referral_events ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_events (
  id                    text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  practice_id           text        REFERENCES practices(id),
  new_patient_name      text        NOT NULL,
  new_patient_phone     text        NOT NULL,
  referrer_id           text        NOT NULL REFERENCES referrers(id),
  team_source           text        NOT NULL,
  office                text        NOT NULL,
  status                text        NOT NULL DEFAULT 'Lead',
  reward_type           text,
  external_proc_num     text,
  new_patient_pat_num   text,
  household_id          text,
  household_duplicate   boolean     NOT NULL DEFAULT false,
  office_id             text        REFERENCES offices(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  stripe_charge_id      text,
  charged_at            timestamptz,
  charge_amount_cents   integer
);

-- ── rewards (legacy — pre-reward_claims) ──────────────────
CREATE TABLE IF NOT EXISTS rewards (
  id                 text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  referrer_id        text        NOT NULL REFERENCES referrers(id),
  referral_event_id  text        NOT NULL REFERENCES referral_events(id),
  reward_type        text        NOT NULL,
  fulfilled          boolean     NOT NULL DEFAULT false,
  tango_order_id     text,
  office_id          text        REFERENCES offices(id),
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ── local_partners ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS local_partners (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name    text        NOT NULL,
  category         text        NOT NULL,
  contact_name     text,
  contact_email    text,
  contact_phone    text,
  address          text,
  logo_url         text,
  active           boolean     DEFAULT true,
  redemption_type  text        DEFAULT 'pin',
  office_id        text,
  created_at       timestamptz DEFAULT now()
);

-- ── partner_reward_tiers ──────────────────────────────────
CREATE TABLE IF NOT EXISTS partner_reward_tiers (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id   uuid    REFERENCES local_partners(id) ON DELETE CASCADE,
  patient_tier text    NOT NULL,
  reward_value integer NOT NULL,
  platform_fee integer NOT NULL,
  active       boolean DEFAULT true
);

-- ── reward_claims ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reward_claims (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id        text        REFERENCES practices(id),
  referral_event_id  text        REFERENCES referral_events(id),
  referrer_id        text        REFERENCES referrers(id),
  reward_type        text,
  reward_value       integer     NOT NULL,
  platform_fee       integer     DEFAULT 0,
  partner_id         uuid        REFERENCES local_partners(id),
  claim_token        text        UNIQUE NOT NULL,
  status             text        DEFAULT 'pending',
  claimed_at         timestamptz,
  expires_at         timestamptz DEFAULT (now() + interval '30 days'),
  tango_order_id     text,
  pin_code           text,
  created_at         timestamptz DEFAULT now()
);

-- ── admin_tasks ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_tasks (
  id                 text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  practice_id        text        REFERENCES practices(id),
  task_type          text        NOT NULL,
  referrer_id        text        REFERENCES referrers(id),
  referral_event_id  text        REFERENCES referral_events(id),
  amount             integer,
  notes              text,
  completed          boolean     DEFAULT false,
  status             text        DEFAULT 'pending',
  completed_by       text,
  completed_at       timestamptz,
  created_at         timestamptz DEFAULT now()
);

-- ── user_profiles ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id          text        PRIMARY KEY,  -- Supabase auth UUID
  role        text        NOT NULL,
  practice_id text        REFERENCES practices(id),
  office_id   text        REFERENCES offices(id),
  full_name   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── campaigns ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id                text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  practice_id       text        REFERENCES practices(id),
  name              text        NOT NULL,
  channel           text        NOT NULL,
  audience_filter   text        NOT NULL,
  message_template  text        NOT NULL,
  sent_count        integer     NOT NULL DEFAULT 0,
  failed_count      integer     NOT NULL DEFAULT 0,
  status            text        NOT NULL DEFAULT 'draft',
  created_by        text,
  sent_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ── launch_emails ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS launch_emails (
  id             text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  patient_id     text        NOT NULL,
  email          text        NOT NULL,
  first_name     text        NOT NULL,
  referral_code  text        NOT NULL,
  status         text        NOT NULL DEFAULT 'pending',
  error          text,
  sent_at        timestamptz,
  opened         boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ── referral_leads ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_leads (
  id                 text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  referral_code      text,
  referrer_id        text,
  first_name         text        NOT NULL,
  last_name          text        NOT NULL,
  phone              text        NOT NULL,
  email              text,
  office_preference  text,
  contact_preference text,
  message            text,
  source             text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ── referral_link_deliveries ──────────────────────────────
CREATE TABLE IF NOT EXISTS referral_link_deliveries (
  id                  text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  referrer_id         text        NOT NULL REFERENCES referrers(id),
  referral_code       text        NOT NULL,
  channel             text        NOT NULL,
  recipient           text        NOT NULL,
  message_body        text,
  status              text        NOT NULL DEFAULT 'pending',
  provider_message_id text,
  error_message       text,
  sent_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ── staff_pool_configs ────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_pool_configs (
  id                  text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  practice_id         text        NOT NULL UNIQUE REFERENCES practices(id),
  enabled             boolean     NOT NULL DEFAULT false,
  amount_per_referral integer     NOT NULL DEFAULT 5,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── staff_pool_entries ────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_pool_entries (
  id                text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  practice_id       text        NOT NULL REFERENCES practices(id),
  office_id         text        REFERENCES offices(id),
  referral_event_id text        REFERENCES referral_events(id),
  reward_id         text        REFERENCES rewards(id),
  amount            integer     NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ── waitlist ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waitlist (
  id         text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name       text        NOT NULL,
  practice   text        NOT NULL,
  email      text        NOT NULL UNIQUE,
  phone      text        NOT NULL DEFAULT '',
  source     text,
  emr        text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── pre_referrals ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pre_referrals (
  id             text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  referral_code  text        NOT NULL,
  practice_id    text        NOT NULL,
  first_name     text        NOT NULL,
  last_name      text        NOT NULL,
  phone          text        NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  matched        text        DEFAULT 'no'
);

-- ── RLS — enable on all tables, backend uses service role ─
ALTER TABLE practices               ENABLE ROW LEVEL SECURITY;
ALTER TABLE offices                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_partners          ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_reward_tiers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_claims           ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns               ENABLE ROW LEVEL SECURITY;
ALTER TABLE launch_emails           ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_leads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_link_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_pool_configs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_pool_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist                ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_referrals           ENABLE ROW LEVEL SECURITY;
