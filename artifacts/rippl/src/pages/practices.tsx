import { motion } from "framer-motion";
import { Droplets, CheckCircle2, ArrowRight, ChevronDown, TrendingUp, Users, Zap, Shield } from "lucide-react";
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
const CHANNELS = [
  {
    name: "Google Ads",
    costPerPatient: "$200–$500",
    leadQuality: "Low intent",
    effort: "Ongoing mgmt",
    automated: false,
    highlight: false,
  },
  {
    name: "EDDM Mailers",
    costPerPatient: "$150–$400",
    leadQuality: "Cold leads",
    effort: "Design + print + mail",
    automated: false,
    highlight: false,
  },
  {
    name: "Rippl",
    costPerPatient: "$20",
    leadQuality: "Peer-referred trust",
    effort: "Fully automated",
    automated: true,
    highlight: true,
  },
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
  { icon: Zap,       title: "EMR-connected",       body: "Reads completed procedures directly from Open Dental. No manual data entry." },
  { icon: Users,     title: "Tiered rewards",       body: "Patients earn $35–$100 gift cards as they refer more. Bigger rewards = more motivation." },
  { icon: TrendingUp, title: "Practice dashboard",  body: "See referral events, top referrers, reward history, and ROI at a glance." },
  { icon: Shield,    title: "Dedup protection",     body: "Each new patient can only generate one reward — no gaming, no double-paying." },
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

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((v) => !v)}
      className="w-full text-left bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 transition-colors hover:border-slate-600"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-white font-semibold text-sm leading-snug">{q}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-slate-400 shrink-0 mt-0.5 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </div>
      {open && <p className="text-slate-400 text-sm mt-3 leading-relaxed">{a}</p>}
    </button>
  );
}

