import { useState } from "react";
import { CheckCircle2, ArrowRight, Zap, Users, Gift, Shield } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

const STATS = [
  { val: "23%",  label: "More new patients traced to a referrer" },
  { val: "0",    label: "Staff steps per referral detected" },
  { val: "~2h",  label: "Setup time — then fully automated" },
  { val: "$0",   label: "To start — no commitment" },
];

const HOW = [
  { icon: Zap,    title: "Connects to Open Dental",   desc: "Syncs every 5 minutes. Detects new patient visits and completed exams automatically." },
  { icon: Users,  title: "Referrer identified",        desc: "When a referred patient completes their first exam, Rippl matches them to who sent them — no staff involvement." },
  { icon: Gift,   title: "Gift card sent in minutes",  desc: "Tango gift card delivered by email + SMS. Rewards increase as patients refer more. Your team treats patients." },
  { icon: Shield, title: "HIPAA compliant",            desc: "No PHI stored. Name matching only — same data used by Weave and Podium." },
];

export default function DcSignup() {
  const [form, setForm] = useState({ name: "", practice: "", email: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/public/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source: "dental-collective" }),
      });
      if (!res.ok) throw new Error("Something went wrong");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* Nav */}
      <nav className="sticky top-0 z-30 bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-slate-900 font-black text-xl tracking-tight">rip</span>
              <span className="text-[#E0622A] font-black text-xl tracking-tight">pl</span>
            </div>
            <span className="text-slate-300 text-lg">×</span>
            <span className="text-slate-500 font-semibold text-sm tracking-wide">Dental Collective</span>
          </div>
          <span className="text-[10px] font-black tracking-widest uppercase text-white bg-[#1A7A3A] px-3 py-1.5 rounded-full">
            DC Member Exclusive
          </span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-14 lg:py-20">
        <div className="lg:grid lg:grid-cols-[1fr_420px] lg:gap-20 lg:items-start">

          {/* ── Left column ── */}
          <div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 mb-7">
              <div className="w-1.5 h-1.5 rounded-full bg-[#1A7A3A]" />
              <span className="text-green-800 text-xs font-bold tracking-wider uppercase">DC Member Pricing — 30% Off Standard</span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-black text-slate-900 leading-[1.08] tracking-tight mb-5">
              Your patients are already<br />sending referrals.<br />
              <span className="text-[#1A7A3A]">Most practices never find out.</span>
            </h1>

            <p className="text-slate-500 text-lg leading-relaxed mb-10 max-w-lg">
              Rippl connects to Open Dental and automatically detects, tracks, and rewards every referral — without a single staff step. DC members get exclusive pricing available nowhere else.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
              {STATS.map(s => (
                <div key={s.val} className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-black text-[#1A7A3A] mb-1">{s.val}</div>
                  <div className="text-xs text-slate-500 leading-snug">{s.label}</div>
                </div>
              ))}
            </div>

            {/* How it works */}
            <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 mb-4">How it works</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
              {HOW.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-green-50 border border-green-200 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-[#1A7A3A]" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm mb-1">{title}</div>
                    <div className="text-slate-500 text-xs leading-relaxed">{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pricing */}
            <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 mb-4">DC Member Pricing</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
              {/* Free */}
              <div className="border border-slate-200 rounded-2xl p-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Free</p>
                <div className="text-4xl font-black text-slate-900 mb-1">$0<span className="text-base font-normal text-slate-400">/mo</span></div>
                <div className="text-sm text-slate-500 mb-4">+ $55 per referral detected</div>
                <div className="text-xs text-slate-400 pt-4 border-t border-slate-100 leading-relaxed">
                  Standard rate: <span className="line-through">$85/ref</span><br />
                  Start free. No commitment.
                </div>
              </div>
              {/* Growth */}
              <div className="border-2 border-[#1A7A3A] rounded-2xl p-6 relative">
                <span className="absolute top-4 right-4 text-[9px] font-black uppercase tracking-wider text-white bg-[#1A7A3A] px-2 py-1 rounded-full">Most Popular</span>
                <p className="text-[10px] font-bold text-[#1A7A3A] uppercase tracking-widest mb-3">Growth</p>
                <div className="text-4xl font-black text-slate-900 mb-1">$149<span className="text-base font-normal text-slate-400">/mo</span></div>
                <div className="text-sm text-slate-500 mb-4">+ $30 per referral detected</div>
                <div className="text-xs text-slate-500 pt-4 border-t border-green-100 leading-relaxed">
                  Standard rate: <span className="line-through text-slate-400">$199 + $35/ref</span><br />
                  Breaks even with Free at <strong>6 referrals/month</strong>
                </div>
              </div>
            </div>

            {/* Quote */}
            <blockquote className="border-l-4 border-[#1A7A3A] pl-5 py-1 mb-2">
              <p className="text-slate-600 text-sm italic leading-relaxed mb-2">
                "The first referral fired while I was with a patient. I didn't do anything — Rippl sent the reward, logged it in the dashboard, and I saw it that evening. That's what I needed."
              </p>
              <footer className="text-xs font-bold text-[#1A7A3A]">
                Dr. David Donelson · Hallmark Dental · Brentwood, TN
              </footer>
            </blockquote>

          </div>

          {/* ── Right column — signup form ── */}
          <div className="mt-12 lg:mt-0 lg:sticky lg:top-24">
            {!submitted ? (
              <div className="bg-white border-2 border-[#1A7A3A] rounded-3xl p-8 shadow-lg shadow-green-900/10">
                <div className="mb-6">
                  <h2 className="text-xl font-black text-slate-900 mb-1">Get started free</h2>
                  <p className="text-slate-500 text-sm">
                    DC members start on the Free tier with no commitment. We'll reach out within 24 hours to get you connected to Open Dental.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {[
                    { key: "name",     label: "Your name",     placeholder: "Dr. Jane Smith",      type: "text"  },
                    { key: "practice", label: "Practice name", placeholder: "Smile Dental Group",   type: "text"  },
                    { key: "email",    label: "Email",         placeholder: "jane@smiledental.com", type: "email" },
                    { key: "phone",    label: "Mobile number", placeholder: "(615) 555-0100",       type: "tel"   },
                  ].map(({ key, label, placeholder, type }) => (
                    <div key={key}>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">{label}</label>
                      <input
                        type={type}
                        placeholder={placeholder}
                        required={key !== "phone"}
                        value={form[key as keyof typeof form]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A7A3A]/30 focus:border-[#1A7A3A] transition-colors"
                      />
                    </div>
                  ))}

                  {error && <p className="text-red-500 text-sm">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-white bg-[#1A7A3A] hover:bg-[#145E2C] disabled:opacity-50 transition-colors mt-2 text-sm tracking-wide"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Start free — DC member pricing
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <p className="text-center text-xs text-slate-400 mt-5">
                  No credit card. No contract. DC-exclusive rates applied automatically.
                </p>
              </div>
            ) : (
              <div className="bg-white border-2 border-[#1A7A3A] rounded-3xl p-8 shadow-lg shadow-green-900/10 text-center">
                <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="w-8 h-8 text-[#1A7A3A]" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">You're in.</h2>
                <p className="text-slate-500 text-sm mb-4 leading-relaxed">
                  We'll reach out within 24 hours to get Open Dental connected and your first referral campaign running.
                </p>
                <p className="text-xs text-slate-400">
                  Questions? <a href="mailto:david@joinrippl.com" className="text-[#1A7A3A] hover:underline font-semibold">david@joinrippl.com</a>
                </p>
              </div>
            )}

            {/* Trust signals */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { val: "Open Dental", sub: "Native integration" },
                { val: "HIPAA",       sub: "No PHI stored" },
                { val: "Tango",       sub: "Gift card delivery" },
              ].map(t => (
                <div key={t.val} className="bg-slate-50 border border-slate-200 rounded-xl py-3 px-2">
                  <div className="text-xs font-black text-slate-700">{t.val}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{t.sub}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 mt-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>Rippl · BD America LLC DBA Rippl · Nashville, TN</div>
          <div>DC Member Exclusive Pricing</div>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-slate-600">Privacy</a>
            <a href="/terms" className="hover:text-slate-600">Terms</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
