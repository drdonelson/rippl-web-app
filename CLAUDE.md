# Rippl — Claude Code Context File

> Read this file at the start of every session before making any changes.

## Design System
Always read `DESIGN.md` before making any visual or UI changes.
Font choices, colors, spacing, border-radius, and motion are all defined there.
Do not deviate without explicit user approval.
Key rules: Fraunces for display/reward numbers, DM Sans for all UI, Geist Mono for data. Orange `#E0622A` is the primary accent (logo "pl", buttons, badges). No teal. No Inter.

---

## What is Rippl?

Rippl is a dental patient referral rewards platform. It detects completed referrals in Open Dental (via R0150 procedure code), notifies the referring patient via SMS and email, and delivers gift card rewards through Tango Card. It is currently live and running at Hallmark Dental.

**Live URL:** https://www.joinrippl.com  
**GitHub:** https://github.com/drdonelson/rippl-web-app  
**Owner:** Dr. David Donelson, Hallmark Dental

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React/Vite (monorepo workspace @workspace/rippl) |
| Backend | Node.js/Express (@workspace/api-server) |
| Database | Supabase PostgreSQL |
| SMS | Twilio (toll-free number — in transition, see Twilio section) |
| Email | Brevo (hello@joinrippl.com) |
| Gift cards | Tango Card |
| EMR | Open Dental API via eConnector |
| Hosting | Render.com |

---

## Monorepo Structure

```
rippl-web-app/
├── artifacts/
│   ├── rippl/          ← React/Vite frontend
│   │   └── src/
│   │       ├── pages/
│   │       ├── components/
│   │       ├── assets/tiers/   ← SVG tier icons
│   │       └── lib/
│   └── api-server/     ← Node.js/Express backend
│       └── src/
│           ├── routes/
│           ├── services/
│           │   ├── tango.ts
│           │   ├── twilio.ts
│           │   └── openDental.ts
│           ├── lib/
│           │   └── email.ts    ← Brevo email sender (replaced sendgrid.ts)
│           └── poller/         ← Open Dental sync
├── deploy.sh           ← push to GitHub + trigger Render deploy
└── CLAUDE.md           ← this file
```

---

## Deploying

Always deploy with:
```bash
./deploy.sh "description of what changed"
```

This commits, pushes to GitHub, and Render auto-deploys. Never push directly with git — always use deploy.sh.

---

## Database — Supabase PostgreSQL

**Key tables:**

| Table | Purpose |
|---|---|
| `referrers` | All enrolled patients |
| `referral_events` | Detected R0150 completions |
| `reward_claims` | Claim tokens and fulfillment status |
| `admin_tasks` | Manual tasks (dental credit, charity) |
| `offices` | Three Hallmark offices |
| `campaigns` | Bulk SMS/email campaigns |
| `local_partners` | Local business reward partners |

**referrers columns:**
`id, patient_id, name, phone, email, referral_code, total_referrals, total_rewards_issued, onboarding_sms_sent, office_id, created_at, tier, tier_unlocked_at, reward_value, sms_opt_out, opt_out_reason, onboarding_sms_scheduled_at, onboarding_sms_sent_at`

**Tier system:**

| DB value | Display name | Min referrals | Reward |
|---|---|---|---|
| starter | Influencer | 1 | $35 |
| rippler | Amplifier | 3 | $50 |
| super_rippler | Ambassador | 6 | $75 |
| rippl_legend | Legend | 10 | $100 |

RLS is enabled on ALL tables. Always use service role key in backend.

---

## Open Dental Integration

- **Auth header:** `Authorization: ODFHIR {DeveloperKey}/{CustomerKey}`
- **Trigger procedure code:** `R0150` (abbreviation REF_COMP)
- **Referral lookup:** `GET /api/v1/refattaches?PatNum={newPatNum}` → ReferralNum → `GET /api/v1/referrals/{ReferralNum}` → referring PatNum
- **Patient name lookup:** Check referrers table first, then `GET /api/v1/patients/{PatNum}`
- **Offices:** Brentwood (primary), Lewisburg, Greenbrier — each has its own CustomerKey
- **Poller interval:** 5 minutes
- **eConnector:** Running on Brentwood server

---

## Tango Card (Gift Cards)

- **Account ID:** A78876593
- **Customer Identifier:** G32251981 ← critical, not the account number
- **Platform Name:** DiscoveryExpeditionsPLLC
- **Email Template ID:** E813474
- **UTID (Reward Link US):** U453114
- **Amount field:** dollars not cents ($35 = 35, NOT 3500)
- **Environment:** Production

---

## Twilio SMS

**Current status:** In transition — setting up a new Twilio account the right way.

