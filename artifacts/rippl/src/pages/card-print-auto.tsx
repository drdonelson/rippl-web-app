/**
 * Automotive referral card — front & back, 5×3.5in (standard business card landscape).
 * Open /card-print-auto in browser, Cmd+P → Save as PDF → print on card stock.
 */

const FLOWCODE_QR_URL = "/flowcode-qr.png";

const BG     = "#1c1c1e";
const ACCENT = "#a8a8b0";
const BRIGHT = "#d0d0d8";

export default function CardPrintAuto() {
  return (
    <div style={{ background: "white", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 48, padding: "64px 32px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          .card-sheet { page-break-after: always; }
        }
        @page { size: landscape; margin: 0.5in; }
      `}</style>

      <p className="no-print" style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", marginBottom: 8 }}>
        Cmd+P (Mac) or Ctrl+P (Windows) → Save as PDF → Print on card stock
      </p>

      {/* ── FRONT ── */}
      <div className="card-sheet">
        <p className="no-print" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 12, textAlign: "center" }}>Front</p>
        <div style={{ width: "5in", height: "3.5in", position: "relative", overflow: "hidden", borderRadius: 16, boxShadow: "0 25px 50px rgba(0,0,0,0.25)", display: "flex" }}>
          {/* Left half — light silver/white */}
          <div style={{ width: "50%", height: "100%", background: "#f4f4f5", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 32 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: "#606068", textTransform: "uppercase" }}>[Your Dealership]</div>
            </div>
            <div style={{ width: 32, height: 2, background: ACCENT, marginBottom: 12 }} />
            <p style={{ fontSize: 9, color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
              Refer a friend. Earn a reward.<br />It's that simple.
            </p>
          </div>

          {/* Right half — charcoal */}
          <div style={{ width: "50%", height: "100%", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {/* Chrome top accent line */}
            <div style={{ position: "absolute", top: 0, right: 0, width: "50%", height: 4, background: `linear-gradient(to right, #606068, ${BRIGHT})` }} />

            <p style={{ fontSize: 30, fontWeight: 900, color: "white", lineHeight: 1, textAlign: "center", padding: "0 24px", margin: 0 }}>
              Share<br />
              <span style={{ color: BRIGHT, fontStyle: "italic" }}>the Drive.</span>
            </p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", textAlign: "center", padding: "0 24px", margin: 0, lineHeight: 1.5 }}>
              Know someone looking for their next car?
            </p>

            {/* Chrome bottom accent line */}
            <div style={{ position: "absolute", bottom: 0, right: 0, width: "50%", height: 4, background: `linear-gradient(to right, #606068, ${BRIGHT})` }} />
          </div>

          {/* Rippl watermark */}
          <div style={{ position: "absolute", bottom: 10, right: 14, fontSize: 8, color: "rgba(255,255,255,0.15)", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase" }}>
            powered by Rippl
          </div>
        </div>
      </div>

      {/* ── BACK ── */}
      <div>
        <p className="no-print" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 12, textAlign: "center" }}>Back</p>
        <div style={{ width: "5in", height: "3.5in", position: "relative", overflow: "hidden", borderRadius: 16, boxShadow: "0 25px 50px rgba(0,0,0,0.25)", background: BG, display: "flex" }}>
          {/* Top chrome line */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(to right, #606068, ${BRIGHT}, #606068)` }} />
          {/* Bottom chrome line */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: `linear-gradient(to right, #606068, ${BRIGHT}, #606068)` }} />

          {/* Left — copy */}
          <div style={{ width: "50%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "24px 32px", gap: 16 }}>
            <p style={{ color: "white", fontSize: 20, fontWeight: 900, lineHeight: 1.2, margin: 0 }}>
              Refer a friend,<br />earn a reward.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                "Scan the QR code",
                "Enter your mobile number",
                "Get your personal link to share",
                "Earn $100 when they buy their next car",
              ].map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", background: `linear-gradient(135deg, ${BRIGHT}, ${ACCENT})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <span style={{ color: BG, fontSize: 9, fontWeight: 900 }}>{i + 1}</span>
                  </div>
                  <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 10, lineHeight: 1.4, margin: 0 }}>{step}</p>
                </div>
              ))}
            </div>
            <p style={{ color: ACCENT, fontSize: 9, fontFamily: "monospace", margin: 0 }}>joinrippl.com/find</p>
          </div>

          {/* Right — QR */}
          <div style={{ width: "50%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <div style={{ padding: 8, background: "white", borderRadius: 10 }}>
              <img src={FLOWCODE_QR_URL} alt="Scan to find your referral link" width={108} height={108} />
            </div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, textAlign: "center", padding: "0 16px", margin: 0 }}>
              Scan to find your<br />personal referral link
            </p>
          </div>

          {/* Rippl watermark */}
          <div style={{ position: "absolute", bottom: 14, right: 14, fontSize: 8, color: "rgba(255,255,255,0.12)", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase" }}>
            powered by Rippl
          </div>
        </div>
      </div>
    </div>
  );
}
