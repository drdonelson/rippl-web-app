import { logger } from "../lib/logger";

const VAGARO_TOKEN_URL = "https://api.vagaro.com/oauth2/token";
const VAGARO_API_BASE  = "https://api.vagaro.com/v2";

interface VagaroTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Simple in-process token cache to avoid hammering the auth endpoint.
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export async function getVagaroAccessToken(
  apiKey: string,
  apiSecret: string,
): Promise<string> {
  const cacheKey = `${apiKey}:${apiSecret}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.token;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id:  apiKey,
    client_secret: apiSecret,
  });

  const res = await fetch(VAGARO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Vagaro OAuth failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as VagaroTokenResponse;
  // Cache with a 60-second buffer before real expiry.
  tokenCache.set(cacheKey, {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  });

  return data.access_token;
}

export interface VagaroFormField {
  fieldName: string;
  fieldValue: string;
}

export interface VagaroFormResponse {
  formResponseId: string;
  fields: VagaroFormField[];
}

export async function getFormResponse(
  formResponseId: string,
  accessToken: string,
): Promise<VagaroFormResponse | null> {
  const res = await fetch(`${VAGARO_API_BASE}/formresponses/${formResponseId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    logger.warn(
      { formResponseId, status: res.status },
      "[vagaro] Could not fetch form response",
    );
    return null;
  }

  return (await res.json()) as VagaroFormResponse;
}

/**
 * Parse a referrer name from a list of form responses.
 * Looks for a field whose name contains "refer" (case-insensitive).
 * Returns the trimmed value of the first matching field, or null if none found.
 */
export function extractReferralName(responses: VagaroFormResponse[]): string | null {
  for (const r of responses) {
    for (const f of r.fields) {
      if (/refer/i.test(f.fieldName) && f.fieldValue?.trim()) {
        return f.fieldValue.trim();
      }
    }
  }
  return null;
}
