import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useAuth } from "@/contexts/auth-context";
import { usePractice } from "@/contexts/practice-context";
import { useVertical } from "@/lib/useVertical";

const PUBLIC_BASE = "https://joinrippl.com";

export interface PrintBranding {
  /** Practice or dealership name to print. */
  name: string;
  /** Lookup URL encoding this practice — what the QR code resolves to. */
  findUrl: string;
  /** Short human-readable form printed beneath the QR. */
  findLabel: string;
  /** Generated QR as a data URL. Empty until generation finishes (or if it fails). */
  qrSrc: string;
}

/**
 * Branding for printable assets (posters, cards), driven by the logged-in practice.
 *
 * The print pages used to hard-code "Hallmark" or "[Your Dealership]" and a bare
 * joinrippl.com/find, which meant a second practice printed another practice's name and —
 * worse — a QR code resolving to the wrong tenant's lookup. The lookup is now tenant-scoped,
 * so a bare link resolves to the default practice: a Carlock customer scanning a Carlock
 * poster would have been searched against Hallmark and told "no account found".
 *
 * The QR is generated locally from findUrl rather than served from the checked-in Flowcode
 * PNGs. Those encode the dental URL and cannot be re-pointed per practice, and local
 * generation also means a printed page never depends on a network fetch resolving. Note that
 * this gives up Flowcode's scan analytics — create a per-practice Flowcode if that matters
 * more than the link being correct.
 */
export function usePrintBranding(opts?: { qrWidth?: number; dark?: string }): PrintBranding {
  const { isDemo } = useAuth();
  const { myPractice } = usePractice();
  const vertical = useVertical();
  const isAuto = vertical === "automotive";

  const fallbackName = isDemo
    ? (isAuto ? "Summit Auto Group" : "Smile Care Dental")
    : (isAuto ? "[Your Dealership]" : "[Your Practice]");

  const name = myPractice?.white_label_name?.trim() || myPractice?.name?.trim() || fallbackName;
  const slug = myPractice?.slug?.trim() ?? "";
  const findUrl   = slug ? `${PUBLIC_BASE}/find?p=${encodeURIComponent(slug)}` : `${PUBLIC_BASE}/find`;
  const findLabel = slug ? `joinrippl.com/find?p=${slug}` : "joinrippl.com/find";

  const qrWidth = opts?.qrWidth ?? 296;
  const dark    = opts?.dark ?? "#1c1c1e";
  const [qrSrc, setQrSrc] = useState("");

  useEffect(() => {
    QRCode.toDataURL(findUrl, { width: qrWidth, margin: 2, color: { dark, light: "#ffffff" } })
      .then(setQrSrc)
      .catch(() => setQrSrc(""));
  }, [findUrl, qrWidth, dark]);

  return { name, findUrl, findLabel, qrSrc };
}
