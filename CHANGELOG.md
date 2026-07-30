# Changelog

All notable changes to Rippl are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [1.6.0] — 2026-07-29

### Added
- **Practice picker for super_admin** — `PracticeProvider` context (`practice-context.tsx`) with `usePractice()` hook; fetches `/api/practices` filtered to non-demo; `selectedPracticeId` persisted in localStorage under `rippl_selected_practice_id`
- **`PracticePicker` component** in `layout.tsx` — `Building2` icon, "All Practices" default, dropdown list; visible only to `super_admin`; shows in both desktop sidebar and mobile header
- **Practice-scoped API queries** — all four main routes (`dashboard.ts`, `referrals.ts`, `referrers.ts`, `adminTasks.ts`) now accept `?practice_id=` query param for super_admin; non-super_admin roles always use their own `practice_id`
- **Office context practice filter** — `office-context.tsx` filters offices by `selectedPracticeId` when super_admin has a practice selected
- **Subtitle shows selected practice name** — layout subtitle replaces "All Locations" with the selected practice name for super_admin

### Changed
- **DriveCentric SFTP: customer CSVs now optional** — `customer` and `customercontact` files no longer required; `deal` + `sourcedescriptiongroup` are sufficient to process a batch (supports partial SFTP exports during Volvo onboarding)
- **Dashboard vertical labels** — automotive practices show "Vehicles Sold" and "Active Customers" in super_admin view when a practice is selected
- **Patients page filter** — client-side practice filter applied when `selectedPracticeId` is set

### Fixed
- Volvo/Carlock visible in super_admin — automotive practices have 0 offices so they never appeared in the old office-only picker; practice picker resolves this

### Infrastructure
- Confirmed Cox Automotive rooftop structure: each dealership (Carlock store 3364, Volvo of Cool Springs) has its own DriveCentric account and CRM ID under the Cox Automotive umbrella — two separate SFTP setups are correct and intentional

---

## [1.5.0] — 2026-07-02

### Added
- **DriveCentric SFTP integration** — replaces planned REST API polling; `driveCentricSftp.ts` polls hourly on server startup; scans all automotive practices with `sftp_host` configured; downloads CSV batch from dealer's SFTP server; file pattern `{storeNum}_v2_{table}_{from}_{to}_{timestamp}.csv`
- **DigitalOcean SFTP droplet** — `167.99.15.170` (Ubuntu 24.04); `drivecentric` user with SSH key auth; UFW firewall; daily cron `0 6 * * *` → `/usr/local/bin/rippl-sync.sh` → Render sync endpoint
- **Carlock Automotive onboarding** — store 3364; SFTP path `/home/drivecentric/carlock/`; SSH key exchanged with Darren Sabino
- **Volvo of Cool Springs onboarding** — separate DriveCentric rooftop; SFTP path `/home/drivecentric/volvo-cool-springs/` (empty — awaiting Darren to configure export); SSH key sent via Bitwarden Send 2026-07-02
- **Health endpoint DB ping** — `GET /api/health` now queries Supabase before returning 200; confirms DB connectivity
- **`/api/sync/drivecentric` route** — auth via `X-Sync-Secret: rippl-sync-2026` header; triggers SFTP poll and deal processing
- **`matchReferrerByName`** extended for automotive context — 3-tier: exact full-name, first+last token match, phone last-10-digits

### Changed
- **`SMS_ENABLED`** set to `false` in Render during A2P review — disables all SMS (dental + automotive) globally until Twilio approves campaign
- **Unmatched referral flow for automotive** — `SourceDescription` field in Deal CSV used as referral name; unmatched entries create `admin_task` type `unmatched-referral` for manual resolution

### Fixed
- A2P Twilio campaign registration kicked off — brand `BU6555c65665431bd7cef0337f70e0e0f2`; SMS paused until approval

---

## [1.4.0] — 2026-05-28

### Added
- **Branded demo accounts** — two fictional practices with real seeded data for sales demos; no warning banner; `practice_id` set on demo user distinguishes branded vs generic demo
  - `/demo/dental` → Brentwood Family Dental (`front.desk@brentwoodfamilydental.com` / `Brentwood2026!`)
  - `/demo/auto` → Summit Auto Group (`manager@summitautogroup.com` / `Summit2026!`)
- **Brevo email provider** — replaced SendGrid; `BREVO_API_KEY` env var; shared `sendEmail()` helper at `lib/email.ts`; `sendEmail({ from, to, subject, html })` API
- **Demo practice isolation** — `practices.status = 'demo'` filter excludes demo practices from super_admin dashboard, office picker, and stats aggregation
- **Vertical-aware dashboard** — `vertical` flows from practice → profile API → dashboard API → stat card labels; automotive gets "Vehicles Sold" + "Active Customers"

### Changed
- **`isDemo` redefined** — `role === "demo" && !practice_id`; branded demos (practice_id set) treated as real accounts
- **`/demo/auto`** — Summit Auto Group demo shows automotive vertical labels; no patient language

### Fixed
- **Campaigns SQL alias bug** — Drizzle ORM `"referrers"."column"` syntax conflicted with `FROM referrers r` alias; fixed with raw `sql\`AND r.column = ${val}\``
- `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL` env vars deprecated (can be removed from Render)

