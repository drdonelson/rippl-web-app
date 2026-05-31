import { CheckCircle2, ArrowRight, Zap, DollarSign, Clock } from "lucide-react";

const CALENDLY_URL = "https://calendly.com/david-joinrippl";

// ── Vertical content ──────────────────────────────────────────────────────────

interface VerticalContent {
  badge: string;
  headline: string;
  headlineAccent: string;
  body: string;
  integration: string;
  ctaLabel: string;
  stats: { value: string; label: string }[];
  steps: { title: string; body: string }[];
  businessLabel: string;
  businessPlaceholder: string;
  namePlaceholder: string;
  successNote: string;
  footerNote: string;
}

const CONTENT: Record<string, VerticalContent> = {
  dental: {
    badge: "Now accepting practices",
    headline: "Your patients are already talking.",
    headlineAccent: "Now reward them for it.",
    body: "Rippl detects when a referred patient completes their first visit and automatically sends a gift card reward — no staff action, no manual tracking.",
    integration: "Integrates with Open Dental",
    ctaLabel: "Get a Demo",
    stats: [
      { value: "87",     label: "Referrals rewarded at Hallmark Dental" },
      { value: "$3,045", label: "In gift card rewards sent" },
      { value: "0 hrs",  label: "Staff time spent" },
    ],
    steps: [
      {
        title: "Patient shares their link",
        body:  "Enrolled patients get a personal referral link to text or share on social. They track their rewards and tier status in real time.",
      },
      {
        title: "Friend completes their first visit",
        body:  "Rippl detects the completed appointment in Open Dental automatically when the R0150 procedure code is posted — no staff input needed.",
      },
      {
        title: "Gift card delivered in minutes",
        body:  "The referring patient gets a $35–$100 Amazon, Visa, Target, or Starbucks gift card by email. Instant. Automatic. Zero front desk effort.",
      },
    ],
    businessLabel:       "Practice name",
    businessPlaceholder: "Smile Dental Group",
    namePlaceholder:     "Dr. Jane Smith",
    successNote:         "We'll reach out within one business day to schedule a 20-minute demo.",
    footerNote:          "Built by a dentist, for dental practices.",
  },
  salon: {
    badge: "Now accepting salons",
    headline: "Your clients are your best marketing.",
    headlineAccent: "Now reward them for it.",
    body: "Rippl detects when a referred client completes their first appointment and automatically sends a gift card reward — zero staff effort required.",
    integration: "Integrates with Vagaro",
    ctaLabel: "Get a Demo",
    stats: [
      { value: "Automatic", label: "Referral detection via Vagaro" },
      { value: "$35–$100",  label: "Gift card rewards" },
      { value: "$0",        label: "Monthly fees, ever" },
    ],
    steps: [
      {
        title: "Client shares their link",
        body:  "Enrolled clients get a personal referral link to share with friends. They see their rewards and status in real time.",
      },
      {
        title: "Friend completes their first appointment",
        body:  "Rippl detects the completed booking in Vagaro automatically when a new-client service is marked complete — no staff input needed.",
      },
      {
        title: "Gift card delivered in minutes",
        body:  "The referring client gets a $35–$100 gift card by email within minutes. Automatic. No front desk action, no manual tracking.",
      },
    ],
    businessLabel:       "Salon name",
    businessPlaceholder: "Riverside Salon & Spa",
    namePlaceholder:     "Jane Smith",
    successNote:         "We'll reach out within one business day to schedule a quick demo.",
    footerNote:          "Built for salons that grow through word of mouth.",
  },
};

