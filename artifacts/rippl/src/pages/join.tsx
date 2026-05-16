import { useState } from "react";
import { CheckCircle2, ArrowRight, Zap, DollarSign, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

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
  businessLabel: string;    // "Practice name" vs "Salon name"
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
      { value: "87",    label: "Referrals rewarded at Hallmark Dental" },
      { value: "$3,045", label: "In gift card rewards sent" },
      { value: "0 hrs", label: "Staff time spent" },
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

// ── Step component ────────────────────────────────────────────────────────────

function Step({ n, title, body, last }: { n: number; title: string; body: string; last?: boolean }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-9 h-9 rounded-full bg-[#E0622A] flex items-center justify-center shrink-0 shadow-md shadow-[#E0622A]/25">
          <span className="text-white font-black text-sm">{n}</span>
        </div>
        {!last && <div className="w-px flex-1 bg-slate-200 mt-2 mb-2" />}
      </div>
      <div className={cn("pb-8", last && "pb-0")}>
        <p className="font-bold text-slate-900 text-base mb-1">{title}</p>
        <p className="text-slate-500 text-sm leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Join({ vertical = "dental" }: { vertical?: string }) {
  const c = CONTENT[vertical] ?? DEFAULT;

  const [form, setForm]         = useState({ name: "", practice: "", email: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/public/waitlist`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          ...form,
          practice: `[${vertical}] ${form.practice}`,
        }),
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
    <div className="min-h-screen bg-white">

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav className="border-b border-slate-100 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold text-xl tracking-tight">rip</span>
          <span className="text-[#E0622A] font-bold text-xl tracking-tight">pl</span>
        </div>
        <a
          href="#demo-form"
          className="text-xs font-bold text-white bg-[#E0622A] hover:bg-[#C9551E] px-4 py-2 rounded-full transition-colors"
        >
          Get a Demo
        </a>
      </nav>

      <div className="max-w-2xl mx-auto px-5 sm:px-8">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="pt-14 pb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-[#E0622A]" />
            <span className="text-orange-700 text-xs font-bold tracking-wider uppercase">{c.badge}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 leading-[1.08] tracking-tight mb-3">
            {c.headline}
          </h1>
          <h2 className="text-4xl sm:text-5xl font-black leading-[1.08] tracking-tight mb-6"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#E0622A" }}>
            {c.headlineAccent}
          </h2>

          <p className="text-slate-500 text-lg leading-relaxed mb-3">{c.body}</p>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-8">{c.integration}</p>

          <a
            href="#demo-form"
            className="inline-flex items-center gap-2 bg-[#E0622A] hover:bg-[#C9551E] text-white font-bold px-7 py-3.5 rounded-full text-sm shadow-lg shadow-[#E0622A]/25 transition-colors"
          >
            {c.ctaLabel}
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* ── Stats strip ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 mb-16">
          {c.stats.map(s => (
            <div key={s.label} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
              <p className="text-[#E0622A] font-black text-xl mb-1 leading-none"
                 style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                {s.value}
              </p>
              <p className="text-slate-500 text-[10px] font-semibold leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <div className="mb-16">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">How it works</p>
          <div>
            {c.steps.map((step, i) => (
              <Step
                key={step.title}
                n={i + 1}
                title={step.title}
                body={step.body}
                last={i === c.steps.length - 1}
              />
            ))}
          </div>
        </div>

        {/* ── Pricing callout ───────────────────────────────────────────────── */}
        <div className="bg-slate-900 rounded-3xl p-8 mb-16 text-center">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Pricing</p>
          <p className="text-white font-black text-4xl mb-2"
             style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            $20
          </p>
          <p className="text-slate-300 font-semibold text-base mb-6">per completed referral</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center text-sm">
            {[
              { icon: Zap,         label: "No monthly fees" },
              { icon: DollarSign,  label: "No setup costs" },
              { icon: Clock,       label: "No contracts" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-slate-400 justify-center">
                <Icon className="w-3.5 h-3.5 text-[#E0622A]" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Demo form ─────────────────────────────────────────────────────── */}
        <div id="demo-form" className="mb-20 scroll-mt-8">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Get a demo</p>

          {!submitted ? (
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8">
              <h2 className="text-2xl font-black text-slate-900 mb-1">See Rippl in action.</h2>
              <p className="text-slate-500 text-sm mb-7">
                20 minutes. We'll show you the full referral flow live.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Your name</label>
                  <input
                    type="text"
                    required
                    placeholder={c.namePlaceholder}
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#E0622A]/30 focus:border-[#E0622A] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{c.businessLabel}</label>
                  <input
                    type="text"
                    required
                    placeholder={c.businessPlaceholder}
                    value={form.practice}
                    onChange={e => setForm(f => ({ ...f, practice: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#E0622A]/30 focus:border-[#E0622A] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="jane@example.com"
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
                    <>
                      {c.ctaLabel}
                      <ArrowRight className="w-4 h-4" />
                    </>
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
              <p className="text-slate-500 text-sm mb-1">{c.successNote}</p>
              <p className="text-xs text-slate-400 mt-4">
                Questions?{" "}
                <a href="mailto:hello@joinrippl.com" className="text-[#E0622A] hover:underline">
                  hello@joinrippl.com
                </a>
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="border-t border-slate-100 py-8 text-center">
          <p className="text-xs text-slate-400 mb-1">{c.footerNote}</p>
          <p className="text-xs text-slate-300">© {new Date().getFullYear()} Rippl · joinrippl.com</p>
        </div>

      </div>
    </div>
  );
}
