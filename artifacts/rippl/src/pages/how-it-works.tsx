import { motion } from "framer-motion";
import { Droplets, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { TIER_CONFIG } from "@/lib/tier-config";

const STEPS = [
  {
    emoji: "🔗",
    title: "Share Your Link",
    body: "Share your personal referral link or QR code with anyone looking for a great dentist.",
  },
  {
    emoji: "🦷",
    title: "They Book & Visit",
    body: "Your friend schedules and completes their new patient exam at the practice.",
  },
  {
    emoji: "🎁",
    title: "You Earn a Reward",
    body: "You automatically receive a reward — no forms, no waiting, no front desk needed.",
  },
];

const TIERS = [
  { ...TIER_CONFIG[0], referrals: "1st referral", reward: "$35 reward" },
  { ...TIER_CONFIG[1], referrals: "3+ referrals", reward: "$50 reward" },
  { ...TIER_CONFIG[2], referrals: "6+ referrals", reward: "$75 reward" },
  { ...TIER_CONFIG[3], referrals: "10+ referrals", reward: "$100 reward" },
];

const REWARD_OPTIONS = [
  { icon: "🎁", title: "Gift Card", body: "Amazon, Visa, Target, or Starbucks — delivered instantly to your email." },
  { icon: "🦷", title: "Dental Credit", body: "$100 toward any treatment, applied to your account within 24 hours." },
  { icon: "❤️", title: "Charity Donation", body: "We'll donate in your name and send you a confirmation." },
  { icon: "🏪", title: "Local Business", body: "Redeem at a local partner near you — show your PIN in store." },
];

const FAQS = [
  {
    q: "How do I share my link?",
    a: "Your dentist will give you a QR card or send you a personal link by text or email.",
  },
  {
    q: "When do I get my reward?",
    a: "Within minutes of your friend completing their exam — automatically.",
  },
  {
    q: "Is there a limit?",
    a: "No limit — refer as many friends as you want and keep earning.",
  },
  {
    q: "Who can I refer?",
    a: "Anyone who is not already a patient at your dental practice.",
  },
  {
    q: "Do I need to create an account?",
    a: "No account needed — your reward arrives by email or text.",
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
      {open && (
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">{a}</p>
      )}
    </button>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0 },
};

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-[#0a1628]">
      <div className="max-w-md mx-auto px-5 pb-16">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="pt-10 pb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-600/30">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl">Rippl</span>
          </div>
          <h1 className="text-3xl font-black text-white leading-tight mb-3">
            Refer friends.<br />Earn rewards.
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Share your unique link with friends and family. When they complete their dental exam, you earn a reward — automatically.
          </p>
        </div>

        {/* ── How it works — 3 steps ───────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          transition={{ staggerChildren: 0.1 }}
          className="mb-10"
        >
          <h2 className="text-lg font-bold text-white mb-4 text-center">How it works</h2>
          <div className="space-y-3">
            {STEPS.map((step, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="flex items-start gap-4 bg-slate-800/50 border border-slate-700 rounded-2xl p-4"
              >
                <div className="w-11 h-11 rounded-xl bg-slate-700/60 flex items-center justify-center text-2xl shrink-0">
                  {step.emoji}
                </div>
                <div>
                  <p className="text-white font-bold text-sm mb-0.5">
                    <span className="text-teal-500 mr-1.5">Step {i + 1}.</span>
                    {step.title}
                  </p>
                  <p className="text-slate-400 text-sm leading-relaxed">{step.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── Reward tiers ─────────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          transition={{ staggerChildren: 0.08 }}
          className="mb-10"
        >
          <h2 className="text-lg font-bold text-white mb-1 text-center">
            The more you refer, the bigger your reward
          </h2>
          <p className="text-slate-500 text-sm text-center mb-4">Tiers unlock automatically as you refer more friends</p>
          <div className="grid grid-cols-2 gap-3">
            {TIERS.map((tier) => (
              <motion.div
                key={tier.name}
                variants={fadeUp}
                className={cn(
                  "rounded-2xl p-4 border text-center",
                  tier.bg, tier.border,
                )}
              >
                <div className="text-3xl mb-1">{tier.emoji}</div>
                <p className={cn("font-bold text-sm leading-tight", tier.color)}>{tier.label}</p>
                <p className="text-slate-400 text-xs mt-1">{tier.referrals}</p>
                <p className={cn("font-black text-lg mt-1.5", tier.color)}>{tier.reward}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── Reward options ───────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          transition={{ staggerChildren: 0.08 }}
          className="mb-10"
        >
          <h2 className="text-lg font-bold text-white mb-4 text-center">Choose your reward</h2>
          <div className="grid grid-cols-2 gap-3">
            {REWARD_OPTIONS.map((opt) => (
              <motion.div
                key={opt.title}
                variants={fadeUp}
                className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-center"
              >
                <div className="text-3xl mb-2">{opt.icon}</div>
                <p className="text-white font-bold text-sm mb-1">{opt.title}</p>
                <p className="text-slate-400 text-xs leading-relaxed">{opt.body}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mb-10"
        >
          <h2 className="text-lg font-bold text-white mb-4 text-center">Frequently asked questions</h2>
          <div className="space-y-2">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </motion.section>

        {/* ── Footer CTA ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-teal-900/50 to-slate-800/50 border border-teal-700/30 rounded-3xl p-6 text-center"
        >
          <div className="text-3xl mb-3">🌊</div>
          <h3 className="text-white font-bold text-lg mb-2">Your referral link is ready</h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">
            Ask your dentist for your personal link at your next visit, or check your email from Hallmark Dental.
          </p>
          <a
            href="https://www.hallmarkdds.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-teal-400 text-sm font-semibold hover:text-teal-300 transition-colors"
          >
            Not a patient yet? Book your first visit →
          </a>
        </motion.div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Powered by Rippl · Referral Program Terms Apply
        </p>
      </div>
    </div>
  );
}
