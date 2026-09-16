import { useState } from "react";
import { useParams } from "wouter";
import { Droplets, Send, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

type Step = "my-phone" | "friend-info" | "success";

export default function SendInvite() {
  const { slug } = useParams<{ slug: string }>();

  const [step, setStep]               = useState<Step>("my-phone");
  const [myPhone, setMyPhone]         = useState("");
  const [referrerName, setReferrerName] = useState("");
  const [friendName, setFriendName]   = useState("");
  const [friendPhone, setFriendPhone] = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const myDigits     = myPhone.replace(/\D/g, "");
  const friendDigits = friendPhone.replace(/\D/g, "");

  // ── Step 1: look up the patient by their own phone ────────────────────────
  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (myDigits.length < 10) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/public/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: myDigits }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Number not found. Ask the front desk for help.");
      } else {
        setReferrerName(data.firstName);
        setStep("friend-info");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: send the invitation to the friend ─────────────────────────────
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (friendDigits.length < 10 || !friendName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/public/send-invitation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          myPhone: myDigits,
          friendName: friendName.trim(),
          friendPhone: friendDigits,
          practiceSlug: slug,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setStep("success");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("my-phone");
    setMyPhone("");
    setReferrerName("");
    setFriendName("");
    setFriendPhone("");
    setError(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">

      {/* Brand */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-400 to-[#C9551E] flex items-center justify-center shadow-lg shadow-[#E0622A]/20">
          <Droplets className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Rippl Rewards</p>
          <p className="text-xs text-slate-400">Refer a friend · earn a reward</p>
        </div>
      </div>

      <div className="w-full max-w-md">

        {/* ── Step 1: your phone ──────────────────────────────────────────── */}
        {step === "my-phone" && (
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Send a friend an invite</h1>
            <p className="text-slate-500 text-sm mb-8">
              Enter the mobile number on file with us and we'll text your friend a personal invitation.
            </p>

            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Your mobile number</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="(615) 555-0100"
                  value={myPhone}
                  onChange={e => setMyPhone(formatPhone(e.target.value))}
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-slate-900 text-lg tracking-wide focus:outline-none focus:ring-2 focus:ring-[#E0622A]/40 focus:border-transparent"
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 px-3 py-3 rounded-xl bg-red-50 border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={myDigits.length < 10 || loading}
                className="w-full flex items-center justify-center gap-2 bg-[#E0622A] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors text-base"
              >
                {loading
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : "Continue →"
                }
              </button>
            </form>

            <p className="text-xs text-slate-400 text-center mt-6">
              Your number must be on file with us. See the front desk if you need help.
            </p>
          </div>
        )}

        {/* ── Step 2: friend info ─────────────────────────────────────────── */}
        {step === "friend-info" && (
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-8">
            <button
              onClick={() => { setStep("my-phone"); setError(null); }}
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-sm mb-6 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <div className="mb-6">
              <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center mb-3">
                <span className="text-lg">👋</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Hey {referrerName}!</h2>
              <p className="text-slate-500 text-sm">
                Who do you want to send an invite to? We'll text them a link and let them know you recommended us.
              </p>
            </div>

            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Friend's first name</label>
                <input
                  type="text"
                  placeholder="Sarah"
                  value={friendName}
                  onChange={e => setFriendName(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-[#E0622A]/40 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Friend's mobile number</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="(615) 555-0200"
                  value={friendPhone}
                  onChange={e => setFriendPhone(formatPhone(e.target.value))}
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-slate-900 text-lg tracking-wide focus:outline-none focus:ring-2 focus:ring-[#E0622A]/40 focus:border-transparent"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 px-3 py-3 rounded-xl bg-red-50 border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={friendDigits.length < 10 || !friendName.trim() || loading}
                className="w-full flex items-center justify-center gap-2 bg-[#E0622A] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors text-base"
              >
                {loading
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Send className="w-4 h-4" /> Send Invite</>
                }
              </button>
            </form>

            <p className="text-xs text-slate-400 text-center mt-5">
              Your friend will receive a single text with your referral link. Standard rates apply.
            </p>
          </div>
        )}

        {/* ── Step 3: success ─────────────────────────────────────────────── */}
        {step === "success" && (
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-orange-50 border-2 border-orange-100 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-[#E0622A]" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Invite sent!</h2>
            <p className="text-slate-500 text-sm mb-2">
              <span className="font-semibold text-slate-800">{friendName}</span> just got your referral link by text.
            </p>
            <p className="text-slate-400 text-sm mb-8">
              When they book and complete their first visit, you'll automatically earn your reward.
            </p>

            <button
              onClick={reset}
              className="w-full bg-[#E0622A] text-white font-semibold py-3.5 rounded-xl transition-colors text-base"
            >
              Send another invite
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-8 text-center">
        Powered by <span className="text-[#E0622A] font-semibold">Rippl</span>
      </p>
    </div>
  );
}
