import app from "./app";
import { logger } from "./lib/logger";
import { startOpenDentalPoller } from "./services/openDentalPoller";
import { pollDriveCentricSftp } from "./services/driveCentricSftp";
import { recoverMissedOnboardingSms } from "./services/onboardingSms";
import { db } from "@workspace/db";
import { practicesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { seedDefaultProfiles } from "./startup";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const DC_POLL_INTERVAL_MS = 60 * 60 * 1000; // 1 hour — DriveCentric sends daily exports

async function runDriveCentricSync() {
  try {
    const practices = await db
      .select({ id: practicesTable.id, cfg: practicesTable.integration_config })
      .from(practicesTable)
      .where(eq(practicesTable.vertical, "automotive"));

    const active = practices.filter(
      p => !!(p.cfg as Record<string, string>)?.["sftp_host"]
    );

    if (active.length === 0) return;

    logger.info({ count: active.length }, "[dc-poller] Running DriveCentric SFTP sync");
    for (const p of active) {
      const result = await pollDriveCentricSftp(p.id);
      logger.info({ result }, "[dc-poller] DriveCentric sync complete");
    }
  } catch (err) {
    logger.error({ err }, "[dc-poller] DriveCentric poll error");
  }
}

function startDriveCentricPoller() {
  logger.info({ intervalMs: DC_POLL_INTERVAL_MS }, "[dc-poller] Starting DriveCentric SFTP poller (first run in 60s)");
  // Delay first run 60s so health check passes before the SFTP/CSV memory spike.
  const firstRun = setTimeout(() => {
    runDriveCentricSync();
    const timer = setInterval(runDriveCentricSync, DC_POLL_INTERVAL_MS);
    timer.unref();
  }, 60_000);
  firstRun.unref();
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Seed required user profiles (non-fatal if it fails)
  seedDefaultProfiles().catch(err => {
    logger.error({ err }, "[startup] seedDefaultProfiles threw unexpectedly");
  });

  // Recover any onboarding SMSes that were scheduled but missed due to a server restart
  recoverMissedOnboardingSms().catch(err => {
    logger.error({ err }, "[startup] recoverMissedOnboardingSms threw unexpectedly");
  });

  // Start background polling services
  startOpenDentalPoller();
  startDriveCentricPoller();
});
