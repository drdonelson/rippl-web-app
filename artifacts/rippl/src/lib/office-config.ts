export interface OfficeConfig {
  key: string;
  label: string;
  phone: string;
  address: string;
  bookingUrl: string | null;
}

// ── Office phone numbers ──────────────────────────────────────────────────────
// Update BRENTWOOD_PHONE / LEWISBURG_PHONE / GREENBRIER_PHONE with real numbers.
// Set bookingUrl to the practice's real online booking link when available;
// null = fall back to the appointment request form on this page.

const BRENTWOOD_PHONE  = "(615) 961-0330";
const LEWISBURG_PHONE  = "(931) 359-3368";
const GREENBRIER_PHONE = "(615) 643-0800";

// const BRENTWOOD_BOOKING_URL  = "https://yourpms.com/book/brentwood";
// const LEWISBURG_BOOKING_URL  = "https://yourpms.com/book/lewisburg";
// const GREENBRIER_BOOKING_URL = "https://yourpms.com/book/greenbrier";

export const OFFICE_CONFIG: OfficeConfig[] = [
  {
    key: "Brentwood",
    label: "Brentwood",
    phone: BRENTWOOD_PHONE,
    address: "Cool Springs / Brentwood, TN",
    bookingUrl: null,
  },
  {
    key: "Lewisburg",
    label: "Lewisburg",
    phone: LEWISBURG_PHONE,
    address: "Lewisburg, TN",
    bookingUrl: null,
  },
  {
    key: "Greenbrier",
    label: "Greenbrier",
    phone: GREENBRIER_PHONE,
    address: "Greenbrier, TN",
    bookingUrl: null,
  },
];

export function getOffice(key: string): OfficeConfig | undefined {
  return OFFICE_CONFIG.find(o => o.key === key);
}

export function phoneHref(phone: string): string {
  return "tel:" + phone.replace(/\D/g, "");
}
