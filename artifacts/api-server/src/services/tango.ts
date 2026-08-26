import { logger } from "../lib/logger";
import { sendEmail } from "../lib/email";

const TANGO_BASE_URL        = "https://api.tangocard.com/raas/v2";
const TANGO_PLATFORM_NAME   = process.env.TANGO_PLATFORM_NAME?.trim();
const TANGO_PLATFORM_KEY    = process.env.TANGO_PLATFORM_KEY?.trim();
const TANGO_ACCOUNT_ID      = process.env.TANGO_ACCOUNT_ID?.trim();
const TANGO_CUSTOMER_ID     = process.env.TANGO_CUSTOMER_ID?.trim();
const TANGO_EMAIL_TEMPLATE  = process.env.TANGO_EMAIL_TEMPLATE_ID?.trim() ?? "E813474";

// Reward Link US (No Donations) — lets recipient choose from hundreds of US gift cards
const REWARD_LINK_UTID = "U453114";

// Log which Tango env vars are present at startup (values never logged)
logger.info(
  {
    hasPlatformName:  !!TANGO_PLATFORM_NAME,
    hasPlatformKey:   !!TANGO_PLATFORM_KEY,
    hasAccountId:     !!TANGO_ACCOUNT_ID,
    hasCustomerId:    !!TANGO_CUSTOMER_ID,
    emailTemplateId:  TANGO_EMAIL_TEMPLATE,
  },
  "Tango config check",
);

interface TangoRecipient {
  email: string;
  firstName: string;
  lastName: string;
}

interface SendRewardResult {
  success: boolean;
  orderId?: string;
  status?: string;
  error?: string;
}

function getAuthHeader(): string {
  if (!TANGO_PLATFORM_NAME || !TANGO_PLATFORM_KEY) {
    throw new Error("Tango credentials not configured (TANGO_PLATFORM_NAME, TANGO_PLATFORM_KEY)");
  }
  const encoded = Buffer.from(`${TANGO_PLATFORM_NAME}:${TANGO_PLATFORM_KEY}`).toString("base64");
  return `Basic ${encoded}`;
}

export async function sendAmazonRewardLink(
  recipient: TangoRecipient,
  amountDollars: number,
  externalRefId: string,
  emailTemplateId?: string | null,
): Promise<SendRewardResult> {
  if (!TANGO_ACCOUNT_ID || !TANGO_CUSTOMER_ID) {
    return { success: false, error: "Tango account not configured (TANGO_ACCOUNT_ID, TANGO_CUSTOMER_ID)" };
  }

  const payload = {
    accountIdentifier:  TANGO_ACCOUNT_ID,
    customerIdentifier: TANGO_CUSTOMER_ID,
    amount:             amountDollars,
    utid:               REWARD_LINK_UTID,
    sendEmail:          true,
    emailTemplateId:    emailTemplateId ?? TANGO_EMAIL_TEMPLATE,
    externalRefID:      externalRefId,
    recipient: {
      email:     recipient.email,
      firstName: recipient.firstName,
      lastName:  recipient.lastName,
    },
  };

  logger.info({ tangoRequestBody: payload }, "Tango full request body");

  try {
    const response = await fetch(`${TANGO_BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Authorization": getAuthHeader(),
        "Content-Type":  "application/json",
        "Accept":        "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    });

    const body = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      const msg = (body?.message as string) || (body?.i18nKey as string) || `HTTP ${response.status}`;
      logger.error({ status: response.status, body, externalRefId }, "Tango order failed");
      return { success: false, error: msg };
    }

    const orderId = body.referenceOrderID as string;
    const status  = body.status as string;

    logger.info({ orderId, status, recipientEmail: recipient.email }, "Tango reward link sent");
    return { success: true, orderId, status };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, externalRefId }, "Tango request threw");
    return { success: false, error: message };
  }
}

const LOW_BALANCE_THRESHOLD = 500; // dollars
let lastBalanceAlertSent = 0;     // epoch ms — rate-limits to once per 24 hours

export async function checkAndAlertTangoBalance(): Promise<void> {
  const now = Date.now();
  if (now - lastBalanceAlertSent < 86_400_000) return; // already alerted within 24 hours

  const bal = await getAccountBalance();
  if (!bal || bal.balance >= LOW_BALANCE_THRESHOLD) return;

  lastBalanceAlertSent = now;
  const alertEmail = process.env.ALERT_EMAIL || "david@hallmarkdds.com";
  try {
    await sendEmail({
      to:      alertEmail,
      from:    { email: process.env.SENDGRID_FROM_EMAIL ?? "hello@hallmarkdds.com", name: "Rippl" },
      subject: `⚠️ Tango balance low — $${bal.balance.toFixed(2)} remaining`,
      html:    `<p>Your Tango gift card account balance has dropped to <strong>$${bal.balance.toFixed(2)}</strong>.</p><p>At $35–$100 per reward, you have roughly ${Math.floor(bal.balance / 35)}–${Math.floor(bal.balance / 100)} gift cards remaining before claims fall to admin tasks. Top up at <a href="https://app.tangocard.com">app.tangocard.com</a>.</p>`,
    });
    logger.warn({ balance: bal.balance, alertSentTo: alertEmail }, "Tango low balance alert sent");
  } catch (err) {
    logger.error({ err }, "Failed to send Tango low balance alert email");
  }
}

export async function getAccountBalance(): Promise<{ balance: number; currency: string } | null> {
  if (!TANGO_ACCOUNT_ID) return null;
  try {
    const response = await fetch(`${TANGO_BASE_URL}/accounts/${TANGO_ACCOUNT_ID}`, {
      headers: {
        "Authorization": getAuthHeader(),
        "Accept":        "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const data = await response.json() as Record<string, unknown>;
    return {
      balance:  (data.currentBalance as number) ?? 0,
      currency: (data.currencyCode   as string) ?? "USD",
    };
  } catch {
    return null;
  }
}
