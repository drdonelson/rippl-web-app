import { motion, AnimatePresence } from "framer-motion";
import { Droplets, CheckCircle2, ArrowRight, ChevronDown, TrendingUp, Users, Zap, Shield, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

// ── ROI Comparison data ──────────────────────────────────────────────────────
// Benchmarks reflect a saturated metro market (e.g. Nashville / Brentwood TN)
// for a single-office practice with ~2,000–3,000 active patients.
const CHANNELS = [
  {
    name: "Google Ads",
    costPerPatient: "$250–$600",
    leadQuality: "Stranger, low intent",
    effort: "Daily mgmt + agency",
    automated: false,
    highlight: false,
  },
  {
    name: "Meta (FB / IG)",
    costPerPatient: "$200–$500",
    leadQuality: "Impulse / image-led",
    effort: "Creative refresh constant",
    automated: false,
    highlight: false,
  },
  {
    name: "EDDM Mailers",
    costPerPatient: "$180–$450",
    leadQuality: "Cold, ad-fatigued",
    effort: "Design, print, mail each drop",
    automated: false,
    highlight: false,
  },
  {
    name: "Rippl",
    costPerPatient: "$55–$120",
    leadQuality: "Peer-verified trust",
    effort: "Fully automated",
    automated: true,
    highlight: true,
  },
];

// Two realistic marketing-plan profiles most single-office practices actually run.
// Sources: dental-industry CPC benchmarks, USPS EDDM retail postage + commodity
// print pricing, Meta local-health CPL ranges, Hallmark Dental internal data.
const DIGITAL_PLAN = [
  { label: "Google Ads spend",          cost: "$36K–$60K" },
  { label: "Agency management",         cost: "$12K–$18K" },
  { label: "SEO retainer + listings",   cost: "$12K–$24K" },
  { label: "Meta (FB / IG) + creative", cost: "$12K–$24K" },
];

const EDDM_PLAN = [
  { label: "Postage (USPS EDDM retail)", cost: "$4K–$5K" },
  { label: "Print & design",              cost: "$4K–$6K" },
  { label: "Campaign setup per drop",     cost: "$2K–$4K" },
];

const STATS = [
  { value: "$20", label: "Per verified new patient", sub: "Only when they walk in the door" },
  { value: "4×", label: "Higher conversion rate", sub: "vs. cold advertising channels" },
  { value: "37%", label: "Better patient retention", sub: "Referred patients stay longer" },
  { value: "0", label: "Staff hours required", sub: "Fully automated end-to-end" },
];

const HOW_IT_WORKS = [
  {
    emoji: "📋",
    title: "Connect your EMR",
    body: "Rippl integrates directly with Open Dental via your eConnector. Setup takes one afternoon — no IT team required.",
  },
  {
    emoji: "📲",
    title: "Patients refer automatically",
    body: "Each enrolled patient gets a personal referral link. They share it with friends. That's the entire ask.",
  },
  {
    emoji: "🦷",
    title: "New patient completes a visit",
    body: "When the referred patient completes their exam, Rippl detects it automatically via the R0150 procedure code.",
  },
  {
    emoji: "🎁",
    title: "Reward fires — zero staff work",
    body: "The referring patient gets an SMS + email and chooses their reward. Your front desk never touches it.",
  },
];

const FEATURES = [
  { icon: Zap,        title: "EMR-connected",      body: "Reads completed procedures directly from Open Dental. No manual data entry." },
  { icon: Users,      title: "Tiered rewards",      body: "Patients earn $35–$100 gift cards as they refer more. Bigger rewards = more motivation." },
  { icon: TrendingUp, title: "Practice dashboard",  body: "See referral events, top referrers, reward history, and ROI at a glance." },
  { icon: Shield,     title: "Dedup protection",    body: "Each new patient can only generate one reward — no gaming, no double-paying." },
];

const FAQS = [
  {
    q: "Does it work with my version of Open Dental?",
    a: "Rippl uses the Open Dental REST API via your eConnector service. Any practice running eConnector on a server can connect. We'll verify compatibility on your demo call.",
  },
  {
    q: "What do patients actually receive?",
    a: "A text + email notification with a claim link. They choose from: Amazon/Visa/Target gift card, $100 dental credit toward treatment, charity donation, or a local business reward.",
  },
  {
    q: "What if we have multiple locations?",
    a: "Rippl supports multiple offices under one account. Each office gets its own Open Dental customer key and referral tracking.",
  },
  {
    q: "How does billing work?",
    a: "Two line items, that's it. A $499 one-time setup fee covers Open Dental integration, staff training, and office configuration (waived for Founding Practices — see below). After that, you pay $20 per verified referral — only when a new patient completes their first exam. Gift card rewards are billed at face value with zero markup. No monthly fees, no long-term contract, no card processing charges.",
  },
  {
    q: "What is the Founding Practice program?",
    a: "Any practice that signs up and goes live with Rippl before August 31, 2026 gets the $499 setup fee waived. In exchange, you agree to let us publish a brief case study about your results after 90 days of use, and you become a referenceable launch partner for future practices. You get early-mover pricing; we get real-world data to make Rippl better for everyone who comes after. After August 31, the setup fee applies to all new practices.",
  },
  {
    q: "How long does setup take?",
    a: "Most practices go live in one session. You'll need your Open Dental developer key, customer key, and eConnector running. We handle the rest.",
  },
];

const EMR_OPTIONS = [
  "Open Dental",
  "Dentrix",
  "Eaglesoft",
  "Curve Dental",
  "Carestream Dental",
  "Dental Vision",
  "Other",
];

const LOCATION_OPTIONS = ["1", "2–3", "4–9", "10+"];

type DemoFormState = "idle" | "submitting" | "success" | "error";

function DemoModal({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<DemoFormState>("idle");
  const [form, setForm] = useState({
    name: "", email: "", phone: "", practice: "", emr: "", locations: "",
  });

  const set = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("request failed");
      setState("success");
    } catch {
      setState("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-2xl shadow-slate-200/50"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {state === "success" ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-teal-600" />
            </div>
            <h3 className="text-slate-900 font-black text-xl mb-2">You're on the list!</h3>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
              We'll reach out within one business day to schedule your demo. Check your inbox for a confirmation.
            </p>
            <button
              onClick={onClose}
              className="mt-6 inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-white" />
                </div>
                <span className="text-slate-900 font-bold text-sm">Rippl</span>
              </div>
              <h3 className="text-slate-900 font-black text-xl mt-3 mb-1">Request a Demo</h3>
              <p className="text-slate-500 text-sm">We'll walk through your Open Dental setup and get you live — in one call.</p>
            </div>

            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-slate-500 font-medium mb-1">Full name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={set("name")}
                    placeholder="Dr. Jane Smith"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 font-medium mb-1">Email *</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    placeholder="jane@mypractice.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 font-medium mb-1">Phone *</label>
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={set("phone")}
                    placeholder="(615) 555-0100"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-colors"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-500 font-medium mb-1">Practice name *</label>
                  <input
                    required
                    value={form.practice}
                    onChange={set("practice")}
                    placeholder="Smith Family Dentistry"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 font-medium mb-1">EMR system</label>
                  <select
                    value={form.emr}
                    onChange={set("emr")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-colors appearance-none"
                  >
                    <option value="">Select EMR…</option>
                    {EMR_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 font-medium mb-1">Locations</label>
                  <select
                    value={form.locations}
                    onChange={set("locations")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-colors appearance-none"
                  >
                    <option value="">How many?</option>
                    {LOCATION_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>

              {state === "error" && (
                <p className="text-red-600 text-xs text-center">
                  Something went wrong — email us at{" "}
                  <a href="mailto:hello@joinrippl.com" className="underline">hello@joinrippl.com</a>
                </p>
              )}

              <button
                type="submit"
                disabled={state === "submitting"}
                className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-teal-600/20 text-sm mt-1"
              >
                {state === "submitting" ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                ) : (
                  <>Request Demo <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
              <p className="text-slate-400 text-xs text-center">We'll respond within one business day.</p>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((v) => !v)}
      className="w-full text-left bg-white border border-slate-200 rounded-2xl px-5 py-4 transition-colors hover:border-slate-300"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-slate-800 font-semibold text-sm leading-snug">{q}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-slate-400 shrink-0 mt-0.5 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </div>
      {open && <p className="text-slate-500 text-sm mt-3 leading-relaxed">{a}</p>}
    </button>
  );
}

export default function Practices() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">

      <AnimatePresence>
        {showModal && <DemoModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>

      {/* ── Subtle glow ────────────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-teal-500/6 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-14 pb-20">

        {/* ── Nav bar ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-14">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-600/20">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <span className="text-slate-900 font-bold text-xl">Rippl</span>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-md shadow-teal-600/20"
          >
            Request a Demo <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          animate="show"
          variants={stagger}
          className="text-center mb-16"
        >
          <motion.div variants={fadeUp}>
            <span className="inline-block bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full mb-6">
              For Dental Practices
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-4xl md:text-6xl font-black text-slate-900 leading-tight mb-5"
          >
            Your patients are your
            <br />
            <span className="text-teal-600">best marketing channel.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-slate-500 text-lg leading-relaxed max-w-2xl mx-auto mb-8"
          >
            Rippl turns completed referrals into automated gift card rewards — fully
            integrated with Open Dental. $499 one-time setup, then $20 when a new
            patient actually walks in the door. No ad spend. No mailers. No staff work.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-bold px-7 py-3.5 rounded-2xl transition-colors shadow-xl shadow-teal-600/25 text-base"
            >
              Request a Demo <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="/how-it-works"
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold px-7 py-3.5 rounded-2xl transition-colors text-base"
            >
              See patient experience
            </a>
          </motion.div>

          <motion.p variants={fadeUp} className="text-slate-400 text-sm mt-4">
            Live today at Hallmark Dental — 3 offices, 11,000+ patients
          </motion.p>
        </motion.section>

        {/* ── Stats row ────────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          animate="show"
          variants={stagger}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-16"
        >
          {STATS.map((s) => (
            <motion.div
              key={s.label}
              variants={fadeUp}
              className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 text-center"
            >
              <p className="text-3xl md:text-4xl font-black text-teal-600 mb-1">{s.value}</p>
              <p className="text-slate-800 font-semibold text-xs md:text-sm leading-tight mb-1">{s.label}</p>
              <p className="text-slate-400 text-xs leading-snug">{s.sub}</p>
            </motion.div>
          ))}
        </motion.section>

        {/* ── ROI comparison ───────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          animate="show"
          variants={stagger}
          className="mb-16"
        >
          <motion.div variants={fadeUp} className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
              Stop paying for clicks. Pay for patients.
            </h2>
            <p className="text-slate-500 text-sm max-w-xl mx-auto">
              Traditional dental marketing charges you whether or not a patient ever books.
              Rippl charges only on verified, completed first visits.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="overflow-x-auto rounded-2xl border border-slate-200">
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
                {CHANNELS.map((ch, i) => (
                  <tr
                    key={ch.name}
                    className={cn(
                      "border-b border-slate-200/60 last:border-0 transition-colors",
                      ch.highlight
                        ? "bg-teal-50/80"
                        : "bg-white hover:bg-slate-50",
                      i === CHANNELS.length - 1 && "last:rounded-b-2xl",
                    )}
                  >
                    <td className="px-5 py-4">
                      <span className={cn("font-bold", ch.highlight ? "text-teal-700" : "text-slate-700")}>
                        {ch.name}
                      </span>
                      {ch.highlight && (
                        <span className="ml-2 bg-teal-100 border border-teal-200 text-teal-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                          You are here
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn("font-black text-base", ch.highlight ? "text-teal-600" : "text-slate-500")}>
                        {ch.costPerPatient}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className={ch.highlight ? "text-teal-700 font-semibold" : "text-slate-500"}>
                        {ch.leadQuality}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className={ch.highlight ? "text-teal-700 font-semibold" : "text-slate-500"}>
                        {ch.effort}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                icon: "📊",
                title: "Google Ads reality check",
                body: "Dental keywords in saturated metros run $15–$30 per click — cosmetic terms hit $40+. At a 5–7% click-to-booking rate with a typical no-show tax, you're paying $250–$600 per completed new patient. Plus $1,000–$1,500/mo in agency management on top of ad spend. You compete head-to-head with every DSO in your zip code.",
              },
              {
                icon: "📱",
                title: "Meta (FB / IG) reality check",
                body: "Local-health CPL on Meta runs $45–$100 per lead, but intent is much lower than Google. Lead-to-patient conversion is 20–30%, landing you at $200–$500 per new patient. Creative fatigues in 30–45 days, so you're on the hook for a constant content treadmill — or another $500–$1,200/mo in creative management.",
              },
              {
                icon: "📬",
                title: "EDDM mailer reality check",
                body: "A 5,000-piece drop in an affluent zip runs $2,250–$2,900 all-in (postage $0.22 + print/design). Response rates in saturated markets have dropped to 0.5–1% — recipients are buried in dental mailers. Net: $180–$450 per new patient, and they're cold leads with no existing trust.",
              },
              {
                icon: "✅",
                title: "Rippl reality check",
                body: "Total all-in cost: $55–$120 per new patient ($20 platform fee + $35–$100 reward, tier-based). You pay only when they complete a visit — no-shows cost you nothing. Referred patients accept 4× more treatment and retain 37% longer than ad-sourced ones. No ads, no creative, no agency.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-white border border-slate-200 rounded-2xl p-4">
                <div className="text-2xl mb-2">{item.icon}</div>
                <p className="text-slate-800 font-bold text-sm mb-1">{item.title}</p>
                <p className="text-slate-500 text-xs leading-relaxed">{item.body}</p>
              </div>
            ))}
          </motion.div>
        </motion.section>

        {/* ── Annual spend comparison ─────────────────────────────────── */}
        <motion.section
          initial="hidden"
          animate="show"
          variants={stagger}
          className="mb-16"
        >
          <motion.div variants={fadeUp} className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
              Whichever channel you're running, Rippl beats it
            </h2>
            <p className="text-slate-500 text-sm max-w-xl mx-auto">
              Most practices run one marketing approach, not all of them. Here's what each
              typically costs a single-office practice in a saturated metro — and what Rippl
              costs to deliver the same patients.
            </p>
          </motion.div>

          {/* Scenario 1: Digital marketing plan */}
          <motion.div variants={fadeUp} className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Scenario 1</span>
              <span className="h-px bg-slate-200 flex-1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">📊</span>
                  <p className="text-slate-900 font-bold text-base">Digital marketing plan</p>
                </div>
                <p className="text-slate-500 text-xs mb-4">Google Ads + SEO + Social, typically via an agency</p>
                <div className="space-y-2.5 mb-5">
                  {DIGITAL_PLAN.map((row) => (
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
                  <span className="text-slate-500 text-sm">~200–300 new patients / year</span>
                  <span className="font-bold text-slate-500 text-sm tabular-nums">$300–$500 CAC</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-teal-50 to-white border-2 border-teal-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">💧</span>
                  <p className="text-slate-900 font-bold text-base">Same 250 patients via Rippl</p>
                </div>
                <p className="text-teal-700 text-xs mb-4 font-semibold">Pay only when they walk in</p>
                <div className="space-y-2.5 mb-5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-700">Platform fee (250 × $20)</span>
                    <span className="font-semibold text-slate-900 tabular-nums">$5,000</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-700">Rewards (avg $65, face value)</span>
                    <span className="font-semibold text-slate-900 tabular-nums">$16,250</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-700">Agency / creative / staff time</span>
                    <span className="font-semibold text-slate-900 tabular-nums">$0</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 pt-4 border-t border-teal-200">
                  <span className="text-slate-900 font-bold">Total / year</span>
                  <span className="font-black text-teal-700 text-lg tabular-nums">$21,250</span>
                </div>
                <div className="flex items-center justify-between gap-3 mt-2">
                  <span className="text-slate-500 text-sm">Cost per new patient</span>
                  <span className="font-bold text-teal-700 text-sm tabular-nums">$85</span>
                </div>
              </div>
            </div>
            <div className="mt-3 bg-teal-600 text-white rounded-xl px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
              <p className="font-bold text-sm">Savings vs. digital plan</p>
              <span className="font-black text-lg tabular-nums">$51K–$105K / year</span>
            </div>
          </motion.div>

          {/* Scenario 2: EDDM mailers */}
          <motion.div variants={fadeUp}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Scenario 2</span>
              <span className="h-px bg-slate-200 flex-1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">📬</span>
                  <p className="text-slate-900 font-bold text-base">EDDM mailer program</p>
                </div>
                <p className="text-slate-500 text-xs mb-4">Quarterly 5,000-piece drops in target zips</p>
                <div className="space-y-2.5 mb-5">
                  {EDDM_PLAN.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-700">{row.label}</span>
                      <span className="font-semibold text-slate-900 tabular-nums">{row.cost}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200">
                  <span className="text-slate-900 font-bold">Total / year</span>
                  <span className="font-black text-slate-900 text-lg tabular-nums">$10K–$15K</span>
                </div>
                <div className="flex items-center justify-between gap-3 mt-2">
                  <span className="text-slate-500 text-sm">~40–80 new patients / year</span>
                  <span className="font-bold text-slate-500 text-sm tabular-nums">$180–$450 CAC</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-teal-50 to-white border-2 border-teal-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">💧</span>
                  <p className="text-slate-900 font-bold text-base">Same 60 patients via Rippl</p>
                </div>
                <p className="text-teal-700 text-xs mb-4 font-semibold">No print, no postage, no design cycle</p>
                <div className="space-y-2.5 mb-5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-700">Platform fee (60 × $20)</span>
                    <span className="font-semibold text-slate-900 tabular-nums">$1,200</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-700">Rewards (avg $65, face value)</span>
                    <span className="font-semibold text-slate-900 tabular-nums">$3,900</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-700">Print / postage / creative</span>
                    <span className="font-semibold text-slate-900 tabular-nums">$0</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 pt-4 border-t border-teal-200">
                  <span className="text-slate-900 font-bold">Total / year</span>
                  <span className="font-black text-teal-700 text-lg tabular-nums">$5,100</span>
                </div>
                <div className="flex items-center justify-between gap-3 mt-2">
                  <span className="text-slate-500 text-sm">Cost per new patient</span>
                  <span className="font-bold text-teal-700 text-sm tabular-nums">$85</span>
                </div>
              </div>
            </div>
            <div className="mt-3 bg-teal-600 text-white rounded-xl px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
              <p className="font-bold text-sm">Savings vs. EDDM program</p>
              <span className="font-black text-lg tabular-nums">$4.9K–$9.9K / year</span>
            </div>
          </motion.div>

          <motion.p variants={fadeUp} className="text-center text-slate-500 text-xs mt-6 max-w-xl mx-auto leading-relaxed">
            Rippl works alongside whatever you're already doing — you can keep running ads or mailers
            and add a referral layer on top. Most practices end up reducing paid-channel spend once
            peer referrals start compounding.
          </motion.p>
        </motion.section>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          animate="show"
          variants={stagger}
          className="mb-16"
        >
          <motion.div variants={fadeUp} className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">How Rippl works</h2>
            <p className="text-slate-500 text-sm max-w-lg mx-auto">
              Four steps — the last three happen with zero intervention from your team.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="flex items-start gap-4 bg-white border border-slate-200 rounded-2xl p-5"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl shrink-0">
                  {step.emoji}
                </div>
                <div>
                  <p className="text-slate-800 font-bold text-sm mb-1">
                    <span className="text-teal-600 mr-1.5">{i + 1}.</span>
                    {step.title}
                  </p>
                  <p className="text-slate-500 text-sm leading-relaxed">{step.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── Features ─────────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          animate="show"
          variants={stagger}
          className="mb-16"
        >
          <motion.div variants={fadeUp} className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">Everything included</h2>
            <p className="text-slate-500 text-sm">No add-ons. No monthly fees. One flat $20-per-referral model after onboarding.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6">
            {FEATURES.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                className="flex items-start gap-4 bg-white border border-slate-200 rounded-2xl p-5"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
                  <f.icon className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-slate-800 font-bold text-sm mb-1">{f.title}</p>
                  <p className="text-slate-500 text-sm leading-relaxed">{f.body}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp} className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-slate-800 font-bold text-sm mb-3">Also included:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {[
                "SMS + email reward notifications",
                "Branded patient-facing claim page",
                "Multi-office support",
                "Gift card, dental credit, charity, local partner rewards",
                "Automatic opt-out handling",
                "Reward fallback — no reward is ever lost",
                "Bulk campaign messaging",
                "Staff onboarding tools",
                "Role-based access control",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-slate-500 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.section>

        {/* ── Pricing ──────────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          animate="show"
          variants={stagger}
          className="mb-16"
        >
          <motion.div
            variants={fadeUp}
            className="bg-gradient-to-br from-teal-50 to-slate-50 border border-teal-200 rounded-3xl p-8 md:p-10"
          >
            <div className="text-center mb-8">
              <span className="inline-block bg-teal-100 border border-teal-200 text-teal-700 text-xs font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full mb-5">
                Transparent pricing
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
                Two numbers. That's the whole model.
              </h2>
              <p className="text-slate-500 text-sm max-w-lg mx-auto">
                No monthly fees. No card markup. No long-term contract. You pay only when
                a patient actually walks in.
              </p>
            </div>

            {/* Two price pillars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                  One-time setup
                </p>
                <div className="flex items-end justify-center gap-1 mb-2">
                  <span className="text-5xl font-black text-slate-900">$499</span>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Open Dental integration, staff training, tier & reward configuration,
                  office setup.
                </p>
                <p className="mt-3 inline-block bg-teal-100 border border-teal-200 text-teal-700 text-[11px] font-semibold px-2 py-1 rounded-md uppercase tracking-wide">
                  Waived if live by Aug 31, 2026
                </p>
              </div>

              <div className="bg-white border-2 border-teal-500 rounded-2xl p-6 text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-teal-700 mb-2">
                  Per verified referral
                </p>
                <div className="flex items-end justify-center gap-1 mb-2">
                  <span className="text-5xl font-black text-slate-900">$20</span>
                  <span className="text-slate-500 text-base mb-1">/ patient</span>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Only when a new patient completes their first visit. Rewards billed
                  at face value, zero markup.
                </p>
              </div>
            </div>

            {/* Founding Practice callout */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 md:p-6 max-w-2xl mx-auto mb-8">
              <div className="flex items-start gap-4">
                <div className="text-2xl shrink-0">🌱</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-black text-base">Founding Practice program</p>
                    <span className="inline-block bg-teal-500/20 border border-teal-400/40 text-teal-300 text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wide">
                      Ends Aug 31, 2026
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Every practice that signs up and goes live before August 31, 2026 gets the
                    $499 setup fee waived — in exchange for a brief case study after 90 days of use
                    and referenceable launch-partner status. After August 31, the setup fee
                    applies to all new practices.
                  </p>
                </div>
              </div>
            </div>

            {/* Sample invoice */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-2xl mx-auto mb-8">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                <p className="text-slate-900 font-bold text-sm">Sample monthly statement</p>
                <p className="text-slate-400 text-xs">22 referrals, mixed tiers</p>
              </div>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Platform fee — 22 × $20</span>
                  <span className="font-semibold text-slate-900 tabular-nums">$440</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Rewards — face value, zero markup</span>
                  <span className="font-semibold text-slate-900 tabular-nums">$1,320</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Monthly platform fees</span>
                  <span className="tabular-nums">$0</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Card processing / Tango markup</span>
                  <span className="tabular-nums">$0</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Agency / creative / management</span>
                  <span className="tabular-nums">$0</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200">
                <span className="text-slate-900 font-black">Your total</span>
                <span className="font-black text-slate-900 text-lg tabular-nums">$1,760</span>
              </div>
              <p className="text-slate-400 text-xs mt-3 leading-relaxed">
                That's ~$80 per new patient, all-in. A typical Google Ads program in a
                saturated metro would cost you $6,000+ for the same 22 patients.
              </p>
            </div>

            <div className="text-center">
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-bold px-8 py-4 rounded-2xl transition-colors shadow-xl shadow-teal-600/25 text-base"
              >
                Claim a Founding Practice spot <ArrowRight className="w-5 h-5" />
              </button>
              <p className="text-slate-400 text-xs mt-4">We'll walk through your Open Dental setup and get you live same day.</p>
            </div>
          </motion.div>
        </motion.section>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          animate="show"
          className="mb-16"
        >
          <h2 className="text-2xl font-black text-slate-900 mb-6 text-center">Frequently asked questions</h2>
          <div className="space-y-2">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </motion.section>

        {/* ── Final CTA ────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="bg-gradient-to-br from-slate-100 to-white border border-slate-200 rounded-3xl p-8 md:p-12">
            <Droplets className="w-10 h-10 mb-4 mx-auto text-teal-600" />
            <h3 className="text-slate-900 font-black text-2xl md:text-3xl mb-3">
              Ready to make your patients your best marketers?
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-6 max-w-lg mx-auto">
              We'll connect to your Open Dental instance, walk through the admin dashboard,
              and get you live — in one call.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-bold px-8 py-4 rounded-2xl transition-colors shadow-xl shadow-teal-600/25 text-base"
            >
              Request a Demo <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-slate-400 text-xs mt-4">
              Questions? Email us at{" "}
              <a href="mailto:hello@joinrippl.com" className="text-teal-600 hover:text-teal-500">
                hello@joinrippl.com
              </a>
            </p>
          </div>
        </motion.section>

        <p className="text-center text-xs text-slate-400 mt-8">
          © 2026 Rippl · Powered by Hallmark Dental · <a href="/privacy" className="hover:text-slate-600 transition-colors">Privacy</a> · <a href="/terms" className="hover:text-slate-600 transition-colors">Terms</a>
        </p>
      </div>
    </div>
  );
}
