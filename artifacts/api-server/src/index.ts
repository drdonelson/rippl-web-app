import app from "./app";
import { logger } from "./lib/logger";
import { startOpenDentalPoller } from "./services/openDentalPoller";
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

  // Start background polling service
  startOpenDentalPoller();
});
