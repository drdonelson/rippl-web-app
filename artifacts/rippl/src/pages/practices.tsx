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

// Saturated-market annual spend model for a 2,500-active-patient practice.
// Sources: dental-industry CPC benchmarks (WordStream/SEMrush), USPS EDDM
// retail postage + commodity print pricing, Meta local-health CPL ranges.
const ANNUAL_SPEND = {
  google:   { label: "Google Ads + agency mgmt",      cost: "$48,000–$66,000" },
  meta:     { label: "Meta (FB / IG) + creative",     cost: "$18,000–$36,000" },
  eddm:     { label: "EDDM mailers (quarterly drop)", cost: "$10,000–$14,000" },
  seo:      { label: "SEO retainer + listings",       cost: "$12,000–$24,000" },
};

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
    a: "No monthly fees, no setup fees. You pay $20 per verified referral — only when a new patient completes their first exam. If the Tango gift card fails, the reward falls back to an admin task so nothing is ever lost.",
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
            integrated with Open Dental. You only pay $20 when a new patient actually
            walks in the door. No ad spend. No mailers. No staff work.
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
              The math for a saturated-market practice
            </h2>
            <p className="text-slate-500 text-sm max-w-xl mx-auto">
              A single-office practice with ~2,500 active patients in a competitive metro typically
              spends this across paid channels. Rippl replaces most of it — and only bills when a
              patient actually shows.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* What they spend today */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
                Typical annual spend
              </p>
              <div className="space-y-3 mb-5">
                {Object.values(ANNUAL_SPEND).map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-700">{row.label}</span>
                    <span className="font-bold text-slate-900 tabular-nums">{row.cost}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200">
                <span className="text-slate-900 font-bold">Total / year</span>
                <span className="font-black text-slate-900 text-lg tabular-nums">$88K–$140K</span>
              </div>
              <div className="flex items-center justify-between gap-3 mt-2">
                <span className="text-slate-500 text-sm">~250 new patients / year</span>
                <span className="font-bold text-slate-500 text-sm tabular-nums">$350–$560 CAC</span>
              </div>
            </div>

            {/* What Rippl costs to match */}
            <div className="bg-gradient-to-br from-teal-50 to-white border-2 border-teal-200 rounded-2xl p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-teal-700 mb-3">
                Same 250 patients, through Rippl
              </p>
              <div className="space-y-3 mb-5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-700">Platform fee (250 × $20)</span>
                  <span className="font-bold text-slate-900 tabular-nums">$5,000</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-700">Rewards (avg $65/referral)</span>
                  <span className="font-bold text-slate-900 tabular-nums">$16,250</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-700">Staff time</span>
                  <span className="font-bold text-slate-900 tabular-nums">$0</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-700">Agency / creative</span>
                  <span className="font-bold text-slate-900 tabular-nums">$0</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-teal-200">
                <span className="text-slate-900 font-bold">Total / year</span>
                <span className="font-black text-teal-700 text-lg tabular-nums">$21,250</span>
              </div>
              <div className="flex items-center justify-between gap-3 mt-2">
                <span className="text-slate-500 text-sm">Blended cost per patient</span>
                <span className="font-bold text-teal-700 text-sm tabular-nums">$85</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-4 bg-teal-600 text-white rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-teal-100 mb-1">
                Bottom line
              </p>
              <p className="font-black text-lg md:text-xl leading-tight">
                $67K–$119K saved per year, per office
              </p>
              <p className="text-teal-100 text-xs mt-1">
                And referred patients convert and retain at significantly higher rates than ad-sourced ones.
              </p>
            </div>
            <span className="bg-white/15 border border-white/20 text-white font-black text-2xl px-4 py-2 rounded-xl tabular-nums">
              4–7× ROI
            </span>
          </motion.div>
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
            <p className="text-slate-500 text-sm">No add-ons. No tiers. One flat $20-per-referral model.</p>
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
            className="bg-gradient-to-br from-teal-50 to-slate-50 border border-teal-200 rounded-3xl p-8 md:p-10 text-center"
          >
            <span className="inline-block bg-teal-100 border border-teal-200 text-teal-700 text-xs font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full mb-5">
              Pricing
            </span>
            <div className="flex items-end justify-center gap-1 mb-2">
              <span className="text-6xl md:text-7xl font-black text-slate-900">$20</span>
              <span className="text-slate-500 text-lg mb-3">/ referral</span>
            </div>
            <p className="text-teal-600 font-semibold text-sm mb-6">Only when a new patient completes their first visit</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto mb-8">
              {[
                { icon: "✓", text: "No monthly fees" },
                { icon: "✓", text: "No setup fees" },
                { icon: "✓", text: "No long-term contract" },
              ].map((item) => (
                <div key={item.text} className="flex items-center justify-center gap-2 text-slate-700 text-sm font-semibold">
                  <span className="text-teal-600">{item.icon}</span>
                  {item.text}
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-bold px-8 py-4 rounded-2xl transition-colors shadow-xl shadow-teal-600/25 text-base"
            >
              Request a Demo <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-slate-400 text-xs mt-4">We'll walk through your Open Dental setup and get you live same day.</p>
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
