export default function IconExport() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-12">
      <p className="text-slate-400 text-sm">Screenshot the icon below, then crop and save as PNG</p>

      {/* 200×200 — for Flowcode / favicon */}
      <div
        style={{
          width: 200,
          height: 200,
          borderRadius: 44,
          background: "linear-gradient(135deg, #F5A623 0%, #E0622A 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 25px 60px rgba(224,98,42,0.35)",
        }}
      >
        <span style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 900,
          fontSize: 72,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color: "white",
        }}>
          rp
        </span>
      </div>

      {/* 512×512 — large export */}
      <div
        style={{
          width: 512,
          height: 512,
          borderRadius: 112,
          background: "linear-gradient(135deg, #F5A623 0%, #E0622A 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 40px 100px rgba(224,98,42,0.35)",
        }}
      >
        <span style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 900,
          fontSize: 192,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color: "white",
        }}>
          rp
        </span>
      </div>

      <p className="text-slate-300 text-xs">joinrippl.com/icon</p>
    </div>
  );
}
