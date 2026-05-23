/**
 * Printable card back only — 5.5×4.25in (A2 card / half-letter landscape).
 * Cmd+P → Save as PDF → print on card stock.
 * Design: dark charcoal + teal, matching the waiting-room slide deck.
 */

const FLOWCODE_QR_URL = "/flowcode-qr.png";

export default function CardBack() {
  return (
    <div className="bg-slate-100 min-h-screen flex flex-col items-center justify-center py-12 px-8">
      <style>{`
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
        }
        @page { size: 5.5in 4.25in landscape; margin: 0; }
      `}</style>

      <p className="no-print text-slate-400 text-sm text-center mb-6">
        Cmd+P → check "Background graphics" → Save as PDF → Print 5.5×4.25in on card stock
      </p>

      <div
        style={{ width: "5.5in", height: "4.25in", background: "#0d1117", position: "relative", overflow: "hidden", borderRadius: 16 }}
        className="shadow-2xl flex"
      >
        {/* Teal rounded border */}
        <div style={{ position: "absolute", inset: 7, borderRadius: 10, border: "2px solid #2dd4bf", pointerEvents: "none" }} />

        {/* Logo box top-left */}
        <div style={{ position: "absolute", top: 12, left: 12, background: "#111827", border: "1px solid #2dd4bf", padding: "4px 10px", minWidth: 90 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "white", letterSpacing: "0.1em", lineHeight: 1.4 }}>
            HALLMARK<br />DENTAL
          </div>
        </div>

        {/* Powered by Rippl */}
        <div style={{ position: "absolute", bottom: 10, right: 12, display: "flex", gap: 4, alignItems: "center" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#2dd4bf" }} />
          <span style={{ fontSize: 7, color: "white", fontWeight: 600, letterSpacing: "0.05em" }}>Powered by Rippl</span>
        </div>

        {/* Left — copy */}
        <div className="w-1/2 h-full flex flex-col justify-center" style={{ padding: "16px 16px 16px 20px", gap: 12, paddingTop: 44 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "white", lineHeight: 1.1, letterSpacing: "-0.01em" }}>
            How to get<br />your referral link
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "Scan the QR code →",
              "Enter your mobile number",
              "Get your personal link to share",
              "Earn a gift card when they become a patient",
            ].map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#2dd4bf", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <span style={{ color: "#0d1117", fontWeight: 900, fontSize: 10 }}>{i + 1}</span>
                </div>
                <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, lineHeight: 1.4 }}>{step}</p>
              </div>
            ))}
          </div>

          <p style={{ color: "#2dd4bf", fontSize: 9, fontFamily: "monospace", marginTop: 4 }}>joinrippl.com/find</p>
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: "#1e3a5f", margin: "20px 0" }} />

        {/* Right — QR */}
        <div className="w-1/2 h-full flex flex-col items-center justify-center" style={{ gap: 10 }}>
          <div style={{ background: "white", padding: 8, borderRadius: 8 }}>
            <img
              src={FLOWCODE_QR_URL}
              alt="Scan to find your referral link"
              width={150}
              height={150}
            />
          </div>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, textAlign: "center", lineHeight: 1.5 }}>
            Scan to find your<br />personal referral link
          </p>
        </div>
      </div>
    </div>
  );
}
