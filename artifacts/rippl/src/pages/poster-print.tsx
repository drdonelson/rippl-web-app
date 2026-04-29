/**
 * Printable office poster — 8.5×11in portrait.
 * Open /poster-print in browser, Cmd+P → Save as PDF → print on card stock or glossy paper.
 */

const FLOWCODE_QR_URL = "/flowcode-qr.png";

const STEPS = [
  { n: "1", text: "Scan the QR code below" },
  { n: "2", text: "Enter your mobile number" },
  { n: "3", text: "Get your personal sharing link" },
  { n: "4", text: "Earn a gift card when they become a patient" },
];

export default function PosterPrint() {
  return (
    <div className="bg-white min-h-screen flex flex-col items-center justify-center py-12 px-6">
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
        }
        @page { size: portrait; margin: 0; }
      `}</style>

      <p className="no-print text-slate-500 text-sm text-center mb-8">
        Cmd+P → Save as PDF → Print 8.5×11 on glossy or card stock
      </p>

      {/* Poster */}
      <div
        style={{ width: "8.5in", minHeight: "11in" }}
        className="relative overflow-hidden rounded-3xl shadow-2xl flex flex-col bg-[#1a2e5a]"
      >
        {/* Top accent bar */}
        <div className="h-2 w-full bg-gradient-to-r from-teal-400 via-teal-300 to-teal-500" />

        {/* Header */}
        <div className="flex items-center justify-between px-12 pt-10 pb-6">
          <div>
            <p className="text-[11px] font-bold tracking-[0.25em] text-[#c9a84c] uppercase">Hallmark</p>
            <p className="text-[11px] font-bold tracking-[0.25em] text-[#c9a84c] uppercase">Dental</p>
          </div>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
            <div className="w-2 h-2 rounded-full bg-teal-400" />
            <p className="text-white/70 text-[10px] font-semibold tracking-wider uppercase">Referral Rewards</p>
          </div>
        </div>

        {/* Hero headline */}
        <div className="px-12 pt-4 pb-8">
          <h1 className="text-[64px] font-black text-white leading-none tracking-tight">
            Share a<br />
            <span className="text-teal-400 italic">Smile.</span>
          </h1>
          <p className="text-white/60 text-[18px] mt-4 leading-relaxed max-w-lg">
            Love your smile? Help a friend get one too —
            and earn a <span className="text-teal-300 font-semibold">gift card reward</span> when they become a patient.
          </p>
        </div>

        {/* Divider */}
        <div className="mx-12 h-px bg-white/10 mb-10" />

        {/* Main content: steps + QR */}
        <div className="flex gap-10 px-12 flex-1">
          {/* Steps */}
          <div className="flex-1 flex flex-col justify-center gap-6">
            <p className="text-white/40 text-[11px] font-bold tracking-widest uppercase mb-2">How it works</p>
            {STEPS.map(({ n, text }) => (
              <div key={n} className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-full bg-teal-400 flex items-center justify-center shrink-0">
                  <span className="text-[#1a2e5a] font-black text-[15px]">{n}</span>
                </div>
                <p className="text-white text-[18px] font-medium leading-snug pt-1">{text}</p>
              </div>
            ))}

            <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl px-6 py-4">
              <p className="text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">Your rewards</p>
              <div className="flex gap-6 mt-2">
                {[
                  { tier: "1 referral", reward: "$35 gift card" },
                  { tier: "3 referrals", reward: "$50 gift card" },
                  { tier: "6 referrals", reward: "$75 gift card" },
                ].map(({ tier, reward }) => (
                  <div key={tier}>
                    <p className="text-teal-300 font-bold text-[15px]">{reward}</p>
                    <p className="text-white/40 text-[11px]">{tier}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* QR code */}
          <div className="flex flex-col items-center justify-center gap-4 shrink-0">
            <div className="bg-white rounded-2xl p-4 shadow-xl">
              <img
                src={FLOWCODE_QR_URL}
                alt="Scan to find your referral link"
                width={200}
                height={200}
              />
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-[13px]">Scan to get your link</p>
              <p className="text-white/40 text-[11px] font-mono mt-0.5">joinrippl.com/find</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mx-12 mt-10 mb-8 pt-6 border-t border-white/10 flex items-center justify-between">
          <p className="text-white/30 text-[10px]">
            Ask the front desk if you need help finding your account.
          </p>
          <p className="text-white/20 text-[9px] font-medium tracking-widest uppercase">Powered by Rippl</p>
        </div>

        {/* Bottom accent bar */}
        <div className="h-2 w-full bg-gradient-to-r from-teal-500 via-teal-300 to-teal-400" />
      </div>
    </div>
  );
}