- **Old number:** +16158824095 (local 10DLC — do not use, A2P campaign was rejected)
- **New account plan:** Register Rippl as ISV/Platform (not Hallmark Dental) — one Twilio account for Rippl, subaccounts per practice
- **Phone strategy:** Toll-free number per practice (simpler verification than 10DLC, no TCR)
- **New number:** TBD — update `TWILIO_PHONE_NUMBER` env var on Render when assigned
- **SMS_ENABLED flag:** Keep `false` until new number is verified and approved
- **Opt-out:** Check `sms_opt_out` field at fire time, not just at schedule time
- **Onboarding delay:** 2 hours post-appointment
- **Future multi-office:** `offices` table will need `twilio_phone_number` column when office #2 onboards

---

## Brevo Email

- **Provider:** Brevo (replaced SendGrid — `artifacts/api-server/src/lib/email.ts`)
- **From:** hello@joinrippl.com (verified sender in Brevo)
- **From name:** "Hallmark Dental" (set in Brevo sender config)
- **Env var:** `BREVO_API_KEY` (replaces `SENDGRID_API_KEY`)
- **Reward notification:** Dark navy branded template
- **Claim URL format:** `https://www.joinrippl.com/claim?token=${claimToken}` (UUID, not referral code)

---

## Key Business Rules

1. **Dedup:** One reward per `new_patient_pat_num + office_id` — never double-reward
2. **Reward claim flow:** R0150 detected → referrer notified → patient clicks claim link → chooses reward → Tango delivers gift card OR admin task created
3. **Fallback:** If Tango fails, create admin_task with `task_type = 'gift-card'` so no reward is ever lost
4. **Dental credit:** Always $100 (3x the gift card value) — pushed first in UI to encourage in-practice redemption
5. **No monthly fees:** Per-referral pricing only ($20/referral for other practices)

---

## Hallmark Dental Offices

| Office | ID | Location |
|---|---|---|
| Brentwood | brentwood | 1585 Mallory Lane Suite 101, Brentwood TN 37027 |
| Lewisburg | lewisburg | Lewisburg, TN |
| Greenbrier | greenbrier | Greenbrier, TN |

Patient counts: Brentwood 2,132 · Lewisburg 6,267 · Greenbrier 2,850

---

## Public Pages

| URL | Purpose |
|---|---|
| `/` | Login |
| `/demo` | Demo access (role: demo) |
| `/how-it-works` | For referrers (existing patients) |
| `/refer?ref=XXXX` | For prospective patients — multi-vertical, practice name/copy driven by API |
| `/claim?token=UUID` | Reward claim page |
| `/privacy` | Privacy policy |
| `/terms` | SMS terms |
| `/patient-journey` | 6-step patient journey demo tool (super_admin + demo only) |
| `/join/dental` | Marketing landing page for dental practices — hero, how-it-works, pricing, lead gen form |
| `/join/salon` | Marketing landing page for salon practices — same layout, salon-specific copy |
| `/join` | Alias for `/join/dental` |
| `/join-waitlist` | Simple waitlist form (legacy) |
| `/sms-opt-in` | Standalone voluntary SMS opt-in (TCPA compliant — explicitly not required for rewards) |

---

## Auth & Roles

| Role | Access |
|---|---|
| super_admin | Everything |
| practice_admin | All offices |
| demo | Read-only with fake data |
| staff_brentwood | Brentwood only |
| staff_lewisburg | Lewisburg only |
| staff_greenbrier | Greenbrier only |

---

## Multi-Vertical Integrations

### Vagaro (Salon)
- **Webhook URL:** `POST /api/webhooks/vagaro` (public — no auth required)
- **Trigger condition:** `bookingStatus: "Service Completed"` + `appointmentTypeCode: "NR"` (new client)
- **Form responses:** `formResponseIds[]` in webhook payload → `GET https://api.vagaro.com/v2/formresponses/{id}` with Bearer token
- **OAuth:** `client_credentials` grant at `https://api.vagaro.com/oauth2/token` using `vagaro_api_key` (client_id) + `vagaro_api_secret` (client_secret) stored in `integration_config`
- **Referral detection:** field whose `fieldName` matches `/refer/i` — value is the referrer name
- **Unmatched referrals:** create `admin_task` with `task_type: "unmatched-referral"` — resolved in Admin Tasks UI via "Match Referrer" button
- **Dedup:** `external_proc_num = appointmentId` per practice — never double-process
- **Service file:** `artifacts/api-server/src/services/vagaro.ts`