---

## [1.3.0] — 2026-05-20

### Added
- **Marketing landing pages** — `/join/dental` and `/join/salon`; hero, 3-step how-it-works, pricing card, lead gen form; `/join` aliases to `/join/dental`
- **SSH deploy** — `deploy.sh` uses `git@github.com:drdonelson/rippl-web-app.git`; key at `~/.ssh/id_ed25519`; no PAT required
- **Desktop-responsive layouts** — `join.tsx`, `patient-journey.tsx`, `onboard.tsx` updated with `lg:grid-cols-2`, `max-w-6xl`, horizontal step connectors

---

## [1.2.0] — 2026-05-15

### Added
- **Vertical-aware Tango template routing** — `VERTICAL_TANGO_TEMPLATES` map in `practiceConfig.ts`; `resolveTangoTemplate()` with 4-level resolution: per-practice DB override → vertical map → env var → `E813474` default
  - dental: `E813474`, salon: `E336474`, automotive: `E301464`
- **Multi-vertical `/refer` page** — `GET /api/referral/:code` returns full practice object `{ id, display_name, vertical, logo_url, primary_color }`; `refer.tsx` uses `VERTICAL_CONTENT` map; dental shows OFFICE_CONFIG booking cards + InsuranceCards; salon/automotive shows single CTA form
- **Real Tango email mockup** — Patient Journey Step 6 replaced with real Tango template design: orange Rippl header, card placeholder, "To Redeem" section, Tango footer

---

## [1.1.0] — 2026-05-08

### Added
- **Vagaro (salon) integration** — `POST /api/webhooks/vagaro`; triggers on `bookingStatus: "Service Completed"` + `appointmentTypeCode: "NR"`; reads form response field matching `/refer/i`; OAuth via `client_credentials`; dedup: `external_proc_num = appointmentId`
  - Test endpoints: `POST /api/test/vagaro-credentials`, `POST /api/test/vagaro-webhook`
  - Admin UI: `VagaroPanel` in `practice-admin.tsx`
- **DriveCentric (automotive) REST integration** — `driveCentric.ts` daily poll of closed deals; reads `surveyResponses` for referral question/tags (standby for future direct API; SFTP now preferred)
- **`matchReferrerByName`** — shared 3-tier name matcher: exact full-name → first+last token match → phone last-10-digits; `artifacts/api-server/src/lib/matchReferrer.ts`
- **Unmatched-referral admin UI** — amber badge + "Match Referrer" dropdown with typeahead search in admin tasks; `POST /api/admin-tasks/:id/match-referrer` endpoint; on match: creates referral_event + reward_claim + sends notification + completes task
- **Patient Journey** — `/patient-journey` 6-step demo tool (super_admin + demo only): trigger → SMS → email → claim page → reward choice → gift card delivery
- **Warm orange reward email** — replaced dark navy SendGrid template with warm orange Rippl-branded design
- **Resend notification button** — on Exam Completed events in dashboard event log

---

## [1.0.0] — 2026-04-28

### Added
- **Bold Celebration design system** — orange `#E0622A`, Fraunces display font, DM Sans UI, Geist Mono data; full-bleed gradient claim page (`#F5A623` → `#E8842A`); confetti + count-up animation
- **Multi-tenancy** — `practices` table; `vertical` field (dental, automotive, salon, other); per-practice scoping
- **Practice Console** — `/onboard`: OD connection test, white-label config, agreement acceptance, leads tab
- **`DESIGN.md`** created as authoritative design source of truth (no teal, no Inter — ever)

### Fixed
- Auth flash race condition for `super_admin` (blank screen on load)
- Auth flash on staff page redirect

---

## [0.2.0] — 2026-04-20

### Added
- Bold Celebration design applied to patient-facing pages — first pass
- Color system: orange primary, gradient claim background
- Fraunces + DM Sans font pairing introduced

---

## [0.1.0] — 2026-04-10

### Added
- **Open Dental poller** — 5-minute interval; detects `R0150` completions across Brentwood, Lewisburg, Greenbrier; each office uses its own `CustomerKey`
- **Reward claim flow** — R0150 detected → referrer lookup → SMS + email → `/claim?token=UUID` → gift card / dental credit / charity choice → Tango delivery or `admin_task` fallback
- **Supabase schema** — `referrers`, `referral_events`, `reward_claims`, `admin_tasks`, `offices` tables; RLS on all tables
- **Patient-facing pages** — `/refer`, `/claim`, `/how-it-works`, `/find`, `/privacy`, `/terms`
- **Printable materials** — `/poster-print`, `/poster-5x7`, `/card-print`, `/card-back`; Flowcode QR PNG
- **Help/training** — `/help` with Loom training videos
- **Auth** — login, role-based access, session management

---

[1.6.0]: https://github.com/drdonelson/rippl-web-app/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/drdonelson/rippl-web-app/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/drdonelson/rippl-web-app/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/drdonelson/rippl-web-app/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/drdonelson/rippl-web-app/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/drdonelson/rippl-web-app/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/drdonelson/rippl-web-app/compare/v0.2.0...v1.0.0
[0.2.0]: https://github.com/drdonelson/rippl-web-app/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/drdonelson/rippl-web-app/releases/tag/v0.1.0
