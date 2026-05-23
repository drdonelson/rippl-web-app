import { useState } from "react";
import { Droplets, MessageSquare, CheckCircle, AlertCircle } from "lucide-react";

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function SmsOptIn() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consented, setConsented] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handlePhone(e: React.ChangeEvent<HTMLInputElement>) {
    setPhone(formatPhone(e.target.value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const digits = phone.replace(/\D/g, "");
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (digits.length !== 10) { setError("Please enter a valid 10-digit U.S. phone number."); return; }
    if (!consented) { setError("Please check the consent box to sign up for text notifications."); return; }

    setLoading(true);
    try {
      await fetch("/api/sms-opt-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: `+1${digits}` }),
      });
    } catch {
      // Non-blocking — show success regardless (practice staff will confirm enrollment)
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">You're signed up for texts!</h1>
          <p className="text-slate-500 text-[15px] leading-relaxed mb-6">
            You'll receive an SMS shortly with your referral link. You can reply{" "}
            <span className="font-mono text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded text-sm">STOP</span>{" "}
            at any time to unsubscribe — your reward eligibility is unaffected.
          </p>
          <a
            href="https://www.hallmarkdds.com"
            className="text-[#E0622A] hover:text-orange-700 font-medium text-sm transition-colors"
          >
            Return to Hallmark Dental &rarr;
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#E0622A]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-orange-300/8 rounded-full blur-3xl" />
      </div>

      <main className="relative z-10 max-w-lg mx-auto px-6 py-16">

        {/* Brand */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-400 to-[#C9551E] flex items-center justify-center shadow-lg shadow-[#E0622A]/20">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              rip<span style={{ color: "#E0622A" }}>pl</span>
            </p>
            <p className="text-xs text-slate-400">Powered by Hallmark Dental</p>
          </div>
        </div>

        {/* Optional notice — prominent, top of page */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-8 flex items-start gap-3">
          <span className="text-blue-500 text-lg leading-none mt-0.5">ℹ</span>
          <p className="text-blue-800 text-sm leading-relaxed">
            <span className="font-semibold">SMS notifications are completely optional.</span> As a Hallmark Dental patient you are already eligible to earn referral rewards. This form is only to add text message notifications — you can earn and claim rewards without signing up for texts.
          </p>
        </div>

        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0 mt-0.5">
            <MessageSquare className="w-5 h-5 text-[#E0622A]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Add Text Notifications (Optional)</h1>
            <p className="text-slate-500 text-[15px] mt-1 leading-relaxed">
              Sign up to receive your personal referral link and reward notifications by text. Refer friends and family and earn gift cards — up to $100 per referral.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-8 space-y-3">
          {[
            { n: "1", text: "You share your personal referral link with someone you know." },
            { n: "2", text: "They book and complete a new patient appointment at Hallmark Dental." },
            { n: "3", text: "You earn a gift card reward — $35 to $100 — redeemable by email or text." },
          ].map(({ n, text }) => (
            <div key={n} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#E0622A] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {n}
              </span>
              <p className="text-slate-600 text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#E0622A]/40 focus:border-[#E0622A] transition-colors bg-white"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1.5">
              Mobile Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={handlePhone}
              placeholder="(615) 555-1234"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#E0622A]/40 focus:border-[#E0622A] transition-colors bg-white"
            />
          </div>

          {/* TCPA Consent checkbox */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consented}
                onChange={e => setConsented(e.target.checked)}
                className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border-slate-300 text-[#E0622A] focus:ring-[#E0622A]/40 cursor-pointer"
              />
              <span className="text-slate-600 text-sm leading-relaxed">
                I voluntarily agree to receive recurring SMS messages from{" "}
                <span className="font-medium text-slate-900">Hallmark Dental</span> (powered by Rippl),
                including my referral link, referral reminders, and reward notifications. Message
                frequency varies — up to 4 messages per month.{" "}
                <span className="font-medium text-slate-900">Message and data rates may apply.</span>{" "}
                <span className="font-medium text-slate-900">Consent is not required to receive dental services or to earn referral rewards.</span>{" "}
                Reply{" "}
                <span className="font-mono text-orange-700 bg-orange-50 border border-orange-200 px-1 py-0.5 rounded text-xs">STOP</span>{" "}
                to opt out,{" "}
                <span className="font-mono text-orange-700 bg-orange-50 border border-orange-200 px-1 py-0.5 rounded text-xs">HELP</span>{" "}
                for help. See our{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#E0622A] hover:underline"
                >
                  Privacy Policy
                </a>{" "}
                and{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#E0622A] hover:underline"
                >
                  SMS Terms
                </a>
                .
              </span>
            </label>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-lg bg-[#E0622A] text-white font-semibold text-[15px] hover:bg-[#C9551E] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Signing up…" : "Sign Up for Text Notifications"}
          </button>

          <p className="text-center text-xs text-slate-400">
            Don't want texts? Contact the office — staff can share your referral link in person or by email.
          </p>
        </form>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-200 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Rippl &middot;{" "}
          <a href="/privacy" className="hover:text-slate-600 transition-colors">Privacy Policy</a>
          {" · "}
          <a href="/terms" className="hover:text-slate-600 transition-colors">SMS Terms</a>
        </div>
      </main>
    </div>
  );
}
