#!/usr/bin/env bash
# Usage: ./db/migrate.sh db/migrations/003_my_change.sql
# Applies a single migration file to the database pointed at by DATABASE_URL.
# DATABASE_URL is read from the environment — set it before running:
#   export DATABASE_URL="postgresql://postgres:password@db.xxxx.supabase.co:5432/postgres"

set -euo pipefail

FILE="${1:-}"
if [ -z "$FILE" ]; then
  echo "Usage: ./db/migrate.sh <migration-file.sql>"
  echo "Example: ./db/migrate.sh db/migrations/003_add_something.sql"
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo "File not found: $FILE"
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Export it first:"
  echo "  export DATABASE_URL=\"postgresql://postgres:password@db.xxxx.supabase.co:5432/postgres\""
  exit 1
fi

echo "Running migration: $FILE"
psql "$DATABASE_URL" -f "$FILE"
echo "Done."
