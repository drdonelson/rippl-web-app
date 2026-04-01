import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let _pool: InstanceType<typeof Pool> | undefined;
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

/**
 * Strip `sslmode` from the connection string so pg-connection-string cannot
 * override the explicit `ssl` option we pass to the Pool constructor.
 * In pg ≥ 8, the parsed sslmode (even "prefer") is treated as "verify-full"
 * and takes precedence over the Pool constructor's ssl option — unless we
 * remove it from the URL first.
 */
function stripSslMode(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("sslmode");
    return u.toString();
  } catch {
    return url;
  }
}

function init() {
  if (_db) return _db;
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  const connectionString = stripSslMode(process.env.DATABASE_URL);

  // In production (Render → Supabase pooler) we need SSL but must disable
  // certificate verification because the pooler uses a self-signed chain.
  // Locally (Replit dev) the postgres server has no SSL at all.
  const ssl: pg.PoolConfig["ssl"] =
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false;

  _pool = new Pool({ connectionString, ssl });
  _db = drizzle(_pool, { schema });
  return _db;
}

// Lazy proxy — initializes on first use, not at import time.
// This prevents crashing at build time when DATABASE_URL is not yet set.
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return (init() as Record<string | symbol, unknown>)[prop];
  },
});

export const pool = new Proxy({} as InstanceType<typeof Pool>, {
  get(_target, prop) {
    init();
    return (_pool as Record<string | symbol, unknown>)[prop];
  },
});

export * from "./schema";