### DriveCentric (Automotive)
- **Poll method:** scheduled poll of closed deals (daily) via `pollDriveCentric(practiceId)`
- **API:** `GET https://api.drivecentric.com/v1/dealers/{dealerId}/deals?status=closed&since={iso}`
- **Auth:** `Authorization: Bearer {drivecentic_api_key}` from `integration_config`
- **Referral detection:** reads `surveyResponses[].question/answer` — matches configured `survey_referral_question` (default: "How did you hear about us?") and `referral_lead_source_tags` (default CSV: "Customer Referral,Friend,Referral,Word of Mouth")
- **Name matching:** if survey answer is a tag value (e.g. "Customer Referral"), creates unmatched-referral task. If answer contains a space, treats it as the referrer name and runs `matchReferrerByName`
- **Dedup:** `external_proc_num = deal.id` per practice
- **Service file:** `artifacts/api-server/src/services/driveCentric.ts`

### Shared Name Matching — `matchReferrerByName`
- **File:** `artifacts/api-server/src/lib/matchReferrer.ts`
- **Tier 1:** Exact full-name match (case-insensitive)
- **Tier 2:** First + last token both present in referrer name
- **Tier 3:** Phone digits (last 10) match if `inputPhone` provided
- Returns `{ referrer, matchType }` or `null` if no match

### Admin Tasks — Unmatched Referrals
- **task_type:** `"unmatched-referral"` (no `referrer_id`, no `referral_event_id`)
- **UI:** amber badge + "Match Referrer" dropdown with typeahead search
- **Match endpoint:** `POST /api/admin-tasks/:id/match-referrer` — body: `{ referrer_id }`
- **Search endpoint:** `GET /api/admin-tasks/referrers/search?q=…&practice_id=…`
- **On match:** creates referral_event + reward_claim + sends notification + completes task

---

## Multi-Vertical /refer Landing Page

`GET /api/referral/:code` returns a `practice` object alongside referrer info:
```json
{ "referrer_id", "referrer_name", "referral_code", "office_name",
  "practice": { "id", "display_name", "vertical", "logo_url", "primary_color" } }
```
- `display_name` = `white_label_name ?? name`
- `primary_color` = `white_label_primary_color ?? primary_color`
- `practice` is `null` if referrer has no `practice_id`

Frontend `refer.tsx` behavior by vertical:
- **dental** — shows OFFICE_CONFIG booking cards (Hallmark Dental hardcoded), InsuranceCards, then fallback form
- **automotive / salon** — shows single CTA button that opens form directly; no InsuranceCards
- `VERTICAL_CONTENT` map in `refer.tsx` holds copy/trust items/testimonials per vertical
- Demo codes (`MIKE1001` etc.) return `DEMO_PRACTICE` (Hallmark Dental dental) from backend

Tango email templates by vertical (`resolveTangoTemplate` in `practiceConfig.ts`):
- dental → `E813474`, salon → `E336474`, automotive → `E301464`
- Per-practice `tango_email_template_id` overrides the vertical default

---

## Known Issues & Watch Points

- `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` — add `app.set('trust proxy', 1)` before rate limiter if not already done
- Admin tasks table has BOTH `completed` boolean AND `status` text — handle both
- New patient names show as 'Unknown Patient' if not yet in referrers table — poller now checks OD API as fallback
- **SMS_ENABLED=false** — keep false until new Twilio toll-free number is verified
- Tango amount must be in dollars not cents
- `staff_pool_configs` and `staff_pool_entries` — RLS enabled May 2026, no public policies (backend uses service role)

---

## Environment Variables (Render)

All required vars:
`SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, OPEN_DENTAL_URL, OPEN_DENTAL_DEVELOPER_KEY, OPEN_DENTAL_CUSTOMER_KEY, OPEN_DENTAL_CUSTOMER_KEY_GREENBRIER, OPEN_DENTAL_CUSTOMER_KEY_LEWISBURG, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, BREVO_API_KEY, TANGO_PLATFORM_NAME, TANGO_PLATFORM_KEY, TANGO_ACCOUNT_ID, TANGO_CUSTOMER_ID, TANGO_EMAIL_TEMPLATE_ID, APP_URL, DATABASE_URL, NODE_ENV, NODE_VERSION, SMS_ENABLED`

Note: `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL` replaced by `BREVO_API_KEY`. The from email (`hello@joinrippl.com`) is now hardcoded in `campaigns.ts` with a fallback to `SENDGRID_FROM_EMAIL` for backwards compat.

---

## Session Startup Checklist

Before making any changes in a new session:

1. `git pull` — get latest code
2. Read this file
3. Check Render logs for any active errors
4. Check Supabase for any pending admin tasks
5. Confirm what the last deploy.sh commit message was

---

*Last updated: May 2026 — Rippl v1.4: Email migrated to Brevo, SMS opt-in page updated for TCPA compliance, Twilio being rebuilt as ISV/Platform with toll-free numbers per practice*
