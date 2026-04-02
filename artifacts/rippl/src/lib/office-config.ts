export interface OfficeConfig {
  key: string;
  label: string;
  phone: string;
  address: string;
  bookingUrl: string | null;
}

// ── Office phone numbers ──────────────────────────────────────────────────────

const BRENTWOOD_PHONE  = "(615) 961-0330";
const LEWISBURG_PHONE  = "(931) 359-3368";
const GREENBRIER_PHONE = "(615) 643-0800";

// ── Booking URLs — base URLs already include the PMS referrer_id param.
// buildBookingUrl() appends &rippl_ref=CODE at redirect time.

const BRENTWOOD_BOOKING_URL  = "https://book.allinone.dental/hallmark-dental-brentwood?referrer_id=1";
const LEWISBURG_BOOKING_URL  = "https://book.allinone.dental/hallmark-dental-lewisburg?referrer_id=1";
const GREENBRIER_BOOKING_URL = "https://book.allinone.dental/greenbrier?referrer_id=3";

export const OFFICE_CONFIG: OfficeConfig[] = [
  {
    key: "Brentwood",
    label: "Brentwood",
    phone: BRENTWOOD_PHONE,
    address: "Cool Springs / Brentwood, TN",
    bookingUrl: BRENTWOOD_BOOKING_URL,
  },
  {
    key: "Lewisburg",
    label: "Lewisburg",
    phone: LEWISBURG_PHONE,
    address: "Lewisburg, TN",
    bookingUrl: LEWISBURG_BOOKING_URL,
  },
  {
    key: "Greenbrier",
    label: "Greenbrier",
    phone: GREENBRIER_PHONE,
    address: "Greenbrier, TN",
    bookingUrl: GREENBRIER_BOOKING_URL,
  },
];

export function getOffice(key: string): OfficeConfig | undefined {
  return OFFICE_CONFIG.find(o => o.key === key);
}

export function phoneHref(phone: string): string {
  return "tel:" + phone.replace(/\D/g, "");
}

/**
 * buildBookingUrl — appends &rippl_ref=CODE to a booking URL that already
 * contains a query string (e.g. ?referrer_id=1).
 *
 * Uses the URL API so that:
 *  - rippl_ref is never duplicated (set always overwrites)
 *  - CODE is properly percent-encoded
 *  - The existing referrer_id param is never touched
 *
 * Falls back to simple string append if the URL cannot be parsed.
 */
export function buildBookingUrl(baseUrl: string, referralCode: string): string {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set("rippl_ref", referralCode);
    return url.toString();
  } catch {
    return `${baseUrl}&rippl_ref=${encodeURIComponent(referralCode)}`;
  }
}
