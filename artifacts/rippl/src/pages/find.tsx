import { useState } from "react";
import { Droplets, Search, Share2, Copy, CheckCircle2, AlertCircle } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";
const REFERRAL_BASE = "https://joinrippl.com";

type Result = {
  firstName: string;
  referralCode: string;
  shareUrl: string;
};

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function FindPage() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const digits = phone.replace(/\D/g, "");
  const qrUrl = result
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(result.shareUrl)}&margin=10`
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (digits.length < 10) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/public/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(result.shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleShare() {
    if (!result) return;
    if (navigator.share) {
      navigator.share({ title: "My Hallmark Dental referral link", url: result.shareUrl });
    } else {
      handleCopy();
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Brand */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
          <Droplets className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Rippl</p>
          <p className="text-xs text-slate-400">Referral rewards · Hallmark Dental</p>
        </div>
      </div>

      <div className="w-full max-w-md">
        {!result ? (
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Find your referral link</h1>
            <p className="text-slate-500 text-sm mb-8">
              Enter the mobile number on file with Hallmark Dental to get your personal sharing link instantly.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mobile number</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="(615) 555-0100"
                  value={phone}
                  onChange={e => setPhone(formatPhone(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-lg tracking-wide focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
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
                disabled={digits.length < 10 || loading}
                className="w-full flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Find my link
                  </>
                )}
              </button>
            </form>

            <p className="text-xs text-slate-400 text-center mt-6">
              Your number must be on file with Hallmark Dental. See the front desk if you need help.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-teal-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Hey {result.firstName}!</h2>
            <p className="text-slate-500 text-sm mb-6">
              Here's your personal referral link. Share it with friends and earn a reward when they become a patient.
            </p>

            {/* QR code */}
            {qrUrl && (
              <div className="flex justify-center mb-6">
                <div className="p-3 rounded-2xl border-2 border-teal-100 bg-white inline-block">
                  <img src={qrUrl} alt="Your referral QR code" width={220} height={220} className="rounded-xl" />
                </div>
              </div>
            )}

            {/* Link */}
            <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm font-mono text-slate-600 mb-4 break-all">
              {result.shareUrl}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl transition-colors"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-teal-500" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>

            <button
              onClick={() => { setResult(null); setPhone(""); }}
              className="mt-4 text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              Look up a different number
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-8 text-center">
        Questions? Visit the front desk or email{" "}
        <a href="mailto:hello@joinrippl.com" className="text-teal-500 hover:underline">hello@joinrippl.com</a>
      </p>
    </div>
  );
}
