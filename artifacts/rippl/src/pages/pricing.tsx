import React, { useState } from "react";
import {
  Droplets, ChevronRight, CheckCircle2, Zap, Search, Gift,
  MessageSquare, Mail, BarChart3, Loader2, X, ArrowRight,
  ChevronDown, TrendingUp, Users, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CALENDLY_URL = "https://calendly.com/david-joinrippl/30min";
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const STATS = [
  { value: "$45",  label: "Per verified new patient", sub: "Only when they walk in the door" },
  { value: "4×",   label: "Higher conversion rate",   sub: "vs. cold advertising channels" },
  { value: "37%",  label: "Better patient retention", sub: "Referred patients stay longer" },
  { value: "0",    label: "Staff hours required",     sub: "Fully automated end-to-end" },
];

const DENTAL_PLANS = [
  {
    name: "Per Referral",
    monthly: null,
    perReferral: 45,
    reward: 35,
    highlight: false,
    description: "No monthly commitment. Pay only when a verified referral completes their first appointment.",
  },
  {
    name: "Growth",
    monthly: 149,
    perReferral: 25,
    reward: 35,
    highlight: true,
    description: "Best for practices generating 5+ referrals per month. Lower per-referral cost at scale.",
  },
];

const CHANNELS = [
  { name: "Google Ads",    costPerPatient: "$150–$400", leadQuality: "Stranger, low intent",      effort: "Daily mgmt + agency",           highlight: false },
  { name: "Meta (FB/IG)", costPerPatient: "$200–$500", leadQuality: "Impulse / image-led",        effort: "Creative refresh constant",      highlight: false },
  { name: "EDDM Mailers", costPerPatient: "$180–$450", leadQuality: "Cold, ad-fatigued",          effort: "Design, print, mail each drop",  highlight: false },
  { name: "Rippl",         costPerPatient: "$80–$145",  leadQuality: "Peer-verified trust",        effort: "Fully automated",               highlight: true  },
];

const HOW_IT_WORKS = [
  { emoji: "📋", title: "Connect your EMR",             body: "Rippl integrates directly with Open Dental via your eConnector. Setup takes one afternoon — no IT team required." },
  { emoji: "📲", title: "Patients refer automatically", body: "Each enrolled patient gets a personal referral link. They share it with friends. That's the entire ask." },
  { emoji: "🦷", title: "New patient completes a visit", body: "When the referred patient completes their first exam, Rippl confirms it automatically through your Open Dental connection — no staff input needed." },
  { emoji: "🎁", title: "Reward fires — zero staff work",body: "The referring patient gets an SMS + email and chooses their reward. Your front desk never touches it." },
];

const INCLUDED = [
  { Icon: Search,        text: "Automatic referral detection via Open Dental" },
  { Icon: MessageSquare, text: "SMS reward notifications" },
  { Icon: Mail,          text: "Branded email notifications with reward selection" },
  { Icon: Gift,          text: "Gift cards, charity donations, or in-house credit" },
  { Icon: Zap,           text: "Zero staff work — fully automated end to end" },
  { Icon: BarChart3,     text: "Dashboard with referral pipeline and reward history" },
  { Icon: Users,         text: "Tiered rewards — $35–$100 as patients refer more" },
  { Icon: TrendingUp,    text: "Multi-office support under one account" },
  { Icon: Shield,        text: "Dedup protection — no gaming, no double-paying" },
];

const VERTICALS = [
  {
    label: "Automotive",
    integration: "DriveCentric",
    description: "Rippl detects when a referred customer closes a vehicle purchase and automatically sends their reward — no BDC step required.",
    live: true,
    href: "/automotive",
    ctaLabel: "See Automotive pricing →",
  },
  {
    label: "Salon",
    integration: "Vagaro",
    description: "Rewards fire automatically when a referred client completes their first service appointment via your Vagaro account.",
    live: false,
    href: null,
    ctaLabel: "Notify me when available →",
  },
];

const FAQS = [
  {
    q: "When exactly am I charged?",
    a: "Only when a verified referral completes their first appointment — confirmed automatically through your Open Dental connection. No conversion, no charge.",
  },
  {
    q: "What does the patient receive?",
    a: "An SMS + email with a claim link. They choose from: Amazon/Visa/Target gift card, $100 dental account credit toward treatment, charity donation, or a local business reward.",
  },
  {
    q: "Is there a setup fee?",
    a: "There's a one-time $499 setup fee covering Open Dental integration, staff training, tier configuration, and go-live support — no recurring subscription, no minimum commitment. Ask on your demo call about how to get the setup fee waived.",
  },
  {
    q: "Does it work with my version of Open Dental?",
    a: "Rippl uses the Open Dental REST API via your eConnector service. Any practice running eConnector on a server can connect. We'll verify compatibility on your demo call.",
  },
  {
    q: "What if we have multiple locations?",
    a: "Rippl supports multiple offices under one account. Each office gets its own Open Dental customer key and referral tracking.",
  },
  {
    q: "Do I need to change my software or workflow?",
    a: "No. Rippl connects to your existing Open Dental account. Your staff doesn't do anything differently — referrals are detected and rewarded automatically.",
  },
  {
    q: "How long does setup take?",
    a: "Most practices go live in one session. You'll need your Open Dental developer key, customer key, and eConnector running. We handle the rest.",
  },
];

const EMR_OPTIONS = ["Open Dental", "Dentrix", "Eaglesoft", "Curve Dental", "Carestream Dental", "Dental Vision", "Other"];
const LOCATION_OPTIONS = ["1", "2–3", "4–9", "10+"];

type FormState = "idle" | "submitting" | "success" | "error";

function DemoModal({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<FormState>("idle");
  const [form, setForm] = useState({ name: "", email: "", phone: "", practice: "", emr: "", locations: "" });

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
          name: form.name, practice: form.practice,
          email: form.email, phone: form.phone,
          source: "pricing-page", emr: form.emr,
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
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 bg-[#E0622A] hover:bg-[#C9551E] text-white text-sm font-semibold px-6 py-3 rounded-full transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>
              Request a Demo
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              We'll walk through your Open Dental setup and get you live — in one call.
            </p>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full name *</label>
                  <input
                    required value={form.name} onChange={set("name")} placeholder="Dr. Jane Smith"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E0622A]/30 focus:border-[#E0622A] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email *</label>
                  <input
                    required type="email" value={form.email} onChange={set("email")} placeholder="jane@mypractice.com"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Practice name *</label>
                  <input
                    required value={form.practice} onChange={set("practice")} placeholder="Smith Family Dentistry"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E0622A]/30 focus:border-[#E0622A] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">EMR system</label>
                  <select
                    value={form.emr} onChange={set("emr")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E0622A]/30 focus:border-[#E0622A] transition-all appearance-none"
                  >
                    <option value="">Select EMR…</option>
                    {EMR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Locations</label>
                  <select
                    value={form.locations} onChange={set("locations")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E0622A]/30 focus:border-[#E0622A] transition-all appearance-none"
                  >
                    <option value="">How many?</option>
                    {LOCATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
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

export default function Pricing() {
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
            <a href="/" className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">Home</a>
            <button
              onClick={() => setModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 bg-[#E0622A] hover:bg-[#C9551E] text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors"
            >
              Get Started <ChevronRight className="w-3 h-3" />
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
        style={{ background: "linear-gradient(135deg, #F5A623 0%, #E0622A 100%)" }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-black/10 rounded-full blur-2xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 py-20 sm:py-28 text-center">
          <span className="inline-block bg-white/20 text-white text-xs font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full mb-5">
            For Dental Practices · Open Dental
          </span>
          <h1
            className="text-white text-5xl sm:text-6xl leading-[1.05] mb-5"
            style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700 }}
          >
            Pay only when{" "}
            <span style={{ fontStyle: "italic", fontWeight: 300 }}>it works.</span>
          </h1>
          <p className="text-white/80 text-lg leading-relaxed max-w-xl mx-auto mb-4">
            One-time $499 setup, then $45 per verified new patient — only when they walk in the door and complete their first visit.
          </p>
          <p className="text-white/60 text-sm mb-8">
            Ask about how to get the setup fee waived on your demo call.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 bg-white text-[#E0622A] font-bold text-sm px-7 py-3.5 rounded-full transition-all hover:bg-orange-50 shadow-lg shadow-black/10"
          >
            Request a Demo <ChevronRight className="w-4 h-4" />
          </button>
          <p className="text-white/50 text-xs mt-4">
            Live at dental practices across the US
          </p>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <section className="py-12 bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <p
                  className="text-3xl font-bold text-[#E0622A] mb-1"
                  style={{ fontFamily: "var(--font-fraunces)" }}
                >
                  {s.value}
                </p>
                <p className="text-slate-800 font-semibold text-xs mb-0.5">{s.label}</p>
                <p className="text-slate-400 text-xs">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dental pricing ────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-3">
            <p className="text-xs font-bold text-[#E0622A] uppercase tracking-widest">Dental</p>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
              Live · Open Dental
            </span>
          </div>
          <h2
            className="text-3xl text-slate-900 mb-3"
            style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700 }}
          >
            Two plans. Zero surprises.
          </h2>
          <p className="text-slate-500 text-sm mb-10 max-w-xl">
            Both plans include a default $35 digital reward paid to your patient when their referral completes a first visit — customizable up or down from your practice dashboard. You're only ever charged when a referral converts.
          </p>

          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl">
            {DENTAL_PLANS.map(({ name, monthly, perReferral, reward, highlight, description }) => (
              <div
                key={name}
                className={cn(
                  "rounded-2xl border p-8 flex flex-col gap-5 relative",
                  highlight
                    ? "border-[#E0622A] bg-orange-50/40 shadow-lg shadow-orange-100"
                    : "border-slate-200 bg-white shadow-sm"
                )}
              >
                {highlight && (
                  <div className="absolute -top-3 left-6">
                    <span className="bg-[#E0622A] text-white text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>
                  </div>
                )}
                <div><p className="font-bold text-slate-900 text-lg">{name}</p></div>
                <div>
                  {monthly ? (
                    <>
                      <div className="flex items-baseline gap-1.5 mb-0.5">
                        <span className="text-4xl font-bold text-slate-900" style={{ fontFamily: "var(--font-fraunces)" }}>${monthly}</span>
                        <span className="text-slate-500 text-sm font-medium">/ mo</span>
                      </div>
                      <p className="text-sm text-slate-500">+ <strong className="text-slate-700">${perReferral}</strong> per verified referral</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1.5 mb-0.5">
                        <span className="text-4xl font-bold text-slate-900" style={{ fontFamily: "var(--font-fraunces)" }}>${perReferral}</span>
                        <span className="text-slate-500 text-sm font-medium">/ referral</span>
                      </div>
                      <p className="text-sm text-slate-500">No monthly fee</p>
                    </>
                  )}
                  <p className="text-xs text-slate-400 mt-1">+ ${reward} reward to your patient</p>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed flex-1">{description}</p>
                <button
                  onClick={() => setModalOpen(true)}
                  className={cn(
                    "w-full py-2.5 text-sm font-semibold rounded-xl transition-colors",
                    highlight
                      ? "bg-[#E0622A] hover:bg-[#C9551E] text-white"
                      : "bg-slate-900 hover:bg-slate-700 text-white"
                  )}
                >
                  Get Started →
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-1.5">
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">$499 one-time setup fee</span> — covers integration, onboarding, and go-live support.{" "}
              <span className="text-slate-400">Ask on your demo call about how to get the setup fee waived.</span>
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

      {/* ── Specialist callout ────────────────────────────────────────── */}
      <section className="py-8 bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-slate-900 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div>
              <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-1.5">Dental Specialists</p>
              <p className="text-white font-bold text-base mb-1">
                Oral surgeon, orthodontist, periodontist, or endodontist?
              </p>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
                Same pricing — different value story. Specialists can't run direct patient ads without risking their referring GP relationships. Rippl builds a word-of-mouth channel that's entirely patient-initiated, so it never creates friction with the doctors sending you referrals.
              </p>
            </div>
            <a
              href="/specialists"
              className="shrink-0 inline-flex items-center gap-2 bg-[#E0622A] hover:bg-[#C9551E] text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors whitespace-nowrap"
            >
              See specialist page →
            </a>
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
            Stop paying for clicks. Pay for patients.
          </h2>
          <p className="text-slate-500 text-sm mb-10 max-w-xl">
            Traditional dental marketing charges you whether or not a patient ever books. Rippl charges only on verified, completed first visits.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 mb-10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100">
                  <th className="text-left text-slate-500 font-semibold px-5 py-3.5">Channel</th>
                  <th className="text-left text-slate-500 font-semibold px-5 py-3.5">Cost per new patient</th>
                  <th className="text-left text-slate-500 font-semibold px-5 py-3.5 hidden sm:table-cell">Lead quality</th>
                  <th className="text-left text-slate-500 font-semibold px-5 py-3.5 hidden md:table-cell">Staff effort</th>
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
                        {ch.costPerPatient}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className={ch.highlight ? "text-orange-700 font-semibold" : "text-slate-500"}>
                        {ch.leadQuality}
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

          {/* Annual comparison — digital plan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">📊</span>
                <p className="text-slate-900 font-bold text-base">Typical digital marketing plan</p>
              </div>
              <p className="text-slate-500 text-xs mb-4">Google Ads + SEO + Social, via agency</p>
              <div className="space-y-2.5 mb-5">
                {[
                  { label: "Google Ads spend",          cost: "$36K–$60K" },
                  { label: "Agency management",         cost: "$12K–$18K" },
                  { label: "SEO retainer + listings",   cost: "$12K–$24K" },
                  { label: "Meta (FB/IG) + creative",   cost: "$12K–$24K" },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-700">{row.label}</span>
                    <span className="font-semibold text-slate-900 tabular-nums">{row.cost}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200">
                <span className="text-slate-900 font-bold">Total / year</span>
                <span className="font-black text-slate-900 text-lg tabular-nums">$72K–$126K</span>
              </div>
              <div className="flex items-center justify-between gap-3 mt-2">
                <span className="text-slate-500 text-sm">~400–500 new patients / year</span>
                <span className="font-bold text-slate-500 text-sm tabular-nums">$150–$300 CAC</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-white border-2 border-orange-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">💧</span>
                <p className="text-slate-900 font-bold text-base">Same 450 patients via Rippl</p>
              </div>
              <p className="text-orange-700 text-xs mb-4 font-semibold">Pay only when they walk in</p>
              <div className="space-y-2.5 mb-5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-700">Platform fee (450 × $45)</span>
                  <span className="font-semibold text-slate-900 tabular-nums">$20,250</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-700">Rewards (avg $65, face value)</span>
                  <span className="font-semibold text-slate-900 tabular-nums">$29,250</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-700">Agency / creative / staff time</span>
                  <span className="font-semibold text-slate-900 tabular-nums">$0</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-orange-200">
                <span className="text-slate-900 font-bold">Total / year</span>
                <span className="font-black text-orange-700 text-lg tabular-nums">$49,500</span>
              </div>
              <div className="flex items-center justify-between gap-3 mt-2">
                <span className="text-slate-500 text-sm">Cost per new patient</span>
                <span className="font-bold text-orange-700 text-sm tabular-nums">$110</span>
              </div>
            </div>
          </div>
          <div className="bg-[#E0622A] text-white rounded-xl px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
            <p className="font-bold text-sm">Savings vs. digital plan</p>
            <span className="font-black text-lg tabular-nums">$22K–$77K / year</span>
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
            After a one-afternoon setup, your team never touches referrals again.
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

      {/* ── Sample invoice ────────────────────────────────────────────── */}
      <section className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs font-bold text-[#E0622A] uppercase tracking-widest mb-3">Sample statement</p>
          <h2
            className="text-3xl text-slate-900 mb-10"
            style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700 }}
          >
            What your invoice looks like.
          </h2>
          <div className="max-w-lg">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                <p className="text-slate-900 font-bold text-sm">Monthly statement</p>
                <p className="text-slate-400 text-xs">22 referrals, mixed tiers</p>
              </div>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Platform fee — 22 × $45</span>
                  <span className="font-semibold text-slate-900 tabular-nums">$990</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Rewards — face value, zero markup</span>
                  <span className="font-semibold text-slate-900 tabular-nums">$1,320</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Monthly platform fee</span>
                  <span className="tabular-nums">$0</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Card processing / markup</span>
                  <span className="tabular-nums">$0</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200">
                <span className="text-slate-900 font-black">Your total</span>
                <span className="font-black text-slate-900 text-lg tabular-nums">$2,310</span>
              </div>
              <p className="text-slate-400 text-xs mt-3 leading-relaxed">
                ~$105 per new patient, all-in. A typical Google Ads program would cost $6,000+ for the same 22 patients.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <p className="text-sm font-bold text-slate-900 mb-2">How billing works</p>
              <p className="text-slate-500 text-sm leading-relaxed mb-3">
                Rippl uses threshold-based billing — similar to how Google Ads charges. Your account accumulates a running balance as referrals complete. When that balance hits <strong className="text-slate-700">$500</strong>, your card on file is automatically charged. If you don't reach the threshold, you receive a single invoice at month end. Most practices see one charge per month.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                We'll walk through the full billing setup on your demo call — including how to view your live balance, update your payment method, and set spend notifications.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Other verticals ───────────────────────────────────────────── */}
      <section className="py-16 bg-slate-50 border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs font-bold text-[#E0622A] uppercase tracking-widest mb-3">More verticals</p>
          <h2
            className="text-2xl text-slate-900 mb-8"
            style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700 }}
          >
            Rippl works beyond dental.
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
            {VERTICALS.map(({ label, integration, description, live, href, ctaLabel }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">via {integration}</p>
                  </div>
                  {live ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">Live</span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">Coming Soon</span>
                  )}
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
                {live && href ? (
                  <a href={href} className="text-xs font-semibold text-[#E0622A] hover:underline text-left">
                    {ctaLabel}
                  </a>
                ) : (
                  <button onClick={() => setModalOpen(true)} className="text-xs font-semibold text-[#E0622A] hover:underline text-left">
                    {ctaLabel}
                  </button>
                )}
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

      {/* ── CTA strip ────────────────────────────────────────────────── */}
      <section
        className="py-20 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #F5A623 0%, #E0622A 100%)" }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-black/10 rounded-full blur-2xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <h2
            className="text-white text-4xl mb-4"
            style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700 }}
          >
            Ready to get started?
          </h2>
          <p className="text-white/70 text-base mb-8 max-w-lg mx-auto">
            Sign up below or book a 30-minute intro call. We'll get you live within a few days.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 bg-white text-[#E0622A] font-bold text-sm px-8 py-4 rounded-full transition-all hover:bg-orange-50 shadow-lg shadow-black/10"
            >
              Request a Demo <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white font-semibold text-sm px-7 py-4 rounded-full transition-all"
            >
              Book an Intro Call
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} Rippl · hello@joinrippl.com</span>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="hover:text-slate-600 transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-slate-600 transition-colors">SMS Terms</a>
            <a href="/sms-opt-in" className="hover:text-slate-600 transition-colors">SMS Opt-in</a>
          </div>
        </div>
      </footer>

      {/* ── Modal ────────────────────────────────────────────────────── */}
      {modalOpen && <DemoModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
