const FLOWCODE_QR_URL = "/flowcode-qr-poster.png";

const STEPS = [
  { n: "1", text: "Scan the QR code below" },
  { n: "2", text: "Enter your mobile number" },
  { n: "3", text: "Get your personal sharing link" },
  { n: "4", text: "Earn a gift card when they buy their next car" },
];

const BG     = "#1c1c1e";
const ACCENT = "#a8a8b0";
const BRIGHT = "#d0d0d8";

export default function PosterPrintAuto() {
  return (
    <>
      <style>{`
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
        html, body { margin: 0; padding: 0; width: 8.5in; height: 11in; }
        @page { size: 8.5in 11in portrait; margin: 0; }
        .no-print { display: none !important; }
      `}</style>

      <div style={{
        width: "8.5in",
        height: "11in",
        background: BG,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}>
        {/* Top accent bar — chrome gradient */}
        <div style={{ height: 10, background: `linear-gradient(to right, #606068, ${BRIGHT}, #606068)`, flexShrink: 0 }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "40px 64px 24px" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.25em", color: ACCENT, textTransform: "uppercase" }}>[Your Dealership]</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, padding: "6px 16px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: ACCENT }} />
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>Referral Rewards</span>
          </div>
        </div>

        {/* Hero */}
        <div style={{ padding: "16px 64px 32px" }}>
          <div style={{ fontSize: 72, fontWeight: 900, color: "white", lineHeight: 1, letterSpacing: "-0.02em" }}>
            Share<br />
            <span style={{ color: BRIGHT, fontStyle: "italic" }}>the Drive.</span>
          </div>
          <div style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", marginTop: 16, lineHeight: 1.6, maxWidth: 480 }}>
            Love your dealership? Tell a friend — and earn a{" "}
            <span style={{ color: BRIGHT, fontWeight: 600 }}>$100 gift card</span> when they buy their next car.
          </div>
        </div>

        {/* Divider */}
        <div style={{ margin: "0 64px 40px", height: 1, background: "rgba(255,255,255,0.1)" }} />

        {/* Main content */}
        <div style={{ display: "flex", gap: 48, padding: "0 64px", flex: 1 }}>
          {/* Steps */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 8 }}>How it works</div>
            {STEPS.map(({ n, text }) => (
              <div key={n} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${BRIGHT}, ${ACCENT})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: BG, fontWeight: 900, fontSize: 15 }}>{n}</span>
                </div>
                <div style={{ color: "white", fontSize: 18, fontWeight: 500, lineHeight: 1.3, paddingTop: 6 }}>{text}</div>
              </div>
            ))}

            {/* Reward callout */}
            <div style={{ marginTop: 24, background: "rgba(255,255,255,0.05)", border: `1px solid rgba(168,168,176,0.25)`, borderRadius: 16, padding: "16px 24px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 8 }}>Your reward</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <div style={{ color: BRIGHT, fontWeight: 900, fontSize: 32 }}>$100</div>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 14 }}>gift card · per referral</div>
              </div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 6 }}>
                No limit — earn a reward every time a friend buys
              </div>
            </div>
          </div>

          {/* QR */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, flexShrink: 0 }}>
            <div style={{ padding: 12, background: "white", borderRadius: 16 }}>
              <img src={FLOWCODE_QR_URL} alt="Scan to find your referral link" width={196} height={196} />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "white", fontWeight: 700, fontSize: 14 }}>Scan to get your link</div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, fontFamily: "monospace", marginTop: 4 }}>joinrippl.com/find</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ margin: "32px 64px 24px", paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 10 }}>Ask our team if you need help finding your account.</div>
          <div style={{ color: "rgba(255,255,255,0.15)", fontSize: 9, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase" }}>Powered by Rippl</div>
        </div>

        {/* Bottom accent bar */}
        <div style={{ height: 10, background: `linear-gradient(to right, #606068, ${BRIGHT}, #606068)`, flexShrink: 0 }} />
      </div>
    </>
  );
}
