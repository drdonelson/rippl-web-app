import React, { useState } from "react";
import { Droplets, ChevronRight, CheckCircle2, Zap, Search, Gift, MessageSquare, Mail, BarChart3, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const CALENDLY_URL = "https://calendly.com/david-joinrippl/30min";
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const DENTAL_PLANS = [
  {
    name: "Per Referral",
    monthly: null,
    perReferral: 55,
    reward: 35,
    highlight: false,
    description: "No monthly commitment. Pay only when a verified referral completes their first appointment.",
  },
  {
    name: "Growth",
    monthly: 149,
    perReferral: 35,
    reward: 35,
    highlight: true,
    description: "Best for practices generating 5+ referrals per month. Lower per-referral cost at scale.",
  },
];

const VERTICALS = [
  {
    label: "Automotive",
    integration: "DriveCentric",
    tag: "Coming Soon",
    description: "DriveCentric integration coming soon. Rewards fire automatically when a referred customer closes a vehicle purchase.",
    emr: "DriveCentric",
  },
  {
    label: "Salon",
    integration: "Vagaro",
    tag: "Coming Soon",
    description: "Vagaro integration coming soon. Rewards fire when a referred client completes their first service.",
    emr: "Vagaro",
  },
];

const INCLUDED = [
  { Icon: Search,        text: "Automatic referral detection via your existing software" },
  { Icon: MessageSquare, text: "SMS reward notifications via Twilio" },
  { Icon: Mail,          text: "Branded email notifications with reward selection" },
  { Icon: Gift,          text: "Digital gift cards, charity donations, or in-house credit" },
  { Icon: Zap,           text: "Zero staff work — fully automated end to end" },
  { Icon: BarChart3,     text: "Dashboard with referral pipeline and reward history" },
];

interface FormState {
  name: string;
  practice: string;
  email: string;
  phone: string;
  vertical: string;
}

export default function Pricing() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVertical, setSelectedVertical] = useState("");
  const [form, setForm] = useState<FormState>({ name: "", practice: "", email: "", phone: "", vertical: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openModal = (vertical = "") => {
    setSelectedVertical(vertical);
    setForm(f => ({ ...f, vertical }));
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
          source:   "pricing-page",
          emr:      form.vertical,
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
            <a href="/" className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">Home</a>
            <button
              onClick={() => openModal()}
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
          <p className="text-white/70 text-sm font-semibold uppercase tracking-widest mb-5">Pricing</p>
          <h1
            className="text-white text-5xl sm:text-6xl leading-[1.05] mb-5"
            style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700 }}
          >
            Pay only when{" "}
            <span style={{ fontStyle: "italic", fontWeight: 300 }}>it works.</span>
          </h1>
          <p className="text-white/80 text-lg leading-relaxed max-w-xl mx-auto mb-8">
            No monthly fee. No setup cost. You're charged a flat fee per verified referral — only when a real new customer walks in the door and completes their first visit.
          </p>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 bg-white text-[#E0622A] font-bold text-sm px-7 py-3.5 rounded-full transition-all hover:bg-orange-50 shadow-lg shadow-black/10"
          >
            Get Started <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── Dental pricing ────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-3">
            <p className="text-xs font-bold text-[#E0622A] uppercase tracking-widest">Dental</p>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Live · Open Dental</span>
          </div>
          <h2
            className="text-3xl text-slate-900 mb-3"
            style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700 }}
          >
            Two plans. Zero surprises.
          </h2>
          <p className="text-slate-500 text-sm mb-10 max-w-xl">
            Both plans include a $35 digital reward paid to your patient when their referral completes a first visit. You're only ever charged when a referral converts.
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
                <div>
                  <p className="font-bold text-slate-900 text-lg">{name}</p>
                </div>
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
                  onClick={() => openModal("Open Dental")}
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

          <p className="text-xs text-slate-400 mt-6">
            All plans include a 30-day trial period. Questions?{" "}
            <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="text-[#E0622A] hover:underline font-medium">
              Book a 30-minute call
            </a>
          </p>
        </div>
      </section>

      {/* ── Coming soon verticals ─────────────────────────────────────── */}
      <section className="py-16 bg-slate-50 border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Coming Soon</p>
          <h2
            className="text-2xl text-slate-900 mb-8"
            style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700 }}
          >
            More verticals on the way.
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
            {VERTICALS.map(({ label, integration, description, emr }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">via {integration}</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">Coming Soon</span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
                <button
                  onClick={() => openModal(emr)}
                  className="text-xs font-semibold text-[#E0622A] hover:underline text-left"
                >
                  Notify me when available →
                </button>
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
          <div className="grid sm:grid-cols-2 gap-x-16 gap-y-6">
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
          <div className="space-y-8">
            {[
              {
                q: "When exactly am I charged?",
                a: "Only when a verified referral completes their first appointment, service, or vehicle purchase — confirmed automatically through your existing practice management software. No conversion, no charge.",
              },
              {
                q: "What does the customer receive?",
                a: `A $${DENTAL_PLANS[0].reward} reward delivered by SMS and email. They choose from a digital gift card (200+ brands), a donation to charity in their name, or an in-house service credit if you offer one.`,
              },
              {
                q: "Do I need to change my software or workflow?",
                a: "No. Rippl connects to your existing Open Dental, DriveCentric, or Vagaro account. Your staff doesn't do anything differently — referrals are detected and rewarded automatically.",
              },
              {
                q: "Is there a setup fee or monthly minimum?",
                a: "None. There's no setup fee, no monthly subscription, and no minimum referral commitment. You pay only for results.",
              },
              {
                q: "How do I get started?",
                a: "Fill out the form on this page or book a 30-minute intro call. We'll look at your setup, connect your software, and go live — typically within a few days.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-slate-100 pb-8">
                <p className="font-bold text-slate-900 mb-2">{q}</p>
                <p className="text-slate-500 text-sm leading-relaxed">{a}</p>
              </div>
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
              onClick={() => openModal()}
              className="inline-flex items-center gap-2 bg-white text-[#E0622A] font-bold text-sm px-8 py-4 rounded-full transition-all hover:bg-orange-50 shadow-lg shadow-black/10"
            >
              Get Started <ChevronRight className="w-4 h-4" />
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
                  We'll be in touch within one business day. In the meantime, feel free to book a call.
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
                        placeholder="Jane Smith"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E0622A]/30 focus:border-[#E0622A] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Business Name</label>
                      <input
                        required
                        value={form.practice}
                        onChange={e => setForm(f => ({ ...f, practice: e.target.value }))}
                        placeholder="Acme Dental"
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
                      placeholder="jane@acmedental.com"
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
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Your Industry</label>
                    <select
                      value={form.vertical}
                      onChange={e => setForm(f => ({ ...f, vertical: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E0622A]/30 focus:border-[#E0622A] transition-all appearance-none"
                    >
                      <option value="">Select your industry…</option>
                      <option value="Open Dental">Dental (Open Dental)</option>
                      <option value="DriveCentric">Automotive (DriveCentric)</option>
                      <option value="Vagaro">Salon (Vagaro)</option>
                      <option value="Other">Other</option>
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
