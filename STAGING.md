# Staging Setup

Two-step process: create a Supabase staging project, then point your local environment at it.

---

## Step 1 — Create the staging Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → New project
2. Name it **rippl-staging**, pick **us-east-1** (same region as prod)
3. Save the password somewhere — you'll need it for DATABASE_URL

Once the project is created, open the SQL editor and paste + run:

```
db/migrations/001_baseline.sql
```

That creates all tables with RLS enabled. The staging DB is now schema-identical to prod.

---

## Step 2 — Get the staging connection strings

In the Supabase dashboard for rippl-staging:

| Setting | Where to find it |
|---|---|
| `SUPABASE_URL` | Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Project Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role secret |
| `DATABASE_URL` | Project Settings → Database → Connection string (URI mode) |

---

## Step 3 — Local dev against staging

Create `artifacts/api-server/.env.staging` (never commit this file):

```bash
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:password@db.xxxx.supabase.co:5432/postgres
# Keep these pointing to real services or use test credentials:
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+18555027538
BREVO_API_KEY=...
TANGO_PLATFORM_NAME=DiscoveryExpeditionsPLLC
TANGO_PLATFORM_KEY=...
TANGO_ACCOUNT_ID=A78876593
TANGO_CUSTOMER_ID=G32251981
TANGO_EMAIL_TEMPLATE_ID=E813474
APP_URL=http://localhost:3000
NODE_ENV=development
SMS_ENABLED=false
```

> Set `SMS_ENABLED=false` in staging — prevents accidental real SMS to test patients.

---

## Running migrations

When you add a new column to the Drizzle schema:

1. Write the migration SQL in `db/migrations/NNN_describe_change.sql`
2. Apply it to staging first:
   ```bash
   export DATABASE_URL="postgresql://..."   # staging connection string
   ./db/migrate.sh db/migrations/NNN_describe_change.sql
   ```
3. Test your feature against staging for at least one poll cycle
4. Apply to prod:
   ```bash
   export DATABASE_URL="postgresql://..."   # prod connection string
   ./db/migrate.sh db/migrations/NNN_describe_change.sql
   ```
5. Deploy the code: `./deploy.sh "description"`

**Never deploy code that references a new column before running the migration on prod.**
That's what caused the `channel_partner_id` crash on 2026-09-02.

---

## Migration file naming

```
db/migrations/
  001_baseline.sql          ← full schema for fresh installs
  002_add_billing_columns.sql  ← applied prod 2026-09-02
  003_your_next_change.sql  ← increment the number each time
```

---

## Staging Render service (optional, ~$7/month)

If you want a persistent staging URL (useful for testing webhooks and pollers end-to-end):

1. Go to [render.com](https://render.com) → New Web Service
2. Connect the same GitHub repo (`drdonelson/rippl-web-app`)
3. Set branch to `staging`
4. Copy all env vars from prod, then swap the Supabase vars to staging values
5. Set `SMS_ENABLED=false` and `APP_URL=https://rippl-staging.onrender.com`

Then create the `staging` branch:
```bash
git checkout -b staging
git push -u origin staging
```

Future workflow: develop on `main`, merge to `staging` to test, then confirm prod is ready to deploy.
