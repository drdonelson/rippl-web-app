import { Droplets } from "lucide-react";

export default function BlinqBg() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-6 py-12 px-6">
      <p className="text-slate-400 text-sm no-print">
        Cmd+Shift+4 → drag to crop just the banner below → upload to Blinq
      </p>

      {/* Banner — 1500×500 rendered at 75% = 1125×375 for screen */}
      <div
        style={{
          width: 1125,
          height: 375,
          background: "linear-gradient(135deg, #0f1e3a 0%, #1a2e5a 50%, #0d4f4a 100%)",
          borderRadius: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 80px",
          position: "relative",
          overflow: "hidden",
          fontFamily: "system-ui, -apple-system, sans-serif",
          boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* Background glow orbs */}
        <div style={{ position: "absolute", top: -80, right: 300, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(45,212,191,0.15), transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -100, left: 200, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(45,212,191,0.08), transparent 70%)", pointerEvents: "none" }} />

        {/* Teal accent lines */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(to right, #2dd4bf, #5eead4, #2dd4bf)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "linear-gradient(to right, #2dd4bf, #5eead4, #2dd4bf)" }} />

        {/* Left — Logo + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 80, height: 80, borderRadius: 20, background: "linear-gradient(135deg, #2dd4bf, #0d9488)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(45,212,191,0.3)" }}>
            <Droplets style={{ width: 44, height: 44, color: "white" }} strokeWidth={1.5} />
          </div>
          <div>
            <div style={{ fontSize: 64, fontWeight: 900, color: "white", lineHeight: 1, letterSpacing: "-0.02em" }}>Rippl</div>
            <div style={{ fontSize: 18, color: "rgba(255,255,255,0.45)", marginTop: 4, letterSpacing: "0.05em" }}>Referral Rewards Platform</div>
          </div>
        </div>

        {/* Right — tagline */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#2dd4bf", lineHeight: 1.4 }}>
            Automatic referral rewards<br />for dental practices.
          </div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.35)", marginTop: 12, letterSpacing: "0.05em" }}>
            joinrippl.com
          </div>
        </div>
      </div>

      <p className="text-slate-300 text-xs">1500×500px — screenshot and upload to Blinq background</p>
    </div>
  );
}