export default function Practices() {
  return (
    <div className="min-h-screen bg-[#0a1628] overflow-x-hidden">

      {/* ── Ambient glow ───────────────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-teal-500/5 rounded-full blur-[120px]" />
        <div className="absolute top-[60%] -left-40 w-[500px] h-[400px] bg-teal-600/4 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 md:px-8 py-10 md:py-16 pb-20">

        {/* ── Nav bar ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-600/30">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl">Rippl</span>
          </div>
          <a
            href="mailto:hello@joinrippl.com?subject=Rippl%20Demo%20Request"
            className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-lg shadow-teal-600/25"
          >
            Request a Demo <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* ── Hero ───────────────────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          animate="show"
          variants={stagger}
          className="text-center mb-20"
        >
          <motion.div variants={fadeUp}>
            <span className="inline-block bg-teal-900/60 border border-teal-700/40 text-teal-400 text-xs font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full mb-6">
              For Dental Practices
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-4xl md:text-6xl font-black text-white leading-tight mb-5"
          >
            Your patients are your
            <br />
            <span className="text-teal-400">best marketing channel.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-slate-400 text-lg leading-relaxed max-w-2xl mx-auto mb-8"
          >
            Rippl turns completed referrals into automated gift card rewards — fully
            integrated with Open Dental. You only pay $20 when a new patient actually
            walks in the door. No ad spend. No mailers. No staff work.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="mailto:hello@joinrippl.com?subject=Rippl%20Demo%20Request"
              className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-bold px-7 py-3.5 rounded-2xl transition-colors shadow-xl shadow-teal-600/30 text-base"
            >
              Request a Demo <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="/how-it-works"
              className="inline-flex items-center gap-2 bg-slate-800/60 border border-slate-700 hover:border-slate-500 text-slate-300 font-semibold px-7 py-3.5 rounded-2xl transition-colors text-base"
            >
              See patient experience
            </a>
          </motion.div>

          <motion.p variants={fadeUp} className="text-slate-600 text-sm mt-4">
            Live today at Hallmark Dental — 3 offices, 11,000+ patients
          </motion.p>
        </motion.section>

        {/* ── Stats row ──────────────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          animate="show"
          variants={stagger}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-20"
        >
          {STATS.map((s) => (
            <motion.div
              key={s.label}
              variants={fadeUp}
              className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 md:p-5 text-center"
            >
              <p className="text-3xl md:text-4xl font-black text-teal-400 mb-1">{s.value}</p>
              <p className="text-white font-semibold text-xs md:text-sm leading-tight mb-1">{s.label}</p>
              <p className="text-slate-500 text-xs leading-snug">{s.sub}</p>
            </motion.div>
          ))}
        </motion.section>

        {/* ── ROI comparison ─────────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          animate="show"
          variants={stagger}
          className="mb-20"
        >
          <motion.div variants={fadeUp} className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
              Stop paying for clicks. Pay for patients.
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              Traditional dental marketing charges you whether or not a patient ever books.
              Rippl charges only on verified, completed first visits.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="overflow-x-auto rounded-2xl border border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/60">
                  <th className="text-left text-slate-400 font-semibold px-5 py-3.5">Channel</th>
                  <th className="text-left text-slate-400 font-semibold px-5 py-3.5">Cost per new patient</th>
                  <th className="text-left text-slate-400 font-semibold px-5 py-3.5 hidden sm:table-cell">Lead quality</th>
                  <th className="text-left text-slate-400 font-semibold px-5 py-3.5 hidden md:table-cell">Staff effort</th>
                </tr>
              </thead>
              <tbody>
                {CHANNELS.map((ch, i) => (
                  <tr
                    key={ch.name}
                    className={cn(
                      "border-b border-slate-700/50 last:border-0 transition-colors",
                      ch.highlight
                        ? "bg-teal-900/25 border-teal-700/30"
                        : "bg-slate-800/30 hover:bg-slate-800/50",
                      i === CHANNELS.length - 1 && "last:rounded-b-2xl",
                    )}
                  >
                    <td className="px-5 py-4">
                      <span className={cn("font-bold", ch.highlight ? "text-teal-300" : "text-slate-300")}>
                        {ch.name}
                      </span>
                      {ch.highlight && (
                        <span className="ml-2 bg-teal-600/30 border border-teal-600/40 text-teal-400 text-[10px] font-semibold px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                          You are here
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn("font-black text-base", ch.highlight ? "text-teal-400" : "text-slate-400")}>
                        {ch.costPerPatient}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className={ch.highlight ? "text-teal-300 font-semibold" : "text-slate-400"}>
                        {ch.leadQuality}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className={ch.highlight ? "text-teal-300 font-semibold" : "text-slate-400"}>
                        {ch.effort}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: "📬", title: "EDDM reality check", body: "A 5,000-piece mailer run costs $1,500–$2,500 in postage, design, and print. At a 0.5–1% response rate, you're paying $150–$400 per patient — who may never return." },
              { icon: "📊", title: "Google Ads reality check", body: "Dental keywords average $15–$50 per click. With a 3–5% booking conversion, you're spending $300–$1,000+ per new patient — and competing against every DSO in your market." },
              { icon: "✅", title: "Rippl reality check", body: "You pay $20 only when a referred patient completes their first visit. If they don't show — you don't pay. Peer-referred patients also convert and retain at significantly higher rates." },
            ].map((item) => (
              <div key={item.title} className="bg-slate-800/40 border border-slate-700 rounded-2xl p-4">
                <div className="text-2xl mb-2">{item.icon}</div>
                <p className="text-white font-bold text-sm mb-1">{item.title}</p>
                <p className="text-slate-400 text-xs leading-relaxed">{item.body}</p>
              </div>
            ))}
          </motion.div>
        </motion.section>

        {/* ── How it works ───────────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          animate="show"
          variants={stagger}
          className="mb-20"
        >
          <motion.div variants={fadeUp} className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-black text-white mb-2">How Rippl works</h2>
            <p className="text-slate-400 text-sm max-w-lg mx-auto">
              Four steps — the last three happen with zero intervention from your team.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="flex items-start gap-4 bg-slate-800/50 border border-slate-700 rounded-2xl p-5"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-700/60 flex items-center justify-center text-2xl shrink-0">
                  {step.emoji}
                </div>
                <div>
                  <p className="text-white font-bold text-sm mb-1">
                    <span className="text-teal-500 mr-1.5">{i + 1}.</span>
                    {step.title}
                  </p>
                  <p className="text-slate-400 text-sm leading-relaxed">{step.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── Features ───────────────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          animate="show"
          variants={stagger}
          className="mb-20"
        >
          <motion.div variants={fadeUp} className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-black text-white mb-2">Everything included</h2>
            <p className="text-slate-400 text-sm">No add-ons. No tiers. One flat $20-per-referral model.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6">
            {FEATURES.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                className="flex items-start gap-4 bg-slate-800/50 border border-slate-700 rounded-2xl p-5"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-900/50 border border-teal-700/30 flex items-center justify-center shrink-0">
                  <f.icon className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm mb-1">{f.title}</p>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.body}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp} className="bg-slate-800/40 border border-slate-700 rounded-2xl p-5">
            <p className="text-white font-bold text-sm mb-3">Also included:</p>
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
                <div key={item} className="flex items-start gap-2 text-slate-400 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-0.5" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.section>

        {/* ── Pricing ────────────────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          animate="show"
          variants={stagger}
          className="mb-20"
        >
          <motion.div
            variants={fadeUp}
            className="bg-gradient-to-br from-teal-900/40 to-slate-800/60 border border-teal-700/30 rounded-3xl p-8 md:p-10 text-center"
          >
            <span className="inline-block bg-teal-900/60 border border-teal-700/40 text-teal-400 text-xs font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full mb-5">
              Pricing
            </span>
            <div className="flex items-end justify-center gap-1 mb-2">
              <span className="text-6xl md:text-7xl font-black text-white">$20</span>
              <span className="text-slate-400 text-lg mb-3">/ referral</span>
            </div>
            <p className="text-teal-400 font-semibold text-sm mb-6">Only when a new patient completes their first visit</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto mb-8">
              {[
                { icon: "✓", text: "No monthly fees" },
                { icon: "✓", text: "No setup fees" },
                { icon: "✓", text: "No long-term contract" },
              ].map((item) => (
                <div key={item.text} className="flex items-center justify-center gap-2 text-slate-300 text-sm font-semibold">
                  <span className="text-teal-400">{item.icon}</span>
                  {item.text}
                </div>
              ))}
            </div>
            <a
              href="mailto:hello@joinrippl.com?subject=Rippl%20Demo%20Request"
              className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-bold px-8 py-4 rounded-2xl transition-colors shadow-xl shadow-teal-600/30 text-base"
            >
              Request a Demo <ArrowRight className="w-5 h-5" />
            </a>
            <p className="text-slate-500 text-xs mt-4">We'll walk through your Open Dental setup and get you live same day.</p>
          </motion.div>
        </motion.section>

        {/* ── FAQ ────────────────────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          animate="show"
          className="mb-20"
        >
          <h2 className="text-2xl font-black text-white mb-6 text-center">Frequently asked questions</h2>
          <div className="space-y-2">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </motion.section>

        {/* ── Final CTA ──────────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700 rounded-3xl p-8 md:p-12">
            <Droplets className="w-10 h-10 mb-4 mx-auto text-teal-400" />
            <h3 className="text-white font-black text-2xl md:text-3xl mb-3">
              Ready to make your patients your best marketers?
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-lg mx-auto">
              We'll connect to your Open Dental instance, walk through the admin dashboard,
              and get you live — in one call.
            </p>
            <a
              href="mailto:hello@joinrippl.com?subject=Rippl%20Demo%20Request"
              className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-bold px-8 py-4 rounded-2xl transition-colors shadow-xl shadow-teal-600/30 text-base"
            >
              Request a Demo <ArrowRight className="w-5 h-5" />
            </a>
            <p className="text-slate-500 text-xs mt-4">
              Questions? Email us at{" "}
              <a href="mailto:hello@joinrippl.com" className="text-teal-500 hover:text-teal-400">
                hello@joinrippl.com
              </a>
            </p>
          </div>
        </motion.section>

        <p className="text-center text-xs text-slate-600 mt-8">
          © 2026 Rippl · Powered by Hallmark Dental · <a href="/privacy" className="hover:text-slate-400 transition-colors">Privacy</a> · <a href="/terms" className="hover:text-slate-400 transition-colors">Terms</a>
        </p>
      </div>
    </div>
  );
}
