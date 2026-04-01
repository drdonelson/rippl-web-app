import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let _pool: InstanceType<typeof Pool> | undefined;
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

function sslConfig(url: string) {
  // Local databases (Replit dev, localhost) do not need SSL.
  // Remote databases (Supabase pooler, Render) use SSL with a self-signed
  // certificate chain that Node rejects by default — disable verification.
  if (url.includes("localhost") || url.includes("127.0.0.1")) return false;
  return { rejectUnauthorized: false };
}

function init() {
  if (_db) return _db;
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslConfig(process.env.DATABASE_URL),
  });
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
