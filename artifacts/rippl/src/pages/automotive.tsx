import React, { useState } from "react";
import {
  Droplets, ChevronRight, CheckCircle2, Zap, Search, Gift,
  MessageSquare, BarChart3, Loader2, X, ArrowRight, ChevronDown, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CALENDLY_URL = "https://calendly.com/david-joinrippl/30min";
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const STATS = [
  { value: "5–15%", label: "Of sold customers will refer",    sub: "When you give them a reason to" },
  { value: "4×",    label: "Higher close rate",               sub: "vs. cold internet leads" },
  { value: "41%",   label: "Better retention",                sub: "Referred buyers come back" },
  { value: "0",     label: "BDC steps required",              sub: "Fully automated" },
];

const HOW_IT_WORKS = [
  {
    emoji: "🚗",
    title: "Connect your DMS",
    body: "Rippl integrates with DriveCentric. Setup takes one afternoon — no IT project, no data migration.",
  },
  {
    emoji: "📲",
    title: "Customers share their link",
    body: "Enrolled customers get a personal referral link to share with family and friends. That's the entire ask.",
  },
  {
    emoji: "🤝",
    title: "Referred customer closes a deal",
    body: "When the referred customer purchases a vehicle, Rippl detects it automatically through DriveCentric.",
  },
  {
    emoji: "🎁",
    title: "Reward fires — zero BDC work",
    body: "The referring customer gets an SMS + email and chooses their reward. Your team doesn't lift a finger.",
  },
];

const INCLUDED = [
  { Icon: Search,        text: "Automatic deal detection via DriveCentric" },
  { Icon: MessageSquare, text: "SMS reward notifications" },
  { Icon: Gift,          text: "Digital gift cards — Amazon, Visa, Target, and more" },
  { Icon: Zap,           text: "Zero BDC work — fully automated end to end" },
  { Icon: BarChart3,     text: "Dashboard with referral pipeline and reward history" },
  { Icon: Shield,        text: "Dedup protection — one reward per verified sale" },
];

const CHANNELS = [
  { name: "Third-party leads (TrueCar, Cars.com)", costPerSale: "$300–$600", quality: "Price-shopping, low loyalty", effort: "Constant BDC follow-up", highlight: false },
  { name: "Digital advertising",                    costPerSale: "$500–$900", quality: "Strangers, unknown intent",   effort: "Agency + creative mgmt",  highlight: false },
  { name: "Conquest mailers",                        costPerSale: "$400–$700", quality: "Cold, ad-fatigued",           effort: "Design, print, mail each drop", highlight: false },
  { name: "Rippl",                                   costPerSale: "$245–$300", quality: "Peer-verified trust",         effort: "Fully automated",          highlight: true  },
];

const FAQS = [
  {
    q: "When exactly am I charged?",
    a: "Only when a referred customer closes a vehicle purchase — confirmed automatically through DriveCentric. No sale, no charge.",
  },
  {
    q: "What does the referring customer receive?",
    a: "An SMS + email with a claim link. They choose from Amazon, Visa, Target, or Starbucks digital gift cards — $150–$250 depending on their referral tier.",
  },
  {
    q: "Is there a setup fee?",
    a: "There's a one-time $499 setup fee covering DriveCentric integration, team training, and go-live support. Founding Member dealerships that go live before January 1, 2027 get the fee waived. Ask us about Founding Member status.",
  },
  {
    q: "Does it work with our DMS?",
    a: "Rippl's automotive integration is built on DriveCentric. If your store uses DriveCentric, you can go live within days. Additional DMS integrations are on the roadmap.",
  },
  {
    q: "Can we run this across multiple rooftops?",
    a: "Yes. Rippl supports multi-rooftop groups under one account. Each location gets its own referral tracking and reporting.",
  },
  {
    q: "How long does setup take?",
    a: "Most dealerships go live in one session. We handle the DriveCentric connection, configure your reward tiers, and train your team. Usually under 2 hours.",
  },
];

type FormState = "idle" | "submitting" | "success" | "error";

function DemoModal({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<FormState>("idle");
  const [form, setForm] = useState({ name: "", dealership: "", email: "", phone: "", locations: "" });

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    try {
      const res = await fetch(`${BASE}/api/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, practice: form.dealership,
          email: form.email, phone: form.phone,
          source: "automotive-page", emr: "DriveCentric",
        }),
      });
      if (!res.ok) throw new Error("request failed");
      setState("success");
    } catch {
      setState("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors">
          <X className="w-5 h-5" />
        </button>

        {state === "success" ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
              You're on the list!
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              We'll reach out within one business day to schedule your demo.
            </p>
            <button onClick={onClose} className="inline-flex items-center gap-2 bg-[#E0622A] hover:bg-[#C9551E] text-white text-sm font-semibold px-6 py-3 rounded-full transition-colors">
              Done
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>
              Request a Demo
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              We'll walk through your DriveCentric setup and get you live — in one call.
            </p>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Your name *</label>
                  <input
                    required value={form.name} onChange={set("name")} placeholder="Jane Smith"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E0622A]/30 focus:border-[#E0622A] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email *</label>
                  <input
                    required type="email" value={form.email} onChange={set("email")} placeholder="jane@dealership.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E0622A]/30 focus:border-[#E0622A] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone *</label>
                  <input
                    required type="tel" value={form.phone} onChange={set("phone")} placeholder="(615) 555-0100"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E0622A]/30 focus:border-[#E0622A] transition-all"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Dealership name *</label>
                  <input
                    required value={form.dealership} onChange={set("dealership")} placeholder="Riverside Motors"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E0622A]/30 focus:border-[#E0622A] transition-all"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Number of rooftops</label>
                  <select
                    value={form.locations} onChange={set("locations")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E0622A]/30 focus:border-[#E0622A] transition-all appearance-none"
                  >
                    <option value="">How many rooftops?</option>
                    <option value="1">1</option>
                    <option value="2-3">2–3</option>
                    <option value="4-9">4–9</option>
                    <option value="10+">10+</option>
                  </select>
                </div>
              </div>
              {state === "error" && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  Something went wrong — email us at{" "}
                  <a href="mailto:hello@joinrippl.com" className="underline">hello@joinrippl.com</a>
                </p>
              )}
              <button
                type="submit" disabled={state === "submitting"}
                className="w-full bg-[#E0622A] hover:bg-[#C9551E] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all shadow-md shadow-[#E0622A]/20 flex items-center justify-center gap-2 mt-1"
              >
                {state === "submitting"
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                  : "Request Demo →"}
              </button>
              <p className="text-center text-xs text-slate-400">
                Or{" "}
                <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="text-[#E0622A] hover:underline font-medium">
                  book a 30-minute call
                </a>{" "}
                instead
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen(v => !v)} className="w-full text-left border-b border-slate-100 pb-6">
      <div className="flex items-start justify-between gap-3">
        <span className="font-bold text-slate-900 text-sm">{q}</span>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 shrink-0 mt-0.5 transition-transform duration-200", open && "rotate-180")} />
      </div>
      {open && <p className="text-slate-500 text-sm mt-2 leading-relaxed">{a}</p>}
    </button>
  );
}

export default function Automotive() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: "var(--font-sans)" }}>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-[#C9551E] flex items-center justify-center">
              <Droplets className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm">rip<span style={{ color: "#E0622A" }}>pl</span></span>
          </a>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 bg-[#E0622A] hover:bg-[#C9551E] text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors"
            >
              Request a Demo <ChevronRight className="w-3 h-3" />
            </button>
            <a href="/login" className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors">
              Staff Login →
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-[#E0622A]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#E0622A]/5 rounded-full blur-2xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 py-20 sm:py-28 text-center">
          <span className="inline-block bg-white/10 border border-white/20 text-white/80 text-xs font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full mb-5">
            For Automotive Dealerships · DriveCentric
          </span>
          <h1
            className="text-white text-5xl sm:text-6xl leading-[1.05] mb-5"
            style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700 }}
          >
            Your buyers are your best{" "}
            <span style={{ color: "#F5A623", fontStyle: "italic", fontWeight: 300 }}>salespeople.</span>
          </h1>
          <p className="text-white/80 text-lg leading-relaxed max-w-xl mx-auto mb-4">
            A fully automated customer referral rewards program — built on DriveCentric. Your buyers share their link, a friend buys a car, and the reward fires automatically. No BDC work. No manual tracking.
          </p>
          <p className="text-white/50 text-sm mb-8">
            Founding Member pricing: setup fee waived for dealerships that go live before January 1, 2027.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 bg-white text-slate-900 font-bold text-sm px-7 py-3.5 rounded-full transition-all hover:bg-slate-100 shadow-lg shadow-black/20"
          >
            Request a Demo <ChevronRight className="w-4 h-4" />
          </button>
          <p className="text-white/40 text-xs mt-4">
            Live at auto groups across the Southeast
          </p>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <section className="py-12 bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold text-[#E0622A] mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>
                  {s.value}
                </p>
                <p className="text-slate-800 font-semibold text-xs mb-0.5">{s.label}</p>
                <p className="text-slate-400 text-xs">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-3">
            <p className="text-xs font-bold text-[#E0622A] uppercase tracking-widest">Automotive</p>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
              Live · DriveCentric
            </span>
          </div>
          <h2
            className="text-3xl text-slate-900 mb-3"
            style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700 }}
          >
            A rewards program. Not just a referral tool.
          </h2>
          <p className="text-slate-500 text-sm mb-10 max-w-xl">
            Most dealerships have never had a formal customer referral program — because the manual effort to run one wasn't worth it. Rippl changes that. The Program plan gives you a fully branded rewards program with zero operational overhead.
          </p>

          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl">
            {/* Starter */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8 flex flex-col gap-5 shadow-sm">
              <p className="font-bold text-slate-900 text-lg">Starter</p>
              <div>
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span className="text-4xl font-bold text-slate-900" style={{ fontFamily: "var(--font-fraunces)" }}>$150</span>
                  <span className="text-slate-500 text-sm font-medium">/ verified sale</span>
                </div>
                <p className="text-sm text-slate-500">No monthly fee</p>
                <p className="text-xs text-slate-400 mt-1">+ $150 default reward to your customer</p>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed flex-1">
                Try it with zero commitment. Pay only when a referred customer closes a deal — no monthly cost, no contracts.
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="w-full py-2.5 text-sm font-semibold rounded-xl transition-colors bg-slate-900 hover:bg-slate-700 text-white"
              >
                Get Started →
              </button>
            </div>

            {/* Program */}
            <div className="rounded-2xl border-2 border-[#E0622A] bg-orange-50/40 p-8 flex flex-col gap-5 shadow-lg shadow-orange-100 relative">
              <div className="absolute -top-3 left-6">
                <span className="bg-[#E0622A] text-white text-xs font-bold px-3 py-1 rounded-full">Recommended</span>
              </div>
              <p className="font-bold text-slate-900 text-lg">Program</p>
              <div>
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span className="text-4xl font-bold text-slate-900" style={{ fontFamily: "var(--font-fraunces)" }}>$249</span>
                  <span className="text-slate-500 text-sm font-medium">/ mo</span>
                </div>
                <p className="text-sm text-slate-500">+ <strong className="text-slate-700">$95</strong> per verified referral sale</p>
                <p className="text-xs text-slate-400 mt-1">+ $150–$250 reward to your customer (customizable)</p>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed flex-1">
                A fully branded customer rewards program — custom portal, tiered rewards, multi-rooftop dashboard, and dedicated support. Breaks even versus Starter at just 5 referral sales/month.
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="w-full py-2.5 text-sm font-semibold rounded-xl transition-colors bg-[#E0622A] hover:bg-[#C9551E] text-white"
              >
                Get Started →
              </button>
            </div>
          </div>

          {/* What Program includes */}
          <div className="mt-6 bg-slate-50 border border-slate-100 rounded-2xl p-5 max-w-2xl">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Program plan includes</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                "Branded customer rewards portal",
                "Tiered rewards ($150–$250 per referral tier)",
                "Custom reward catalog — gift cards, service credits",
                "Multi-rooftop dashboard and reporting",
                "Dedicated onboarding and ongoing support",
                "Co-branded customer communications",
              ].map(item => (
                <div key={item} className="flex items-start gap-2 text-slate-500 text-xs">
                  <span className="text-[#E0622A] mt-0.5">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-1.5">
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">$499 one-time setup fee</span> — covers DriveCentric integration, team training, and go-live support.{" "}
              <span className="text-slate-400">Waived for Founding Members — dealerships that go live before January 1, 2027.</span>
            </p>
            <p className="text-xs text-slate-400">
              Questions?{" "}
              <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="text-[#E0622A] hover:underline font-medium">
                Book a 30-minute call
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* ── ROI comparison ────────────────────────────────────────────── */}
      <section className="py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <h2
            className="text-3xl text-slate-900 mb-3"
            style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700 }}
          >
            Stop paying for leads. Pay for buyers.
          </h2>
          <p className="text-slate-500 text-sm mb-10 max-w-xl">
            Third-party lead providers and digital advertising charge you whether or not a customer ever buys. Rippl charges only on verified, closed deals.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100">
                  <th className="text-left text-slate-500 font-semibold px-5 py-3.5">Channel</th>
                  <th className="text-left text-slate-500 font-semibold px-5 py-3.5">Cost per sold unit</th>
                  <th className="text-left text-slate-500 font-semibold px-5 py-3.5 hidden sm:table-cell">Lead quality</th>
                  <th className="text-left text-slate-500 font-semibold px-5 py-3.5 hidden md:table-cell">BDC effort</th>
                </tr>
              </thead>
              <tbody>
                {CHANNELS.map(ch => (
                  <tr
                    key={ch.name}
                    className={cn(
                      "border-b border-slate-200/60 last:border-0",
                      ch.highlight ? "bg-orange-50/80" : "bg-white hover:bg-slate-50"
                    )}
                  >
                    <td className="px-5 py-4">
                      <span className={cn("font-bold", ch.highlight ? "text-orange-700" : "text-slate-700")}>
                        {ch.name}
                      </span>
                      {ch.highlight && (
                        <span className="ml-2 bg-orange-100 border border-orange-200 text-orange-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                          You are here
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn("font-black text-base", ch.highlight ? "text-[#E0622A]" : "text-slate-500")}>
                        {ch.costPerSale}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className={ch.highlight ? "text-orange-700 font-semibold" : "text-slate-500"}>
                        {ch.quality}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className={ch.highlight ? "text-orange-700 font-semibold" : "text-slate-500"}>
                        {ch.effort}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sample calculation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">📊</span>
                <p className="text-slate-900 font-bold text-base">Typical third-party lead spend</p>
              </div>
              <p className="text-slate-500 text-xs mb-4">TrueCar + Cars.com + AutoTrader, single rooftop</p>
              <div className="space-y-2.5 mb-5">
                {[
                  { label: "TrueCar (per-sale model)",    cost: "$250–$500 / unit" },
                  { label: "Cars.com subscription",       cost: "$2K–$4K / mo" },
                  { label: "AutoTrader listing package",  cost: "$1.5K–$3K / mo" },
                  { label: "BDC follow-up labor",         cost: "$3K–$6K / mo" },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-700">{row.label}</span>
                    <span className="font-semibold text-slate-900 tabular-nums">{row.cost}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200">
                <span className="text-slate-900 font-bold">Cost per sold unit</span>
                <span className="font-black text-slate-900 text-lg tabular-nums">$400–$700+</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-white border-2 border-orange-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">💧</span>
                <p className="text-slate-900 font-bold text-base">Same customers via Rippl</p>
              </div>
              <p className="text-orange-700 text-xs mb-4 font-semibold">Pay only when the deal closes</p>
              <div className="space-y-2.5 mb-5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-700">Platform fee (100 × $95 Program)</span>
                  <span className="font-semibold text-slate-900 tabular-nums">$9,500</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-700">Rewards (avg $150, face value)</span>
                  <span className="font-semibold text-slate-900 tabular-nums">$15,000</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-700">BDC / agency / subscriptions</span>
                  <span className="font-semibold text-slate-900 tabular-nums">$0</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-orange-200">
                <span className="text-slate-900 font-bold">Total for 100 referral sales</span>
                <span className="font-black text-orange-700 text-lg tabular-nums">$24,500</span>
              </div>
              <div className="flex items-center justify-between gap-3 mt-2">
                <span className="text-slate-500 text-sm">Cost per sold unit</span>
                <span className="font-bold text-orange-700 text-sm tabular-nums">$245</span>
              </div>
            </div>
          </div>
          <div className="bg-[#E0622A] text-white rounded-xl px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
            <p className="font-bold text-sm">Savings vs. third-party leads</p>
            <span className="font-black text-lg tabular-nums">$55–$355 per unit</span>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs font-bold text-[#E0622A] uppercase tracking-widest mb-3">How it works</p>
          <h2
            className="text-3xl text-slate-900 mb-3"
            style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700 }}
          >
            Four steps. Three are automatic.
          </h2>
          <p className="text-slate-500 text-sm mb-10 max-w-xl">
            After a one-afternoon setup, your BDC never touches referrals again.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="flex items-start gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-2xl shrink-0">
                  {step.emoji}
                </div>
                <div>
                  <p className="text-slate-800 font-bold text-base mb-1">
                    <span className="text-[#E0622A] mr-1.5">{i + 1}.</span>
                    {step.title}
                  </p>
                  <p className="text-slate-500 text-sm leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What's included ───────────────────────────────────────────── */}
      <section className="py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs font-bold text-[#E0622A] uppercase tracking-widest mb-3">Everything included</p>
          <h2
            className="text-3xl text-slate-900 mb-12"
            style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700 }}
          >
            No add-ons. No surprises.
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-x-10 gap-y-6">
            {INCLUDED.map(({ Icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-[#E0622A]" />
                </div>
                <p className="text-slate-700 text-sm leading-relaxed pt-2">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-xs font-bold text-[#E0622A] uppercase tracking-widest mb-3">FAQ</p>
          <h2
            className="text-3xl text-slate-900 mb-12"
            style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700 }}
          >
            Common questions.
          </h2>
          <div className="space-y-6">
            {FAQS.map(({ q, a }) => (
              <FaqItem key={q} q={q} a={a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section
        className="py-20 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#E0622A]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-[#E0622A]/5 rounded-full blur-2xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <h2
            className="text-white text-4xl mb-4"
            style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700 }}
          >
            Ready to turn buyers into your best salespeople?
          </h2>
          <p className="text-white/60 text-base mb-8 max-w-lg mx-auto">
            Book a 30-minute demo. We'll connect to your DriveCentric account and show you a live referral flow.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 bg-white text-slate-900 font-bold text-sm px-8 py-4 rounded-full transition-all hover:bg-slate-100 shadow-lg shadow-black/20"
            >
              Request a Demo <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm px-7 py-4 rounded-full transition-all border border-white/20"
            >
              Book an Intro Call
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 bg-slate-900">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} Rippl · hello@joinrippl.com</span>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-slate-300 transition-colors">SMS Terms</a>
          </div>
        </div>
      </footer>

      {/* ── Modal ────────────────────────────────────────────────────── */}
      {modalOpen && <DemoModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
