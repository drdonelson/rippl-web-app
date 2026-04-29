/**
 * Printable office poster — 5×7in portrait.
 * Cmd+P → Save as PDF → print on 5×7 glossy or card stock.
 */

const FLOWCODE_QR_URL = "/flowcode-qr-poster.png";

const STEPS = [
  { n: "1", text: "Scan the QR code below" },
  { n: "2", text: "Enter your mobile number" },
  { n: "3", text: "Get your personal sharing link" },
  { n: "4", text: "Earn a gift card when they become a patient" },
];

export default function Poster5x7() {
  return (
    <div className="bg-white min-h-screen flex flex-col items-center justify-center py-10 px-6">
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
        }
        @page { size: 5in 7in portrait; margin: 0; }
      `}</style>

      <p className="no-print text-slate-500 text-sm text-center mb-8">
        Cmd+P → Save as PDF → Print 5×7 on glossy or card stock
      </p>

      <div
        style={{ width: "5in", height: "7in" }}
        className="relative overflow-hidden rounded-2xl shadow-2xl flex flex-col bg-[#1a2e5a]"
      >
        {/* Top accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-teal-400 via-teal-300 to-teal-500" />

        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-3">
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] text-[#c9a84c] uppercase">Hallmark</p>
            <p className="text-[9px] font-bold tracking-[0.25em] text-[#c9a84c] uppercase">Dental</p>
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
            <p className="text-white/70 text-[8px] font-semibold tracking-wider uppercase">Referral Rewards</p>
          </div>
        </div>

        {/* Hero headline */}
        <div className="px-7 pt-2 pb-4">
          <h1 className="text-[40px] font-black text-white leading-none tracking-tight">
            Share a<br />
            <span className="text-teal-400 italic">Smile.</span>
          </h1>
          <p className="text-white/60 text-[11px] mt-3 leading-relaxed max-w-xs">
            Love your smile? Help a friend get one too —
            and earn a <span className="text-teal-300 font-semibold">gift card reward</span> when they become a patient.
          </p>
        </div>

        {/* Divider */}
        <div className="mx-7 h-px bg-white/10 mb-5" />

        {/* Main content: steps + QR */}
        <div className="flex gap-6 px-7 flex-1">
          {/* Steps */}
          <div className="flex-1 flex flex-col justify-center gap-3">
            <p className="text-white/40 text-[8px] font-bold tracking-widest uppercase mb-1">How it works</p>
            {STEPS.map(({ n, text }) => (
              <div key={n} className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-teal-400 flex items-center justify-center shrink-0">
                  <span className="text-[#1a2e5a] font-black text-[10px]">{n}</span>
                </div>
                <p className="text-white text-[11px] font-medium leading-snug pt-0.5">{text}</p>
              </div>
            ))}

            <div className="mt-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <p className="text-white/40 text-[8px] font-bold tracking-widest uppercase mb-1">Your rewards</p>
              <div className="flex gap-4 mt-1">
                {[
                  { tier: "1 referral", reward: "$35" },
                  { tier: "3 referrals", reward: "$50" },
                  { tier: "6 referrals", reward: "$75" },
                ].map(({ tier, reward }) => (
                  <div key={tier}>
                    <p className="text-teal-300 font-bold text-[13px]">{reward}</p>
                    <p className="text-white/40 text-[8px]">{tier}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* QR code */}
          <div className="flex flex-col items-center justify-center gap-3 shrink-0">
            <img
              src={FLOWCODE_QR_URL}
              alt="Scan to find your referral link"
              width={130}
              height={130}
            />
            <div className="text-center">
              <p className="text-white font-bold text-[9px]">Scan to get your link</p>
              <p className="text-white/40 text-[8px] font-mono mt-0.5">joinrippl.com/find</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mx-7 mt-4 mb-4 pt-4 border-t border-white/10 flex items-center justify-between">
          <p className="text-white/30 text-[8px]">Ask the front desk if you need help.</p>
          <p className="text-white/20 text-[7px] font-medium tracking-widest uppercase">Powered by Rippl</p>
        </div>

        {/* Bottom accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-teal-500 via-teal-300 to-teal-400" />
      </div>
    </div>
  );
}
