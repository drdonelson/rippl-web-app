import { logger } from "../lib/logger";

const TANGO_BASE_URL        = "https://api.tangocard.com/raas/v2";
const TANGO_PLATFORM_NAME   = process.env.TANGO_PLATFORM_NAME?.trim();
const TANGO_PLATFORM_KEY    = process.env.TANGO_PLATFORM_KEY?.trim();
const TANGO_ACCOUNT_ID      = process.env.TANGO_ACCOUNT_ID?.trim();
const TANGO_CUSTOMER_ID     = process.env.TANGO_CUSTOMER_ID?.trim();
const TANGO_EMAIL_TEMPLATE  = process.env.TANGO_EMAIL_TEMPLATE_ID?.trim() ?? "E813474";

// Reward Link US (No Donations) — lets recipient choose from hundreds of US gift cards
const REWARD_LINK_UTID = "U453114";
const CENTS_PER_DOLLAR = 100;

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
  externalRefId: string
): Promise<SendRewardResult> {
  if (!TANGO_ACCOUNT_ID || !TANGO_CUSTOMER_ID) {
    return { success: false, error: "Tango account not configured (TANGO_ACCOUNT_ID, TANGO_CUSTOMER_ID)" };
  }

  const payload = {
    accountIdentifier:  TANGO_ACCOUNT_ID,
    customerIdentifier: TANGO_CUSTOMER_ID,
    amount:             amountDollars * CENTS_PER_DOLLAR,
    utid:               REWARD_LINK_UTID,
    sendEmail:          true,
    emailTemplateId:    TANGO_EMAIL_TEMPLATE,
    externalRefID:      externalRefId,
    recipient: {
      email:     recipient.email,
      firstName: recipient.firstName,
      lastName:  recipient.lastName,
    },
  };

  logger.info({ customerIdentifier: TANGO_CUSTOMER_ID }, "Tango customer identifier being used");
  logger.info({ externalRefId, recipientEmail: recipient.email, amount: amountDollars }, "Sending Tango reward link");

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
