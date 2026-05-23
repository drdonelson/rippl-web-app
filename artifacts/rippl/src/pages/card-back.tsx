/**
 * Printable card back only — 5.5×4.25in (A2 card / half-letter landscape).
 * Cmd+P → Save as PDF → print on card stock.
 */

const FLOWCODE_QR_URL = "/flowcode-qr.png";

export default function CardBack() {
  return (
    <div className="bg-white min-h-screen flex flex-col items-center justify-center py-12 px-8">
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
        }
        @page { size: 5.5in 4.25in landscape; margin: 0; }
      `}</style>

      <p className="no-print text-slate-400 text-sm text-center mb-6">
        Cmd+P → Save as PDF → Print 5.5×4.25in on card stock
      </p>

      <div
        style={{ width: "5.5in", height: "4.25in" }}
        className="relative overflow-hidden rounded-2xl shadow-2xl bg-[#1a2e5a] flex"
      >
        {/* Left — copy */}
        <div className="w-1/2 h-full flex flex-col justify-center px-10 gap-5">
          <p className="text-white text-[26px] font-black leading-tight">
            Refer a friend,<br />earn a reward.
          </p>

          <div className="space-y-2.5">
            {[
              "Scan the QR code",
              "Enter your mobile number",
              "Get your personal link to share",
              "Earn a gift card when they become a patient",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-teal-400 text-[#1a2e5a] text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-white/80 text-[12px] leading-snug">{step}</p>
              </div>
            ))}
          </div>

          <p className="text-teal-300 text-[10px] font-mono">joinrippl.com/find</p>
        </div>

        {/* Right — QR */}
        <div className="w-1/2 h-full flex flex-col items-center justify-center gap-4">
          <img
            src={FLOWCODE_QR_URL}
            alt="Scan to find your referral link"
            width={160}
            height={160}
          />
          <p className="text-white/50 text-[10px] text-center px-4">
            Scan to find your<br />personal referral link
          </p>
        </div>

        {/* Watermark */}
        <div className="absolute bottom-3 right-4 text-[8px] text-white/20 font-medium tracking-widest uppercase">
          powered by Rippl
        </div>
      </div>
    </div>
  );
}