const DEFAULT = CONTENT.dental;

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Join({ vertical = "dental" }: { vertical?: string }) {
  const c = CONTENT[vertical] ?? DEFAULT;

  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav className="border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-black text-2xl tracking-tight leading-none">rip</span>
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

          {/* Left — copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-[#E0622A]" />
              <span className="text-orange-700 text-xs font-bold tracking-wider uppercase">{c.badge}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.05] tracking-tight mb-3">
              {c.headline}
            </h1>
            <h2
              className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight mb-7"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#E0622A" }}
            >
              {c.headlineAccent}
            </h2>

            <p className="text-slate-500 text-lg leading-relaxed mb-2 max-w-lg">{c.body}</p>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-10">{c.integration}</p>

            <a
              href="#demo-form"
              className="inline-flex items-center gap-2.5 bg-[#E0622A] hover:bg-[#C9551E] text-white font-bold px-8 py-4 rounded-full text-base shadow-xl shadow-[#E0622A]/25 transition-all hover:shadow-[#E0622A]/35 hover:-translate-y-0.5"
            >
              {c.ctaLabel}
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>

          {/* Right — stats */}
          <div className="mt-14 lg:mt-0">
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-3 lg:gap-4">
              {c.stats.map(s => (
                <div
                  key={s.label}
                  className="bg-slate-50 rounded-2xl lg:rounded-3xl p-4 lg:p-7 border border-slate-100 text-center lg:text-left lg:flex lg:items-center lg:gap-6"
                >
                  <p
                    className="text-[#E0622A] font-black text-xl lg:text-4xl mb-1 lg:mb-0 leading-none lg:shrink-0"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  >
                    {s.value}
                  </p>
                  <p className="text-slate-500 text-[10px] lg:text-sm font-semibold leading-tight">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section className="bg-slate-50 border-y border-slate-100 py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-12 text-center">How it works</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-8 relative">
            {/* Horizontal connector line (desktop only) */}
            <div className="hidden lg:block absolute top-5 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-slate-200" />

            {c.steps.map((step, i) => (
              <div key={step.title} className="flex lg:flex-col gap-5 lg:gap-5">
                {/* Mobile: vertical connector */}
                <div className="flex lg:hidden flex-col items-center shrink-0">
                  <div className="w-9 h-9 rounded-full bg-[#E0622A] flex items-center justify-center shadow-md shadow-[#E0622A]/25 z-10">
                    <span className="text-white font-black text-sm">{i + 1}</span>
                  </div>
                  {i < c.steps.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-2" />}
                </div>
                {/* Desktop: number on top */}
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

      {/* ── Pricing callout ───────────────────────────────────────────────────── */}
      <section className="bg-slate-900 py-20 lg:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
            {/* Left — price */}
            <div className="mb-10 lg:mb-0">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-5">Pricing</p>
              <div className="flex items-baseline gap-3 mb-3">
                <span
                  className="text-white font-black text-7xl lg:text-8xl leading-none"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  $20
                </span>
              </div>
              <p className="text-slate-300 text-xl font-semibold">per completed referral</p>
              <p className="text-slate-500 text-sm mt-3 leading-relaxed max-w-sm">
                You only pay when a referral actually completes. No referrals this month? You pay nothing.
              </p>
            </div>

            {/* Right — features */}
            <div className="space-y-5">
              {[
                { icon: Zap,        label: "No monthly fees",  body: "Pay only for results, never for access." },
                { icon: DollarSign, label: "No setup costs",   body: "We handle onboarding and integration at no charge." },
                { icon: Clock,      label: "No contracts",     body: "Cancel any time. No lock-in, no commitments." },
              ].map(({ icon: Icon, label, body }) => (
                <div key={label} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[#E0622A]" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{label}</p>
                    <p className="text-slate-400 text-sm leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Demo form ─────────────────────────────────────────────────────────── */}
      <section id="demo-form" className="py-20 lg:py-28 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="lg:grid lg:grid-cols-2 lg:gap-20 lg:items-start">

            {/* Left — pitch */}
            <div className="mb-12 lg:mb-0 lg:pt-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Get a demo</p>
              <h2 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight mb-5">
                See Rippl<br />in action.
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed mb-8">
                20 minutes. We'll walk you through the full referral flow live — from enrollment to gift card delivery.
              </p>
              <div className="space-y-4">
                {[
                  "Live walkthrough of the referral dashboard",
                  "See a real gift card get sent",
                  "Integration demo with your practice software",
                  "Pricing and onboarding timeline",
                ].map(item => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-[#E0622A]" />
                    </div>
                    <p className="text-slate-600 text-sm">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Calendly */}
            <div>
              <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
                <iframe
                  src={CALENDLY_URL}
                  width="100%"
                  height="700"
                  frameBorder={0}
                  title="Book a Demo with Rippl"
                  style={{ display: "block" }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <span className="text-slate-300 font-black text-lg tracking-tight leading-none">rip</span>
            <span className="text-[#E0622A]/50 font-black text-lg tracking-tight leading-none">pl</span>
          </div>
          <p className="text-xs text-slate-400">{c.footerNote}</p>
          <p className="text-xs text-slate-300">© {new Date().getFullYear()} Rippl · joinrippl.com</p>
        </div>
      </footer>

    </div>
  );
}
