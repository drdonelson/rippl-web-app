# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Rippl is an internal patient referral reward platform for a dental practice (Hallmark Dental).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite with Tailwind CSS, dark navy theme

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── rippl/              # React + Vite frontend (Rippl app)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
│   └── src/seed.ts         # Database seed script
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package
```

## Application: Rippl

### Frontend Pages
- **Dashboard** (`/`) — Stat cards (total referrals, exams completed, rewards issued, active referrers), recent activity feed, top referrers leaderboard
- **Referral Events** (`/events`) — Table of all referral events with status badges and "Send Reward" action for completed exams
- **Patients & QR** (`/patients`) — Grid of referrer cards with QR code generation
- **Reward Claim** (`/claim?ref=[code]`) — Public-facing mobile-friendly reward selection page

### Backend API Routes
- `GET /api/dashboard` — Dashboard stats
- `GET /api/referrers` — All referrers
- `POST /api/referrers` — Create new referrer
- `GET /api/referrers/:id/qr` — Get referral URL for QR
- `GET /api/referrals` — All referral events
- `POST /api/referrals` — Create referral event (status = Lead)
- `PATCH /api/referrals/:id/status` — Update status (logs notification at Exam Completed)
- `GET /api/referrals/by-token/:token` — Look up referral by referral code
- `POST /api/rewards` — Create reward, updates event to Reward Sent; creates admin task if reward_type = charity-donation
- `GET /api/admin-tasks` — List all incomplete admin tasks (with referrer & patient info)
- `PATCH /api/admin-tasks/:id/complete` — Mark an admin task as done
- `GET /api/offices` — All offices (id, name, location, active — no credentials exposed)
- `GET /api/offices/active` — Active offices only
- `GET /api/dashboard?office_id=` — Filtered dashboard stats (pass office UUID or omit for all)
- `GET /api/referrals?office_id=` — Filtered referral events by office

### Database Tables
- `offices` — Multi-location registry: id, name, open_dental_customer_key, location (brentwood/lewisburg/greenbrier), active (boolean)
- `referrers` — Patient referrers enrolled in the program (`onboarding_sms_sent` bool added)
- `referral_events` — Individual referral events (`household_id`, `household_duplicate`, `office_id` FK cols added)
- `rewards` — Issued rewards (types: in-house-credit, amazon-gift-card, charity-donation)
- `admin_tasks` — Manual to-dos: charity-donation, amazon-gift-card, household-duplicate-review
- `launch_emails` — One-time program announcement email queue (pending/sent/failed)

### Reward Types
- `in-house-credit` — $100 applied to patient account
- `amazon-gift-card` — $50 digital gift card via Tango (auto-fulfilled; admin_task on failure)
- `charity-donation` — $50 donated on referrer's behalf (creates admin_task for manual processing)

### Key Features
- **Multi-location support** — `offices` table stores Brentwood/Lewisburg/Greenbrier with per-office OD customer keys. Poller loops through all active offices on each poll cycle. Frontend has an office selector dropdown (localStorage-persisted); selecting an office filters Dashboard stats and Events list via `?office_id=` query param. Offices API omits credentials (`open_dental_customer_key` never exposed to frontend).
- **Household duplicate detection** — SHA-256 hash of lastName+address from OD; flags `household_duplicate`, creates admin review task, "Override & Reward" on Events→Flagged tab
- **Post-visit onboarding SMS** — fires 2h after exam completion for new patients; creates referrer record with `FIRST4-LAST4` code; guarded by `onboarding_sms_sent` flag
- **Tango gift card auto-fulfillment** — uses UTID `U453114` (Reward Link US); account must be funded; fallback admin_task on failure
- **Launch email blast** — `POST /api/launch/email-blast` queues personalized emails at 50/hr rate; `GET /api/launch/status` tracks progress; `POST /api/launch/test` sends preview

### Important: Zod imports in api-server
`api-server` routes must use `import { z } from "zod"` (not `zod/v4`). The api-server esbuild bundle does not include zod directly — prefer manual validation or import from `@workspace/api-zod`.

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: all Rippl routes in `src/routes/`
- Depends on: `@workspace/db`, `@workspace/api-zod`

### `artifacts/rippl` (`@workspace/rippl`)

React + Vite frontend at path `/`.

- Dark navy theme (#0a1628 background), teal accent (#0d9488)
- Uses `@workspace/api-client-react` generated hooks
- QR code generation via `qrcode` npm package

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

- `src/schema/referrers.ts` — referrers table
- `src/schema/referral_events.ts` — referral events table
- `src/schema/rewards.ts` — rewards table
- `src/schema/admin_tasks.ts` — admin tasks table (manual to-dos)

Run `pnpm --filter @workspace/db run push` to apply schema changes.
Run `pnpm --filter @workspace/scripts run seed` to seed sample data.

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec and Orval config. Run `pnpm --filter @workspace/api-spec run codegen` after spec changes.

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned by Replit)
- `PORT` — Server port (auto-assigned by Replit)
- `REPLIT_DOMAINS` — Used to generate referral URLs for QR codes
