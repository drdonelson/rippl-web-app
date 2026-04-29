import { Droplets } from "lucide-react";

export default function IconExport() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-8">
      <p className="text-slate-400 text-sm">Screenshot the icon below, then crop and save as PNG</p>

      {/* 200×200 — screenshot this for Flowcode */}
      <div
        className="rounded-[44px] flex items-center justify-center shadow-2xl shadow-teal-500/30"
        style={{
          width: 200,
          height: 200,
          background: "linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)",
        }}
      >
        <Droplets style={{ width: 96, height: 96, color: "white" }} strokeWidth={1.5} />
      </div>

      <p className="text-slate-300 text-xs">joinrippl.com/icon</p>
    </div>
  );
}
