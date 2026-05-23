/**
 * Printable referral card — front & back, 5×3.5in (standard business card landscape).
 * Open /card-print in browser, Cmd+P → Save as PDF → send to printer.
 * Design: dark charcoal + teal, matching the waiting-room slide deck.
 */

const FLOWCODE_QR_URL = "/flowcode-qr.png";

const TIERS = [
  { label: "INFLUENCER", amt: "$35",  sub: "1st referral", border: "#2dd4bf" },
  { label: "AMPLIFIER",  amt: "$50",  sub: "3 referrals",  border: "#2dd4bf" },
  { label: "AMBASSADOR", amt: "$75",  sub: "6 referrals",  border: "#2dd4bf" },
  { label: "LEGEND",     amt: "$100", sub: "10 referrals", border: "#7c3aed" },
];

export default function CardPrint() {
  return (
    <div className="bg-slate-100 min-h-screen flex flex-col items-center justify-center gap-12 py-16 px-8">
      <style>{`
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        @media print {
          body { margin: 0; background: white; }
          .no-print { display: none !important; }
          .card-sheet { page-break-after: always; }
        }
        @page { size: landscape; margin: 0.5in; }
      `}</style>

      <p className="no-print text-slate-500 text-sm text-center mb-2">
        Cmd+P (Mac) or Ctrl+P (Windows) → check "Background graphics" → Save as PDF → Print on card stock
      </p>

      {/* ── FRONT ── */}
      <div className="card-sheet">
        <p className="no-print text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3 text-center">Front</p>
        <div
          style={{ width: "5in", height: "3.5in", background: "#0d1117", position: "relative", overflow: "hidden", borderRadius: 16 }}
          className="shadow-2xl flex flex-col"
        >
          {/* Teal border */}
          <div style={{ position: "absolute", inset: 6, borderRadius: 10, border: "2px solid #2dd4bf", pointerEvents: "none" }} />

          {/* Logo box top-left */}
          <div style={{ position: "absolute", top: 10, left: 10, background: "#111827", border: "1px solid #2dd4bf", padding: "4px 8px", minWidth: 80 }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: "white", letterSpacing: "0.1em", lineHeight: 1.4 }}>
              HALLMARK<br />DENTAL
            </div>
          </div>

          {/* Powered by Rippl bottom-right */}
          <div style={{ position: "absolute", bottom: 8, right: 10, display: "flex", gap: 4, alignItems: "center" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#2dd4bf" }} />
            <span style={{ fontSize: 6, color: "white", fontWeight: 600, letterSpacing: "0.05em" }}>Powered by Rippl</span>
          </div>

          {/* Center content */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "white", lineHeight: 1, letterSpacing: "-0.02em" }}>Refer a friend.</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#2dd4bf", lineHeight: 1, letterSpacing: "-0.02em" }}>Earn rewards.</div>
            <div style={{ fontSize: 8, color: "#94a3b8", marginTop: 2, textAlign: "center" }}>
              Share your personal link — earn automatically when friends visit.
            </div>

            {/* Tier badges */}
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {TIERS.map(t => (
                <div key={t.label} style={{
                  border: `1px solid ${t.border}`, borderRadius: 6,
                  background: "#0f1e2e", padding: "4px 6px", textAlign: "center", minWidth: 50,
                }}>
                  <div style={{ fontSize: 4.5, fontWeight: 700, color: "#2dd4bf", letterSpacing: "0.1em" }}>{t.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "white", lineHeight: 1 }}>{t.amt}</div>
                  <div style={{ fontSize: 5, color: "#94a3b8" }}>{t.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 6.5, color: "#94a3b8", marginTop: 4, textAlign: "center" }}>
              Ask the front desk for your personal referral link today
            </div>
          </div>
        </div>
      </div>

      {/* ── BACK ── */}
      <div>
        <p className="no-print text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3 text-center">Back</p>
        <div
          style={{ width: "5in", height: "3.5in", background: "#0d1117", position: "relative", overflow: "hidden", borderRadius: 16 }}
          className="shadow-2xl flex"
        >
          {/* Teal border */}
          <div style={{ position: "absolute", inset: 6, borderRadius: 10, border: "2px solid #2dd4bf", pointerEvents: "none" }} />

          {/* Logo box top-left */}
          <div style={{ position: "absolute", top: 10, left: 10, background: "#111827", border: "1px solid #2dd4bf", padding: "4px 8px", minWidth: 80 }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: "white", letterSpacing: "0.1em", lineHeight: 1.4 }}>
              HALLMARK<br />DENTAL
            </div>
          </div>

          {/* Powered by Rippl */}
          <div style={{ position: "absolute", bottom: 8, right: 10, display: "flex", gap: 4, alignItems: "center" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#2dd4bf" }} />
            <span style={{ fontSize: 6, color: "white", fontWeight: 600, letterSpacing: "0.05em" }}>Powered by Rippl</span>
          </div>

          {/* Left — steps */}
          <div style={{ width: "55%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "16px 16px 16px 16px", gap: 10, paddingTop: 36 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#2dd4bf" }}>How to get your link</div>
            {[
              "Scan the QR code →",
              "Enter your mobile number",
              "Get your personal referral link",
              "Earn when they become a patient",
            ].map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#2dd4bf", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#0d1117", fontWeight: 900, fontSize: 9 }}>{i + 1}</span>
                </div>
                <p style={{ color: "white", fontSize: 9, lineHeight: 1.3 }}>{step}</p>
              </div>
            ))}
            <p style={{ color: "#2dd4bf", fontSize: 7, fontFamily: "monospace", marginTop: 4 }}>joinrippl.com/find</p>
          </div>

          {/* Divider */}
          <div style={{ width: 1, background: "#1e3a5f", margin: "20px 0" }} />

          {/* Right — QR */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <div style={{ background: "white", padding: 6, borderRadius: 6 }}>
              <img
                src={FLOWCODE_QR_URL}
                alt="Scan to find your referral link"
                width={110}
                height={110}
              />
            </div>
            <p style={{ color: "#94a3b8", fontSize: 7, textAlign: "center", lineHeight: 1.4 }}>
              Scan to find your<br />personal referral link
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
