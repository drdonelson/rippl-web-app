const FLOWCODE_QR_URL = "/flowcode-qr-poster.png";

export default function Poster5x7() {
  return (
    <>
      <style>{`
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        @page { size: 8.5in 11in portrait; margin: 0; }
        .page-wrap { width: 8.5in; height: 11in; display: flex; align-items: center; justify-content: center; background: white; }
      `}</style>

      <div className="page-wrap">
        <div style={{
          width: "5in",
          height: "7in",
          background: "#1a2e5a",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}>
          {/* Top bar */}
          <div style={{ height: 8, background: "linear-gradient(to right, #2dd4bf, #99f6e4, #2dd4bf)", flexShrink: 0 }} />

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 36px 0" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: "#c9a84c", textTransform: "uppercase" }}>Hallmark Dental</div>
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Referral Rewards</div>
          </div>

          {/* Hero — takes up top half */}
          <div style={{ padding: "24px 36px 20px", flex: "0 0 auto" }}>
            <div style={{ fontSize: 56, fontWeight: 900, color: "white", lineHeight: 1, letterSpacing: "-0.02em" }}>
              Share a<br />
              <span style={{ color: "#2dd4bf", fontStyle: "italic" }}>Smile.</span>
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", marginTop: 16, lineHeight: 1.6 }}>
              Refer a friend to Hallmark Dental and earn a{" "}
              <span style={{ color: "#5eead4", fontWeight: 600 }}>gift card reward</span>{" "}
              when they become a patient.
            </div>
          </div>

          {/* Divider */}
          <div style={{ margin: "0 36px", height: 1, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />

          {/* Bottom half — QR + steps side by side */}
          <div style={{ display: "flex", flex: 1, padding: "24px 36px", gap: 28, alignItems: "center" }}>
            {/* QR */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <img src={FLOWCODE_QR_URL} alt="Scan to find your referral link" width={160} height={160} />
              <div style={{ textAlign: "center" }}>
                <div style={{ color: "white", fontWeight: 700, fontSize: 11 }}>Scan to get your link</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "monospace", marginTop: 2 }}>joinrippl.com/find</div>
              </div>
            </div>

            {/* Steps */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                "Scan the QR code",
                "Enter your mobile number",
                "Share your personal link",
                "Earn a gift card reward",
              ].map((text, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#2dd4bf", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ color: "#1a2e5a", fontWeight: 900, fontSize: 12 }}>{i + 1}</span>
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{text}</div>
                </div>
              ))}

              {/* Reward callout */}
              <div style={{ marginTop: 4, background: "rgba(45,212,191,0.1)", border: "1px solid rgba(45,212,191,0.25)", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ color: "#5eead4", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Rewards up to $100</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, lineHeight: 1.4 }}>
                  $35 · $50 · $75 · $100 gift cards<br />based on how many friends you refer
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ height: 8, background: "linear-gradient(to right, #2dd4bf, #99f6e4, #2dd4bf)", flexShrink: 0 }} />
        </div>
      </div>
    </>
  );
}
