import { logger } from "./logger";

/**
 * Global SMS kill-switch.
 * Set SMS_ENABLED=false in Render environment variables to suppress all
 * outbound Twilio calls without changing any code — useful during A2P review.
 * Default is true (SMS active) when the variable is absent or any value
 * other than the exact string "false".
 */
export const SMS_ENABLED = process.env.SMS_ENABLED !== "false";

if (!SMS_ENABLED) {
  logger.warn("SMS_ENABLED=false — all outbound Twilio SMS calls are suppressed (dry-run mode)");
}
