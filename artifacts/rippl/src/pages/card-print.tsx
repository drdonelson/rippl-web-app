/**
 * Printable referral card — front & back, 5×3.5in (standard business card landscape).
 * Open /card-print in browser, Cmd+P → Save as PDF → send to printer.
 */

const FLOWCODE_QR_URL = "/flowcode-qr.png";

export default function CardPrint() {
  return (
    <div className="bg-white min-h-screen flex flex-col items-center justify-center gap-12 py-16 px-8">
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          .card-sheet { page-break-after: always; }
        }
        @page { size: landscape; margin: 0.5in; }
      `}</style>

      <p className="no-print text-slate-500 text-sm text-center mb-2">
        Cmd+P (Mac) or Ctrl+P (Windows) → Save as PDF → Print on card stock
      </p>

      {/* ── FRONT ── */}
      <div className="card-sheet">
        <p className="no-print text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3 text-center">Front</p>
        <div
          style={{ width: "5in", height: "3.5in" }}
          className="relative overflow-hidden rounded-2xl shadow-2xl flex"
        >
          {/* Left half — white */}
          <div className="w-1/2 h-full bg-white flex flex-col justify-end p-8">
            {/* Hallmark logo placeholder — replace src with actual logo file */}
            <div className="mb-4">
              <div className="text-[10px] font-bold tracking-widest text-[#8b7340] uppercase mb-0.5">Hallmark</div>
              <div className="text-[10px] font-bold tracking-widest text-[#8b7340] uppercase">Dental</div>
            </div>
            <div className="w-8 h-0.5 bg-[#8b7340] mb-3" />
            <p className="text-[9px] text-slate-400 leading-relaxed">
              Refer a friend. Earn a reward.<br />It's that simple.
            </p>
          </div>

          {/* Right half — light blue */}
          <div className="w-1/2 h-full bg-[#d6eaf8] flex flex-col items-center justify-center gap-2">
            <p className="text-[32px] font-black text-[#1a2e5a] leading-none text-center px-4">
              Share a<br />
              <span className="italic">Smile!</span>
            </p>
            <p className="text-[10px] text-[#1a2e5a]/60 text-center px-6 mt-1">
              Know someone who needs a great dentist?
            </p>
          </div>

          {/* Rippl watermark bottom-right */}
          <div className="absolute bottom-3 right-4 text-[8px] text-slate-300 font-medium tracking-widest uppercase">
            powered by Rippl
          </div>
        </div>
      </div>

      {/* ── BACK ── */}
      <div>
        <p className="no-print text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3 text-center">Back</p>
        <div
          style={{ width: "5in", height: "3.5in" }}
          className="relative overflow-hidden rounded-2xl shadow-2xl bg-[#1a2e5a] flex"
        >
          {/* Left — copy */}
          <div className="w-1/2 h-full flex flex-col justify-center px-8 gap-4">
            <div>
              <p className="text-white text-[22px] font-black leading-tight">
                Refer a friend,<br />earn a reward.
              </p>
            </div>
            <div className="space-y-2">
              {[
                "Scan the QR code",
                "Enter your mobile number",
                "Get your personal link to share",
                "Earn a gift card when they become a patient",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-teal-400 text-[#1a2e5a] text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-white/80 text-[10px] leading-snug">{step}</p>
                </div>
              ))}
            </div>
            <p className="text-teal-300 text-[9px] font-mono mt-1">joinrippl.com/find</p>
          </div>

          {/* Right — QR */}
          <div className="w-1/2 h-full flex flex-col items-center justify-center gap-3">
            <div className="bg-white rounded-xl p-2.5 shadow-lg">
              <img
                src={FLOWCODE_QR_URL}
                alt="Scan to find your referral link"
                width={120}
                height={120}
              />
            </div>
            <p className="text-white/60 text-[9px] text-center px-4">
              Scan to find your<br />personal referral link
            </p>
          </div>

          {/* Rippl watermark */}
          <div className="absolute bottom-3 right-4 text-[8px] text-white/20 font-medium tracking-widest uppercase">
            powered by Rippl
          </div>
        </div>
      </div>
    </div>
  );
}
