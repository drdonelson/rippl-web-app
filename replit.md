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

### Database Tables
- `referrers` — Patient referrers enrolled in the program
- `referral_events` — Individual referral events tracking
- `rewards` — Issued rewards (types: in-house-credit, amazon-gift-card, charity-donation)
- `admin_tasks` — Manual to-do items for charity donations until API is integrated

### Reward Types
- `in-house-credit` — $100 applied to patient account
- `amazon-gift-card` — $50 digital gift card via email
- `charity-donation` — $50 donated on referrer's behalf (creates admin_task for manual processing)

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
