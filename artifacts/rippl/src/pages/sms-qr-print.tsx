import { useEffect, useState } from "react";
import QRCode from "qrcode";

const OPT_IN_URL = "https://www.joinrippl.com/sms-opt-in";

export default function SmsQrPrint() {
  const [qrSrc, setQrSrc] = useState<string>("");

  useEffect(() => {
    QRCode.toDataURL(OPT_IN_URL, {
      width: 240,
      margin: 2,
      color: { dark: "#1e1e2e", light: "#ffffff" },
    }).then(setQrSrc).catch(() => {});
  }, []);

  return (
    <div className="bg-white min-h-screen flex flex-col items-center py-12 px-8">
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
        }
        @page { size: letter portrait; margin: 1in; }
      `}</style>

      <p className="no-print text-slate-500 text-sm text-center mb-8">
        Print this page (Cmd+P / Ctrl+P) and display in your office or on marketing materials.
      </p>

      {/* Poster card */}
      <div className="w-full max-w-[480px] border border-slate-200 rounded-2xl overflow-hidden shadow-sm">

        {/* Orange header band */}
        <div className="bg-[#E0622A] px-8 py-6 text-white text-center">
          <p className="text-3xl font-black tracking-tight mb-0.5">
            rip<span style={{ opacity: 0.75 }}>pl</span>
          </p>
          <p className="text-sm font-medium opacity-85">Hallmark Dental Referral Rewards</p>
        </div>

        {/* Main content */}
        <div className="px-8 py-8 text-center bg-white">
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            Refer a Friend. Earn a Reward.
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            Scan to sign up for text notifications — get your personal referral link
            and earn <strong>$35–$100</strong> every time someone you refer becomes a patient.
          </p>

          {/* QR code */}
          <div className="flex justify-center mb-4">
            <div className="border-4 border-[#E0622A] rounded-xl p-3 inline-block bg-white">
              {qrSrc
                ? <img src={qrSrc} alt="QR code — scan to sign up for referral text notifications" width={240} height={240} />
                : <div className="w-[240px] h-[240px] bg-slate-100 animate-pulse rounded" />
              }
            </div>
          </div>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Or visit
          </p>
          <p className="text-sm font-bold text-[#E0622A] mb-6">
            joinrippl.com/sms-opt-in
          </p>

          {/* How it works */}
          <div className="bg-slate-50 rounded-xl p-4 text-left mb-6 space-y-2">
            {[
              "You share your personal referral link",
              "Friend books & completes their first visit",
              "You earn a gift card — up to $100",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#E0622A] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-700">{step}</p>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <p className="text-[10px] text-slate-400 leading-relaxed">
            SMS sign-up is optional — not required to earn rewards. Up to 4 messages/month.
            Message &amp; data rates may apply. Reply <strong>STOP</strong> to opt out,{" "}
            <strong>HELP</strong> for help. Terms: joinrippl.com/terms · Privacy: joinrippl.com/privacy
          </p>
        </div>

        {/* Footer band */}
        <div className="bg-slate-50 border-t border-slate-100 px-8 py-3 text-center">
          <p className="text-xs text-slate-400">Hallmark Dental · Powered by Rippl</p>
        </div>
      </div>
    </div>
  );
}
