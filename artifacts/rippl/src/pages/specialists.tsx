import React, { useState } from "react";
import { Droplets, ChevronRight, CheckCircle2, Zap, Search, Gift, MessageSquare, Shield, Users, TrendingUp, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const CALENDLY_URL = "https://calendly.com/david-joinrippl/30min";
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const SPECIALTIES = [
  { label: "Oral Surgery",    icon: "🦷" },
  { label: "Orthodontics",    icon: "😁" },
  { label: "Periodontics",    icon: "🔬" },
  { label: "Endodontics",     icon: "⚕️" },
  { label: "Pediatric",       icon: "👶" },
  { label: "Prosthodontics",  icon: "✨" },
];

const PLANS = [
  {
    name: "Per Referral",
    monthly: null,
    perReferral: 95,
    reward: 50,
    highlight: false,
    description: "No monthly commitment. Pay only when a verified new patient completes their first appointment.",
  },
  {
    name: "Growth",
    monthly: 199,
    perReferral: 55,
    reward: 50,
    highlight: true,
    description: "Best for practices generating 4+ referrals per month. Lower per-referral cost as your word-of-mouth scales.",
  },
];

const HOW_IT_WORKS = [
  {
    Icon: Users,
    step: "01",
    title: "Patient gets their referral link",
    body: "After their procedure, your patient receives a personalized referral link via SMS — automatically, no staff involvement.",
  },
  {
    Icon: Search,
    step: "02",
    title: "Rippl detects the new patient visit",
    body: "When the referred patient completes their first appointment, Rippl sees it instantly through Open Dental. Zero manual tracking.",
  },
  {
    Icon: Gift,
    step: "03",
    title: "Reward sent automatically",
    body: "Your patient gets a $50 digital reward by SMS and email — gift card, charity donation, or in-house credit. No one on your team lifts a finger.",
  },
];

interface FormState {
  name: string;
  practice: string;
  email: string;
  phone: string;
  specialty: string;
}

export default function Specialists() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ name: "", practice: "", email: "", phone: "", specialty: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openModal = () => {
    setSubmitted(false);
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:     form.name,
          practice: form.practice,
          email:    form.email,
          phone:    form.phone,
          source:   "specialist-page",
          emr:      form.specialty || "Specialist",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Something went wrong. Please try again."); return; }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: "var(--font-sans)" }}>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-[#C9551E] flex items-center justify-center">
              <Droplets className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm">
              rip<span style={{ color: "#E0622A" }}>pl</span>
            </span>
          </a>
          <div className="flex items-center gap-4">
            <button
              onClick={openModal}
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
        style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-[#E0622A]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#E0622A]/5 rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 py-20 sm:py-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1.5 mb-6">
              <Shield className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-white/80 text-xs font-semibold">Built for dental specialists</span>
            </div>
            <h1
              className="text-white text-5xl sm:text-6xl leading-[1.05] mb-6"
              style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700 }}
            >
              New patients who{" "}
              <span style={{ color: "#F5A623", fontStyle: "italic", fontWeight: 300 }}>chose you.</span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed mb-4 max-w-xl">
              Specialists live by GP referrals — and can't afford to threaten them. Rippl builds a completely separate channel: patients who heard about you from other patients and came looking specifically for you.
            </p>
            <p className="text-white/50 text-sm leading-relaxed mb-10 max-w-xl">
              No conflict with your referring doctors. No ads. No poaching. Just word-of-mouth, automated.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={openModal}
                className="inline-flex items-center justify-center gap-2 bg-[#E0622A] hover:bg-[#C9551E] text-white font-bold text-sm px-6 py-3.5 rounded-full transition-all shadow-lg shadow-[#E0622A]/20"
              >
                Get Started <ChevronRight className="w-4 h-4" />
              </button>
              <a
                href={CALENDLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm px-6 py-3.5 rounded-full transition-all border border-white/20"
              >
                Book an Intro Call
              </a>
            </div>
          </div>
        </div>

        {/* Specialty pills */}
        <div className="relative border-t border-white/10">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-2 flex-wrap">
            <span className="text-white/40 text-xs font-medium mr-1">Specialties:</span>
            {SPECIALTIES.map(({ label, icon }) => (
              <span key={label} className="flex items-center gap-1.5 bg-white/10 border border-white/10 rounded-full px-3 py-1 text-xs font-medium text-white/70">
                <span>{icon}</span>{label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── The problem ───────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid sm:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs font-bold text-[#E0622A] uppercase tracking-widest mb-3">The specialist dilemma</p>
              <h2
                className="text-3xl text-slate-900 mb-5"
                style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700 }}
              >
                You can't market to patients the way GPs can.
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">
                General dentists run ads, do mailers, post on social. As a specialist, that playbook creates friction with the referring doctors who send you half your practice — and that's a trade-off most specialists won't make.
              </p>
              <p className="text-slate-500 text-sm leading-relaxed">
                So most specialists don't build any direct patient acquisition channel at all. They rely entirely on GP referrals — which means their growth is capped by someone else's referral behavior.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { label: "GP referral patients", concern: "Can't compete for — damages referring relationships", bad: true },
                { label: "Paid ads / social", concern: "Signals you're going around referring doctors", bad: true },
                { label: "Patient word-of-mouth", concern: "Patient-initiated, no conflict with GPs", bad: false },
              ].map(({ label, concern, bad }) => (
                <div key={label} className={cn(
                  "flex items-start gap-4 p-4 rounded-xl border",
                  bad ? "bg-slate-50 border-slate-200" : "bg-orange-50 border-orange-200"
                )}>
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-sm font-bold",
                    bad ? "bg-slate-200 text-slate-500" : "bg-[#E0622A] text-white"
                  )}>
                    {bad ? "✕" : "✓"}
                  </div>
                  <div>
                    <p className={cn("font-semibold text-sm", bad ? "text-slate-500" : "text-slate-900")}>{label}</p>
                    <p className={cn("text-xs mt-0.5", bad ? "text-slate-400" : "text-orange-700")}>{concern}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section className="py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs font-bold text-[#E0622A] uppercase tracking-widest mb-3">How Rippl works</p>
          <h2
            className="text-3xl text-slate-900 mb-4"
            style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700 }}
          >
            Three steps. Zero staff effort.
          </h2>
          <p className="text-slate-500 text-sm mb-14 max-w-lg">
            Rippl connects to your Open Dental account. Everything else is automatic.
          </p>
          <div className="grid sm:grid-cols-3 gap-10">
            {HOW_IT_WORKS.map(({ Icon, step, title, body }) => (
              <div key={step}>
                <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mb-5">
                  <Icon className="w-5 h-5 text-[#E0622A]" />
                </div>
                <p className="text-xs font-bold text-slate-300 mb-2" style={{ fontFamily: "var(--font-mono)" }}>{step}</p>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why it works for specialists ──────────────────────────────── */}
      <section className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs font-bold text-[#E0622A] uppercase tracking-widest mb-3">Why it works</p>
          <h2
            className="text-3xl text-slate-900 mb-12"
            style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700 }}
          >
            Patient-initiated. GP-safe. High-value.
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                Icon: Shield,
                title: "No conflict with referring GPs",
                body: "The referral comes from your patient, not your practice. Your referring doctors see word-of-mouth — not competition.",
              },
              {
                Icon: TrendingUp,
                title: "High-value cases, low referral cost",
                body: "An implant case runs $3,000–$6,000. An ortho case, $5,000–$8,000. A $50 reward and $95 Rippl fee is a fraction of the margin.",
              },
              {
                Icon: Zap,
                title: "Fully automated — no staff work",
                body: "Rippl detects new patient visits through Open Dental and fires rewards automatically. Your team doesn't change anything.",
              },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center mb-4 shadow-sm">
                  <Icon className="w-5 h-5 text-[#E0622A]" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────── */}
      <section className="py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs font-bold text-[#E0622A] uppercase tracking-widest mb-3">Pricing</p>
          <h2
            className="text-3xl text-slate-900 mb-3"
            style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700 }}
          >
            Pay only when it works.
          </h2>
          <p className="text-slate-500 text-sm mb-10 max-w-xl">
            No setup fee. Card billed automatically per verified referral. Monthly statement sent for reconciliation.
          </p>

          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl">
            {PLANS.map(({ name, monthly, perReferral, reward, highlight, description }) => (
              <div
                key={name}
                className={cn(
                  "rounded-2xl border p-8 flex flex-col gap-5 relative bg-white",
                  highlight ? "border-[#E0622A] shadow-lg shadow-orange-100" : "border-slate-200 shadow-sm"
                )}
              >
                {highlight && (
                  <div className="absolute -top-3 left-6">
                    <span className="bg-[#E0622A] text-white text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>
                  </div>
                )}
                <p className="font-bold text-slate-900 text-lg">{name}</p>
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
                  onClick={openModal}
                  className={cn(
                    "w-full py-2.5 text-sm font-semibold rounded-xl transition-colors",
                    highlight ? "bg-[#E0622A] hover:bg-[#C9551E] text-white" : "bg-slate-900 hover:bg-slate-700 text-white"
                  )}
                >
                  Get Started →
                </button>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400 mt-6">
            All plans include a 30-day trial. Questions?{" "}
            <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="text-[#E0622A] hover:underline font-medium">
              Book a 30-minute call
            </a>
          </p>
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
            Start building your direct patient channel.
          </h2>
          <p className="text-white/60 text-base mb-8 max-w-lg mx-auto">
            Add a word-of-mouth channel that grows your practice without touching your GP relationships.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={openModal}
              className="inline-flex items-center gap-2 bg-[#E0622A] hover:bg-[#C9551E] text-white font-bold text-sm px-8 py-4 rounded-full transition-all shadow-lg shadow-[#E0622A]/20"
            >
              Get Started <ChevronRight className="w-4 h-4" />
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

      {/* ── Signup Modal ─────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {submitted ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
                  You're on the list!
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">
                  We'll be in touch within one business day. Want to move faster?
                </p>
                <a
                  href={CALENDLY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#E0622A] hover:bg-[#C9551E] text-white text-sm font-semibold px-6 py-3 rounded-full transition-colors"
                >
                  Book an Intro Call <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>
                  Get started with Rippl
                </h3>
                <p className="text-slate-500 text-sm mb-6">We'll reach out within one business day.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Your Name</label>
                      <input
                        required
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Dr. Jane Smith"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E0622A]/30 focus:border-[#E0622A] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Practice Name</label>
                      <input
                        required
                        value={form.practice}
                        onChange={e => setForm(f => ({ ...f, practice: e.target.value }))}
                        placeholder="Smith Oral Surgery"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E0622A]/30 focus:border-[#E0622A] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Work Email</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="dr.smith@smithoralsurgery.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E0622A]/30 focus:border-[#E0622A] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone (optional)</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="(615) 555-0100"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E0622A]/30 focus:border-[#E0622A] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Specialty</label>
                    <select
                      value={form.specialty}
                      onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E0622A]/30 focus:border-[#E0622A] transition-all appearance-none"
                    >
                      <option value="">Select your specialty…</option>
                      <option value="Oral Surgery">Oral Surgery</option>
                      <option value="Orthodontics">Orthodontics</option>
                      <option value="Periodontics">Periodontics</option>
                      <option value="Endodontics">Endodontics</option>
                      <option value="Pediatric Dentistry">Pediatric Dentistry</option>
                      <option value="Prosthodontics">Prosthodontics</option>
                      <option value="Other Specialty">Other</option>
                    </select>
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#E0622A] hover:bg-[#C9551E] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all shadow-md shadow-[#E0622A]/20 flex items-center justify-center gap-2 mt-1"
                  >
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : "Get Started →"}
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
      )}
    </div>
  );
}
