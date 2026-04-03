/**
 * app-url.ts — Single source of truth for public app URL resolution.
 *
 * Priority order:
 *   1. __PUBLIC_APP_URL__ — baked into the bundle at build time from PUBLIC_APP_URL env var.
 *      Set to "https://www.joinrippl.com" in the Replit shared env vars. This is the
 *      most reliable source and is safe to use in both dev and production.
 *   2. window.location.origin — fallback. Correct in production (joinrippl.com),
 *      but may be a Replit preview URL in dev.
 *
 * Safety rules:
 *   - Never emits a bare localhost URL when a real public URL is known.
 *   - Never emits 127.0.0.1 in place of the production domain.
 *   - __PUBLIC_APP_URL__ is injected by vite.config.ts via `define`.
 *
 * Debug: check console for "[AppUrl]" logs when QR modal opens.
 */

declare const __PUBLIC_APP_URL__: string;

const LOCALHOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/;

/**
 * Returns the canonical public base URL for this app (no trailing slash).
 * Example return value: "https://www.joinrippl.com"
 */
export function getPublicAppUrl(): string {
  // Priority 1: build-time baked PUBLIC_APP_URL (set to https://www.joinrippl.com)
  if (typeof __PUBLIC_APP_URL__ !== "undefined" && __PUBLIC_APP_URL__) {
    const baked = __PUBLIC_APP_URL__.replace(/\/$/, "");
    if (baked && !LOCALHOST_RE.test(baked)) {
      return baked;
    }
  }

  // Priority 2: current browser origin
  const origin = (typeof window !== "undefined" ? window.location.origin : "").replace(/\/$/, "");

  // Never return a bare localhost as the public URL if we have nothing better
  if (LOCALHOST_RE.test(origin)) {
    console.warn("[AppUrl] WARNING: resolving to localhost — PUBLIC_APP_URL is not set correctly");
  }

  return origin || "https://www.joinrippl.com";
}

/**
 * Builds a fully-qualified referral landing page URL.
 * Output example: "https://joinrippl.com/refer?ref=MIKE1001"
 */
export function buildReferralUrl(referralCode: string, basePath = ""): string {
  return `${getPublicAppUrl()}${basePath}/refer?ref=${encodeURIComponent(referralCode)}`;
}
