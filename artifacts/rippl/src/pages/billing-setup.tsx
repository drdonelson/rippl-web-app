import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

type State = "loading" | "success" | "cancelled" | "error";

export default function BillingSetup() {
  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId  = params.get("session_id");
    const practiceId = params.get("practice_id");
    const cancelled  = params.get("cancelled");

    if (cancelled === "true") {
      setState("cancelled");
      return;
    }

    if (!sessionId || !practiceId) {
      setState("error");
      setErrorMsg("Missing session information. Please use the link provided by your Rippl contact.");
      return;
    }

    fetch(`${API_BASE}/api/billing/confirm-setup`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ session_id: sessionId, practice_id: practiceId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setState("success");
        } else {
          setState("error");
          setErrorMsg(data.error ?? "Something went wrong confirming your billing.");
        }
      })
      .catch(() => {
        setState("error");
        setErrorMsg("Network error. Please contact david@joinrippl.com.");
      });
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 font-sans">

      {/* Brand */}
      <div className="flex items-center gap-1 mb-10">
        <span className="text-slate-900 font-black text-2xl tracking-tight">rip</span>
        <span className="text-[#E0622A] font-black text-2xl tracking-tight">pl</span>
      </div>

      <div className="w-full max-w-md text-center">

        {state === "loading" && (
          <>
            <Loader2 className="w-12 h-12 text-slate-300 animate-spin mx-auto mb-6" />
            <h1 className="text-xl font-black text-slate-900 mb-2">Confirming your billing setup…</h1>
            <p className="text-slate-500 text-sm">Just a moment.</p>
          </>
        )}

        {state === "success" && (
          <>
            <div className="w-20 h-20 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-[#1A7A3A]" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-3">Billing set up.</h1>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Your card is on file. You won't be charged until referrals are detected — then we'll bill you automatically at the end of each month at your DC member rates.
            </p>
            <div className="grid grid-cols-2 gap-3 text-center mb-8">
              {[
                { label: "Free tier", detail: "$55 per referral detected" },
                { label: "Growth tier", detail: "$149/mo + $30 per referral" },
              ].map(t => (
                <div key={t.label} className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="text-xs font-black text-[#1A7A3A] uppercase tracking-wide mb-1">{t.label}</div>
                  <div className="text-xs text-slate-500">{t.detail}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400">
              Questions? <a href="mailto:david@joinrippl.com" className="text-[#1A7A3A] hover:underline font-semibold">david@joinrippl.com</a>
            </p>
          </>
        )}

        {state === "cancelled" && (
          <>
            <div className="w-20 h-20 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-slate-400" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-3">Setup cancelled.</h1>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              No problem — your card wasn't saved. You'll need billing set up before Rippl can go live for your practice. Use the link from your setup email when you're ready.
            </p>
            <p className="text-xs text-slate-400">
              Questions? <a href="mailto:david@joinrippl.com" className="text-[#1A7A3A] hover:underline font-semibold">david@joinrippl.com</a>
            </p>
          </>
        )}

        {state === "error" && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-3">Something went wrong.</h1>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              {errorMsg ?? "We couldn't confirm your billing setup. Please try again or contact us."}
            </p>
            <p className="text-xs text-slate-400">
              <a href="mailto:david@joinrippl.com" className="text-[#1A7A3A] hover:underline font-semibold">david@joinrippl.com</a>
            </p>
          </>
        )}

      </div>
    </div>
  );
}
