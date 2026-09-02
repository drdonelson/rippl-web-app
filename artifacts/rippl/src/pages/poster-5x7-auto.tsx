const FLOWCODE_QR_URL = "/flowcode-qr-poster.png";

const BG     = "#1c1c1e";
const ACCENT = "#a8a8b0";
const BRIGHT = "#d0d0d8";

export default function Poster5x7Auto() {
  return (
    <>
      <style>{`
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        @page { size: 8.5in 11in portrait; margin: 0; }
        .page-wrap { width: 8.5in; height: 11in; display: flex; align-items: center; justify-content: center; background: #111; }
      `}</style>

      <div className="page-wrap">
        <div style={{
          width: "5in",
          height: "7in",
          background: BG,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}>
          {/* Top bar — chrome */}
          <div style={{ height: 8, background: `linear-gradient(to right, #606068, ${BRIGHT}, #606068)`, flexShrink: 0 }} />

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 36px 0" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: ACCENT, textTransform: "uppercase" }}>[Your Dealership]</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Referral Rewards</div>
          </div>

          {/* Hero */}
          <div style={{ padding: "24px 36px 20px", flex: "0 0 auto" }}>
            <div style={{ fontSize: 52, fontWeight: 900, color: "white", lineHeight: 1, letterSpacing: "-0.02em" }}>
              Share<br />
              <span style={{ color: BRIGHT, fontStyle: "italic" }}>the Drive.</span>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 14, lineHeight: 1.6 }}>
              Tell a friend about [Your Dealership] and earn a{" "}
              <span style={{ color: BRIGHT, fontWeight: 600 }}>$100 gift card</span>{" "}
              when they buy their next car.
            </div>
          </div>

          {/* Divider */}
          <div style={{ margin: "0 36px", height: 1, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />

          {/* Bottom half — QR + steps */}
          <div style={{ display: "flex", flex: 1, padding: "24px 36px", gap: 28, alignItems: "center" }}>
            {/* QR */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <div style={{ padding: 8, background: "white", borderRadius: 10 }}>
                <img src={FLOWCODE_QR_URL} alt="Scan to find your referral link" width={148} height={148} />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ color: "white", fontWeight: 700, fontSize: 11 }}>Scan to get your link</div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, fontFamily: "monospace", marginTop: 2 }}>joinrippl.com/find</div>
              </div>
            </div>

            {/* Steps */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                "Scan the QR code",
                "Enter your mobile number",
                "Share your personal link",
                "Earn a $100 gift card reward",
              ].map((text, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg, ${BRIGHT}, ${ACCENT})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ color: BG, fontWeight: 900, fontSize: 12 }}>{i + 1}</span>
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{text}</div>
                </div>
              ))}

              {/* Reward callout */}
              <div style={{ marginTop: 4, background: "rgba(255,255,255,0.05)", border: `1px solid rgba(168,168,176,0.2)`, borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ color: BRIGHT, fontSize: 13, fontWeight: 700, marginBottom: 2 }}>$100 per referral</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, lineHeight: 1.4 }}>
                  No limit — earn every time<br />a friend buys their next car
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ height: 8, background: `linear-gradient(to right, #606068, ${BRIGHT}, #606068)`, flexShrink: 0 }} />
        </div>
      </div>
    </>
  );
}
