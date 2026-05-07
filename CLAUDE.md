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
| SMS | Twilio (+16158824095) |
| Email | SendGrid (hello@joinrippl.com) |
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
│           │   ├── sendgrid.ts
│           │   └── openDental.ts
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

- **Phone number:** +16158824095
- **A2P 10DLC:** Campaign registration in progress — use Low Volume Standard brand BU6555c65665431bd7cef0337f70e0e0f2
- **SMS_ENABLED flag:** Check env var before sending — set false during A2P review
- **Opt-out:** Check `sms_opt_out` field at fire time, not just at schedule time
- **Onboarding delay:** 2 hours post-appointment

---

## SendGrid Email

- **From:** hello@joinrippl.com
- **Domain:** em4993.joinrippl.com (verified)
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
| `/refer?ref=XXXX` | For prospective patients |
| `/claim?token=UUID` | Reward claim page |
| `/privacy` | Privacy policy |
| `/terms` | SMS terms |

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

## Known Issues & Watch Points

- `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` — add `app.set('trust proxy', 1)` before rate limiter if not already done
- Admin tasks table has BOTH `completed` boolean AND `status` text — handle both
- New patient names show as 'Unknown Patient' if not yet in referrers table — poller now checks OD API as fallback
- SMS_ENABLED=false during A2P review — don't enable until Twilio approves campaign
- Tango amount must be in dollars not cents

---

## Environment Variables (Render)

All required vars:
`SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, OPEN_DENTAL_URL, OPEN_DENTAL_DEVELOPER_KEY, OPEN_DENTAL_CUSTOMER_KEY, OPEN_DENTAL_CUSTOMER_KEY_GREENBRIER, OPEN_DENTAL_CUSTOMER_KEY_LEWISBURG, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, TANGO_PLATFORM_NAME, TANGO_PLATFORM_KEY, TANGO_ACCOUNT_ID, TANGO_CUSTOMER_ID, TANGO_EMAIL_TEMPLATE_ID, APP_URL, DATABASE_URL, NODE_ENV, NODE_VERSION, SMS_ENABLED`

---

## Session Startup Checklist

Before making any changes in a new session:

1. `git pull` — get latest code
2. Read this file
3. Check Render logs for any active errors
4. Check Supabase for any pending admin tasks
5. Confirm what the last deploy.sh commit message was

---

*Last updated: April 2026 — Rippl v1.0 live at Hallmark Dental Brentwood*
