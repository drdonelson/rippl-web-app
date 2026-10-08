import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
const url = new URL(process.env.TEST_DATABASE_URL || "http://missing");
if (
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  !url.pathname.endsWith("/rippl_safety_test")
) {
  throw new Error(
    "TEST_DATABASE_URL must point to a LOCAL disposable rippl_safety_test database. Production URLs are refused.",
  );
}
await mkdir("tmp/safety-tests", { recursive: true });
await build({
  entryPoints: ["tests/reward-safety.test.ts"],
  outfile: "tmp/safety-tests/test.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  external: [
    "pg-native",
    "drizzle-orm",
    "drizzle-orm/*",
    "twilio",
    "stripe",
    "pino",
    "express",
  ],
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
});
const run = spawnSync(
  process.execPath,
  ["--test", "tmp/safety-tests/test.mjs"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: url.toString(),
      NODE_ENV: "test",
      SMS_ENABLED: "false",
      TANGO_PLATFORM_NAME: "test",
      TANGO_PLATFORM_KEY: "test",
      TANGO_ACCOUNT_ID: "test",
      TANGO_CUSTOMER_ID: "test",
      STRIPE_SECRET_KEY: "",
      SENDGRID_API_KEY: "",
    },
  },
);
process.exitCode = run.status ?? 1;
