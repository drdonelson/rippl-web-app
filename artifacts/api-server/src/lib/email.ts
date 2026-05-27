const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

export interface EmailParams {
  to: string;
  from: { email: string; name: string };
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail(params: EmailParams): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY not configured");

  const body: Record<string, unknown> = {
    sender:      { email: params.from.email, name: params.from.name },
    to:          [{ email: params.to }],
    subject:     params.subject,
    htmlContent: params.html,
  };
  if (params.text)    body.textContent = params.text;
  if (params.replyTo) body.replyTo     = { email: params.replyTo };

  const response = await fetch(BREVO_API_URL, {
    method:  "POST",
    headers: {
      "api-key":      apiKey,
      "Content-Type": "application/json",
      "Accept":       "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(`Brevo ${response.status}: ${err.message ?? "unknown error"}`);
  }
}
