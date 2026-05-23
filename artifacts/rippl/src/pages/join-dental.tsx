import { useState } from "react";
import { ArrowRight, CheckCircle2, TrendingUp, Users, DollarSign, Zap, Plug } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

// ── Data ─────────────────────────────────────────────────────────────────────

const CHANNELS = [
  { name: "Google Ads / PPC",     low: 150,  high: 350,  quality: "Cold",  qualityColor: "text-red-500" },
  { name: "Facebook / Instagram", low: 200,  high: 400,  quality: "Cold",  qualityColor: "text-red-500" },
  { name: "EDDM / Direct Mail",   low: 133,  high: 600,  quality: "Cold",  qualityColor: "text-red-500" },
  { name: "Insurance Directories",low: 100,  high: 250,  quality: "Weak",  qualityColor: "text-yellow-600" },
  { name: "Rippl (Growth plan)",  low: 47,   high: 57,   quality: "Hot ✦", qualityColor: "text-[#E0622A] font-bold", isRippl: true },
];

const STATS = [
  { value: "87",     label: "Referrals completed at Hallmark Dental" },
  { value: "$3,045", label: "In gift card rewards delivered" },
  { value: "0 hrs",  label: "Staff time spent on tracking" },
];

const QUALITY_POINTS = [
  { stat: "37%",         label: "higher retention rate vs. paid-channel patients" },
  { stat: "25%",         label: "higher lifetime value vs. paid-channel patients" },
  { stat: "$5,500–$7,500", label: "average patient lifetime value in general dentistry" },
  { stat: "7–10 yrs",    label: "average patient stays with a practice they were referred to" },
];

const HOW_IT_WORKS = [
  {
    title: "Patient gets their referral link",
    body:  "Enrolled patients receive a personal referral link by text or email. They share it however they want — text, Instagram, word of mouth. Their rewards dashboard tracks every referral in real time.",
  },
  {
    title: "Friend completes their first visit",
    body:  "When the referred patient finishes their first appointment, Rippl confirms the referral automatically through your practice management system — no phone tag, no spreadsheet, no front desk follow-up.",
  },
  {
    title: "Gift card delivered in minutes",
    body:  "The referring patient gets a $35–$100 Visa, Amazon, Target, or Starbucks gift card by email within minutes. The new patient knows they were the catalyst. Both patients leave with a reason to refer again.",
  },
];

const STEPS_DEMO = [
  "Live dashboard walkthrough — see your referral pipeline",
  "Watch a real gift card get sent in real time",
  "Open Dental integration demo with your actual setup",
  "Pricing, onboarding timeline, and staff rollout plan",
];

