# Rippl — Patient Referral Reward Platform

Rippl is a full-stack internal dashboard for Hallmark Dental that manages patient referral rewards across multiple locations. Staff can track referral events, manage referrers, send reward offers ($100 In-House Credit, $50 Gift Card via Tango, or $50 Charity Donation), and import patients directly from Open Dental.

## Tech Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS (Wouter routing)
- **Backend:** Express + TypeScript (Node.js)
- **Database:** PostgreSQL via Drizzle ORM
- **Monorepo:** pnpm workspaces

## Project Structure

```
artifacts/
  api-server/     Express API server
  rippl/          React frontend (staff dashboard)
lib/
  db/             Drizzle schema + migrations
  api-client-react/  Auto-generated React Query hooks
  api-zod/        Auto-generated Zod validators
scripts/          Database seed / admin scripts
```

## Environment Variables

Copy `.env.example` (if present) or create a `.env` file in the project root with the following variables:

### Open Dental Integration

| Variable | Description | Required |
|---|---|---|
| `OPEN_DENTAL_URL` | Base URL for the Open Dental API (e.g. `https://api.opendental.com`) | Yes |
| `OPEN_DENTAL_KEY` | Open Dental Developer API key | Yes |
| `OPEN_DENTAL_CUSTOMER_KEY` | Customer key for **Hallmark Dental – Brentwood** | Yes |
| `OPEN_DENTAL_CUSTOMER_KEY_LEWISBURG` | Customer key for **Hallmark Dental – Lewisburg** | When activating Lewisburg |
| `OPEN_DENTAL_CUSTOMER_KEY_GREENBRIER` | Customer key for **Hallmark Dental – Greenbrier** | When activating Greenbrier |

### Database

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (e.g. `postgresql://user:pass@host:5432/db`) | Yes |

### Email (SendGrid)

| Variable | Description | Required |
|---|---|---|
| `SENDGRID_API_KEY` | SendGrid API key for sending reward launch emails | Yes |

### Reward Fulfillment (Tango)

| Variable | Description | Required |
|---|---|---|
| `TANGO_API_KEY` | Tango Card API key for issuing gift cards | When using gift card rewards |
| `TANGO_ACCOUNT_ID` | Tango account identifier | When using gift card rewards |

### Application

| Variable | Description | Required |
|---|---|---|
| `PORT` | Port the API server listens on (default: `3001`) | No |
| `NODE_ENV` | `development` or `production` | No |

## Getting Started

```bash
# Install dependencies
pnpm install

# Push database schema
pnpm --filter @workspace/db run db:push

# Seed office locations (requires customer keys to be set)
pnpm --filter @workspace/scripts run seed-offices

# Start development servers
pnpm --filter @workspace/api-server run dev   # API on $PORT
pnpm --filter @workspace/rippl run dev         # Frontend on $PORT
```

## Multi-Location Support

Rippl supports three Hallmark Dental locations:

- **Brentwood** — active by default (requires `OPEN_DENTAL_CUSTOMER_KEY`)
- **Lewisburg** — activate by setting `OPEN_DENTAL_CUSTOMER_KEY_LEWISBURG` and re-running `seed-offices`
- **Greenbrier** — activate by setting `OPEN_DENTAL_CUSTOMER_KEY_GREENBRIER` and re-running `seed-offices`

## Reward Types

| Type | Value | Fulfillment |
|---|---|---|
| In-House Credit | $100 | Applied manually at front desk |
| Gift Card | $50 | Issued automatically via Tango Card API |
| Charity Donation | $50 | Processed manually |
