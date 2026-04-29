const FLOWCODE_QR_URL = "/flowcode-qr-poster.png";

const STEPS = [
  { n: "1", text: "Scan the QR code below" },
  { n: "2", text: "Enter your mobile number" },
  { n: "3", text: "Get your personal sharing link" },
  { n: "4", text: "Earn a gift card when they become a patient" },
];

export default function PosterPrint() {
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
        background: "#1a2e5a",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}>
        {/* Top accent bar */}
        <div style={{ height: 10, background: "linear-gradient(to right, #2dd4bf, #99f6e4, #2dd4bf)", flexShrink: 0 }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "40px 64px 24px" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.25em", color: "#c9a84c", textTransform: "uppercase" }}>Hallmark</div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.25em", color: "#c9a84c", textTransform: "uppercase" }}>Dental</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "6px 16px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2dd4bf" }} />
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>Referral Rewards</span>
          </div>
        </div>

        {/* Hero */}
        <div style={{ padding: "16px 64px 32px" }}>
          <div style={{ fontSize: 72, fontWeight: 900, color: "white", lineHeight: 1, letterSpacing: "-0.02em" }}>
            Share a<br />
            <span style={{ color: "#2dd4bf", fontStyle: "italic" }}>Smile.</span>
          </div>
          <div style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", marginTop: 16, lineHeight: 1.6, maxWidth: 480 }}>
            Love your smile? Help a friend get one too — and earn a{" "}
            <span style={{ color: "#5eead4", fontWeight: 600 }}>gift card reward</span> when they become a patient.
          </div>
        </div>

        {/* Divider */}
        <div style={{ margin: "0 64px 40px", height: 1, background: "rgba(255,255,255,0.1)" }} />

        {/* Main content */}
        <div style={{ display: "flex", gap: 48, padding: "0 64px", flex: 1 }}>
          {/* Steps */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 8 }}>How it works</div>
            {STEPS.map(({ n, text }) => (
              <div key={n} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#2dd4bf", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#1a2e5a", fontWeight: 900, fontSize: 15 }}>{n}</span>
                </div>
                <div style={{ color: "white", fontSize: 18, fontWeight: 500, lineHeight: 1.3, paddingTop: 6 }}>{text}</div>
              </div>
            ))}

            {/* Reward tiers */}
            <div style={{ marginTop: 24, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "16px 24px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 8 }}>Your rewards</div>
              <div style={{ display: "flex", gap: 32, marginTop: 8 }}>
                {[{ tier: "1 referral", reward: "$35 gift card" }, { tier: "3 referrals", reward: "$50 gift card" }, { tier: "6 referrals", reward: "$75 gift card" }].map(({ tier, reward }) => (
                  <div key={tier}>
                    <div style={{ color: "#5eead4", fontWeight: 700, fontSize: 16 }}>{reward}</div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 2 }}>{tier}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* QR */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, flexShrink: 0 }}>
            <img src={FLOWCODE_QR_URL} alt="Scan to find your referral link" width={220} height={220} />
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "white", fontWeight: 700, fontSize: 14 }}>Scan to get your link</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "monospace", marginTop: 4 }}>joinrippl.com/find</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ margin: "32px 64px 24px", paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>Ask the front desk if you need help finding your account.</div>
          <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 9, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase" }}>Powered by Rippl</div>
        </div>

        {/* Bottom accent bar */}
        <div style={{ height: 10, background: "linear-gradient(to right, #2dd4bf, #99f6e4, #2dd4bf)", flexShrink: 0 }} />
      </div>
    </>
  );
}