// ── Utility ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function JoinDental() {
  const [form, setForm]           = useState({ name: "", practice: "", email: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/public/waitlist`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, practice: `[dental] ${form.practice}` }),
      });
      if (!res.ok) throw new Error("failed");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav className="border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-1 select-none">
            <span className="text-slate-900 font-black text-2xl tracking-tight leading-none">rip</span>
            <span className="text-[#E0622A] font-black text-2xl tracking-tight leading-none">pl</span>
          </div>
          <a
            href="#demo-form"
            className="text-xs font-bold text-white bg-[#E0622A] hover:bg-[#C9551E] px-5 py-2.5 rounded-full transition-colors shadow-sm shadow-[#E0622A]/20"
          >
            Get a Demo
          </a>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="lg:grid lg:grid-cols-2 lg:gap-20 lg:items-center">

          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-[#E0622A] animate-pulse" />
              <span className="text-orange-700 text-xs font-bold tracking-wider uppercase">Now accepting dental practices</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-black text-slate-900 leading-[1.05] tracking-tight mb-4">
              Stop paying $300<br />for a new patient.
            </h1>
            <p
              className="text-3xl sm:text-4xl font-black leading-tight mb-7"
              style={{ color: "#E0622A" }}
            >
              Rippl delivers referred<br />patients at $47 all-in.
            </p>

            <p className="text-slate-500 text-lg leading-relaxed mb-2 max-w-lg">
              Rippl detects completed referrals in Open Dental automatically, sends a gift card reward to the referring patient, and delivers a new patient who already trusts your practice — no staff effort, no manual tracking.
            </p>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-10">
              Integrates with Open Dental
            </p>

            <div className="flex flex-wrap gap-4">
              <a
                href="#demo-form"
                className="inline-flex items-center gap-2.5 bg-[#E0622A] hover:bg-[#C9551E] text-white font-bold px-8 py-4 rounded-full text-base shadow-xl shadow-[#E0622A]/25 transition-all hover:shadow-[#E0622A]/35 hover:-translate-y-0.5"
              >
                Get a Demo
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="#the-math"
                className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 font-semibold px-6 py-4 rounded-full border border-slate-200 hover:border-slate-300 text-sm transition-colors"
              >
                See the math
              </a>
            </div>
          </div>

          {/* Right — live stats */}
          <div className="mt-14 lg:mt-0">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">
              Live from Hallmark Dental, Brentwood TN
            </p>
            <div className="space-y-4">
              {STATS.map(s => (
                <div
                  key={s.label}
                  className="flex items-center gap-6 bg-slate-50 rounded-2xl p-6 border border-slate-100"
                >
                  <p
                    className="text-[#E0622A] font-black text-4xl leading-none shrink-0 w-28 text-right"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  >
                    {s.value}
                  </p>
                  <p className="text-slate-600 text-sm font-semibold leading-tight">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-4 pl-1">
              *$47 = $35 gift card + $12 Growth plan platform fee. Data as of May 2026.
            </p>
          </div>
        </div>
      </section>

      {/* ── The Math ─────────────────────────────────────────────────────────── */}
      <section id="the-math" className="bg-slate-900 py-20 lg:py-28 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-6">

          <div className="max-w-2xl mb-14">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">The math</p>
            <h2 className="text-3xl lg:text-4xl font-black text-white leading-tight mb-4">
              What you're actually paying<br />to acquire a new patient.
            </h2>
            <p className="text-slate-400 text-base leading-relaxed">
              Most practices are spending $150–$400 per new patient on cold advertising — reaching people who've never heard of them, with no reason to trust them. Rippl flips that model.
            </p>
          </div>

          {/* Channel table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-slate-500 text-xs font-bold uppercase tracking-widest pb-4 pr-8">Channel</th>
                  <th className="text-right text-slate-500 text-xs font-bold uppercase tracking-widest pb-4 px-8">Cost Per New Patient</th>
                  <th className="text-right text-slate-500 text-xs font-bold uppercase tracking-widest pb-4">Patient Quality</th>
                </tr>
              </thead>
              <tbody>
                {CHANNELS.map((ch, i) => (
                  <tr
                    key={ch.name}
                    className={`border-b ${ch.isRippl ? "border-[#E0622A]/30 bg-[#E0622A]/8" : "border-white/5"}`}
                  >
                    <td className={`py-5 pr-8 font-semibold ${ch.isRippl ? "text-white" : "text-slate-300"}`}>
                      {ch.isRippl && (
                        <span className="inline-block mr-2 px-2 py-0.5 bg-[#E0622A] text-white text-[10px] font-bold uppercase tracking-wider rounded">
                          Rippl
                        </span>
                      )}
                      {ch.name}
                    </td>
                    <td className={`py-5 px-8 text-right font-black text-lg ${ch.isRippl ? "text-[#E0622A]" : "text-slate-200"}`}
                      style={ch.isRippl ? { fontFamily: "Georgia, serif" } : {}}
                    >
                      {ch.isRippl
                        ? `${fmt(ch.low)}–${fmt(ch.high)}`
                        : <span className="text-slate-400">{fmt(ch.low)}–{fmt(ch.high)}</span>
                      }
                    </td>
                    <td className={`py-5 text-right ${ch.qualityColor}`}>
                      {ch.quality}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-slate-600 text-xs mt-6">
            Sources: Google Ads CPC benchmarks (PPC Chief 2026), EDDM dental acquisition data (EveryDoorDirectMail.com),
            Facebook/Instagram dental ad costs (Remedo 2025), Dentplicity patient acquisition cost benchmarks 2026.
            Rippl cost = $35 gift card + $12 Growth plan platform fee.
          </p>
        </div>
      </section>

      {/* ── Patient Quality ──────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="lg:grid lg:grid-cols-2 lg:gap-20 lg:items-center">

            {/* Left — LTV story */}
            <div className="mb-12 lg:mb-0">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Patient lifetime value</p>
              <h2 className="text-3xl lg:text-4xl font-black text-slate-900 leading-tight mb-5">
                A referred patient isn't<br />just cheaper to get.<br />
                <span className="text-[#E0622A]">They're worth more.</span>
              </h2>
              <p className="text-slate-500 text-base leading-relaxed mb-8">
                The average general dentistry patient generates <strong className="text-slate-900">$5,500–$7,500 in lifetime value</strong> over a 7–10 year relationship. A referred patient walks in already trusting your practice — they arrived because a friend said you were worth it. That head start translates directly into retention, case acceptance, and referral behavior of their own.
              </p>
              <a href="#demo-form" className="inline-flex items-center gap-2 text-[#E0622A] font-bold text-sm hover:underline">
                See how Hallmark Dental runs it <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* Right — stats grid */}
            <div className="grid grid-cols-2 gap-4">
              {QUALITY_POINTS.map(q => (
                <div key={q.stat} className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                  <p
                    className="text-[#E0622A] font-black text-3xl leading-none mb-2"
                    style={{ fontFamily: "Georgia, serif" }}
                  >
                    {q.stat}
                  </p>
                  <p className="text-slate-600 text-xs font-semibold leading-relaxed">{q.label}</p>
                </div>
              ))}
              <div className="col-span-2 bg-orange-50 border border-orange-100 rounded-2xl p-5 flex items-center gap-4">
                <TrendingUp className="w-7 h-7 text-[#E0622A] shrink-0" />
                <p className="text-slate-700 text-sm leading-relaxed">
                  <strong>Referred patients generate their own referrals</strong> at a higher rate than paid-channel patients — compounding your return over time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-3xl lg:text-4xl font-black text-slate-900">
              Zero front desk effort.<br />Automatic from first visit to gift card.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-8 relative">
            <div className="hidden lg:block absolute top-5 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-slate-200" />

            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.title} className="flex lg:flex-col gap-5">
                <div className="flex lg:hidden flex-col items-center shrink-0">
                  <div className="w-9 h-9 rounded-full bg-[#E0622A] flex items-center justify-center shadow-md shadow-[#E0622A]/25 z-10">
                    <span className="text-white font-black text-sm">{i + 1}</span>
                  </div>
                  {i < HOW_IT_WORKS.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-2" />}
                </div>
                <div className="hidden lg:flex w-9 h-9 rounded-full bg-[#E0622A] items-center justify-center shadow-md shadow-[#E0622A]/25 z-10">
                  <span className="text-white font-black text-sm">{i + 1}</span>
                </div>
                <div className="pb-8 lg:pb-0">
                  <p className="font-bold text-slate-900 text-base lg:text-lg mb-2">{step.title}</p>
                  <p className="text-slate-500 text-sm leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Not on Open Dental? ──────────────────────────────────────────────── */}
      <section className="py-12 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl px-8 py-7 lg:flex lg:items-center lg:gap-10">
            <div className="flex items-center gap-4 mb-4 lg:mb-0 shrink-0">
              <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <Plug className="w-5 h-5 text-slate-500" />
              </div>
              <p className="font-bold text-slate-900 text-base">Not on Open Dental?</p>
            </div>
            <div className="flex-1">
              <p className="text-slate-500 text-sm leading-relaxed">
                We currently integrate with <strong className="text-slate-700">Open Dental</strong>. We're actively building connections to more practice management systems — Dentrix, Eaglesoft, Curve, and beyond.
                If your practice runs on a different EMR or PMS, reach out and tell us what you're using. We'll let you know the moment your system is supported.
              </p>
            </div>
            <div className="mt-5 lg:mt-0 shrink-0">
              <a
                href="mailto:hello@joinrippl.com?subject=PMS%20Integration%20Request&body=Hi%2C%20I'm%20interested%20in%20Rippl%20but%20my%20practice%20uses%3A%20"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:border-slate-300 hover:shadow-sm transition-all whitespace-nowrap"
              >
                Tell us your EMR
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 lg:py-28 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-6">

          <div className="text-center mb-14">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-3xl lg:text-4xl font-black text-slate-900 mb-4">
              Simple. Tied to results.
            </h2>
            <p className="text-slate-500 text-base max-w-xl mx-auto">
              You pay for the platform fee per referral. The gift card cost goes directly to your patient — that's your acquisition cost, not ours.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">

            {/* Pay-As-You-Go */}
            <div className="border border-slate-200 rounded-3xl p-8">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Pay-as-you-go</p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-5xl font-black text-slate-900" style={{ fontFamily: "Georgia, serif" }}>$0</span>
                <span className="text-slate-400 text-sm">/month</span>
              </div>
              <p className="text-slate-500 text-sm mb-1">+</p>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-3xl font-black text-slate-900" style={{ fontFamily: "Georgia, serif" }}>$35</span>
                <span className="text-slate-500 text-sm">per completed referral</span>
              </div>

              <div className="space-y-3 mb-8">
                {[
                  "No monthly commitment",
                  "Pay only when a referral completes",
                  "Full platform access",
                  "Gift card delivery included",
                ].map(f => (
                  <div key={f} className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <p className="text-slate-600 text-sm">{f}</p>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 rounded-xl p-4 mb-6">
                <p className="text-xs text-slate-500 leading-relaxed">
                  <strong className="text-slate-700">Best for:</strong> Practices that want to test before committing. At 9+ referrals/month, the Growth plan pays for itself.
                </p>
              </div>

              <a href="#demo-form" className="block w-full py-3.5 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-sm text-center hover:border-slate-300 transition-colors">
                Get a Demo
              </a>
            </div>

            {/* Growth */}
            <div className="border-2 border-[#E0622A] rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-5 right-5 px-3 py-1 bg-[#E0622A] text-white text-[10px] font-black uppercase tracking-wider rounded-full">
                Recommended
              </div>

              <p className="text-xs font-bold text-[#E0622A] uppercase tracking-widest mb-4">Growth</p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-5xl font-black text-slate-900" style={{ fontFamily: "Georgia, serif" }}>$249</span>
                <span className="text-slate-400 text-sm">/month</span>
              </div>
              <p className="text-slate-500 text-sm mb-1">+</p>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-3xl font-black text-slate-900" style={{ fontFamily: "Georgia, serif" }}>$12</span>
                <span className="text-slate-500 text-sm">per completed referral</span>
              </div>

              <div className="space-y-3 mb-8">
                {[
                  "Everything in Pay-as-you-go",
                  "Full implementation playbook",
                  "Staff training materials + scripts",
                  "Digital assets for your website",
                  "Monthly referral performance report",
                ].map(f => (
                  <div key={f} className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#E0622A] shrink-0" />
                    <p className="text-slate-700 text-sm font-medium">{f}</p>
                  </div>
                ))}
              </div>

              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6">
                <p className="text-xs text-orange-800 leading-relaxed">
                  <strong>The ROI case:</strong> 10 referrals/month = $369 total platform cost vs. $2,500+ on Google Ads for the same 10 cold leads. Rippl pays for itself on the second referral.
                </p>
              </div>

              <a
                href="#demo-form"
                className="block w-full py-3.5 rounded-xl bg-[#E0622A] hover:bg-[#C9551E] text-white font-bold text-sm text-center transition-colors shadow-lg shadow-[#E0622A]/20"
              >
                Get a Demo
              </a>
            </div>
          </div>

          {/* Staff pool callout */}
          <div className="max-w-4xl mx-auto bg-slate-900 rounded-2xl p-7 lg:flex lg:items-center lg:gap-8">
            <div className="flex items-center gap-4 mb-4 lg:mb-0 shrink-0">
              <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#E0622A]" />
              </div>
              <div>
                <p className="text-white font-bold text-base">Staff Incentive Pool</p>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mt-0.5">Included on all plans</p>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm leading-relaxed">
                Practices that keep their staff in the loop get more referrals. Set a per-referral contribution amount — say $10 — and Rippl automatically tracks it in a pool visible in your dashboard. Your team sees the program working. You decide how and when to distribute it. No extra charge from us — that money goes straight to your people.
              </p>
            </div>
            <div className="mt-5 lg:mt-0 shrink-0">
              <span className="inline-block px-4 py-2 bg-white/10 text-white text-xs font-semibold rounded-xl text-center leading-snug">No Rippl<br />fee to enable</span>
            </div>
          </div>

          {/* Crossover calculator note */}
          <div className="max-w-4xl mx-auto mt-6 flex items-center gap-3 px-2">
            <Zap className="w-4 h-4 text-slate-400 shrink-0" />
            <p className="text-slate-400 text-xs">
              <strong className="text-slate-500">Crossover point:</strong> At 9 completed referrals/month, the Growth plan and Pay-as-you-go cost the same. Above 9, Growth saves you money every month.
            </p>
          </div>
        </div>
      </section>

      {/* ── ROI comparison callout ────────────────────────────────────────────── */}
      <section className="bg-orange-50 border-y border-orange-100 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="lg:grid lg:grid-cols-3 lg:gap-8 text-center lg:text-left">
            <div className="mb-8 lg:mb-0">
              <p className="text-xs font-bold text-orange-700 uppercase tracking-widest mb-3">10 referrals/month via Rippl</p>
              <p className="text-4xl font-black text-slate-900 mb-1" style={{ fontFamily: "Georgia, serif" }}>$369</p>
              <p className="text-slate-500 text-sm">Monthly platform cost (Growth plan)</p>
            </div>
            <div className="mb-8 lg:mb-0 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center mb-3">
                <span className="text-[#E0622A] font-black text-lg">vs</span>
              </div>
              <p className="text-slate-400 text-sm">Same 10 patients via</p>
              <p className="text-slate-400 text-sm font-semibold">Google Ads</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">10 new patients via Google Ads</p>
              <p className="text-4xl font-black text-slate-400 mb-1 line-through" style={{ fontFamily: "Georgia, serif" }}>$2,500+</p>
              <p className="text-slate-400 text-sm">Cold leads. No referral trust. Higher churn.</p>
            </div>
          </div>
          <div className="mt-10 pt-10 border-t border-orange-200 text-center">
            <p className="text-slate-600 text-sm">
              Rippl patient total cost all-in: $369 platform + $350 gift cards = <strong className="text-slate-900">$719/month</strong>.
              {" "}Google Ads equivalent: <strong className="text-slate-900">$2,500–$3,500/month</strong> for cold patients.{" "}
              <strong className="text-[#E0622A]">You save $1,800–$2,800 per month and get better patients.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* ── Demo form ─────────────────────────────────────────────────────────── */}
      <section id="demo-form" className="py-20 lg:py-28 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="lg:grid lg:grid-cols-2 lg:gap-20 lg:items-start">

            {/* Left */}
            <div className="mb-12 lg:mb-0 lg:pt-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Get a demo</p>
              <h2 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight mb-5">
                See Rippl running<br />at a real practice.
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed mb-8">
                20 minutes. We'll walk through the full referral flow — enrollment to gift card delivery — live. We'll also show you exactly how to roll it out to your staff.
              </p>
              <div className="space-y-4">
                {STEPS_DEMO.map(item => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-[#E0622A]" />
                    </div>
                    <p className="text-slate-600 text-sm">{item}</p>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex items-start gap-3 bg-slate-50 rounded-xl p-4 border border-slate-100">
                <DollarSign className="w-5 h-5 text-[#E0622A] shrink-0 mt-0.5" />
                <p className="text-slate-600 text-sm leading-relaxed">
                  <strong className="text-slate-900">No credit card required for the demo.</strong> We'll set up a 30-day pilot with your practice — you'll see real referrals tracked before you commit to anything.
                </p>
              </div>
            </div>

            {/* Right — form */}
            <div>
              {!submitted ? (
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 lg:p-10">
                  <h3 className="text-xl font-black text-slate-900 mb-1">Book your demo</h3>
                  <p className="text-slate-500 text-sm mb-7">We'll reach out within one business day.</p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Your name</label>
                        <input
                          type="text"
                          required
                          placeholder="Dr. Jane Smith"
                          value={form.name}
                          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#E0622A]/30 focus:border-[#E0622A] transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Practice name</label>
                        <input
                          type="text"
                          required
                          placeholder="Smile Dental Group"
                          value={form.practice}
                          onChange={e => setForm(f => ({ ...f, practice: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#E0622A]/30 focus:border-[#E0622A] transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Work email</label>
                      <input
                        type="email"
                        required
                        placeholder="jane@smiledental.com"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#E0622A]/30 focus:border-[#E0622A] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mobile number</label>
                      <input
                        type="tel"
                        required
                        placeholder="(615) 555-0100"
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#E0622A]/30 focus:border-[#E0622A] transition-colors"
                      />
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-black text-white text-sm bg-[#E0622A] hover:bg-[#C9551E] disabled:opacity-50 transition-colors shadow-lg shadow-[#E0622A]/20 mt-2"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>Book My Demo <ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-10 text-center">
                  <div className="w-16 h-16 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="w-8 h-8 text-[#E0622A]" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 mb-2">You're on the list.</h2>
                  <p className="text-slate-500 text-sm mb-1">We'll reach out within one business day to schedule your 20-minute demo.</p>
                  <p className="text-xs text-slate-400 mt-4">
                    Questions?{" "}
                    <a href="mailto:hello@joinrippl.com" className="text-[#E0622A] hover:underline">hello@joinrippl.com</a>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            <span className="text-slate-300 font-black text-lg tracking-tight">rip</span>
            <span className="text-[#E0622A]/50 font-black text-lg tracking-tight">pl</span>
          </div>
          <p className="text-xs text-slate-400">Built by a dentist, for dental practices.</p>
          <div className="flex items-center gap-4 text-xs text-slate-300">
            <a href="/privacy" className="hover:text-slate-500 transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-slate-500 transition-colors">Terms</a>
            <span>© {new Date().getFullYear()} Rippl</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
