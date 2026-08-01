import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useRoute } from "wouter";
import { cn } from "@/lib/utils";
import { TIER_CONFIG } from "@/lib/tier-config";

// ── Dental content ─────────────────────────────────────────────────────────────

const STEPS_DENTAL = [
  {
    emoji: "🔗",
    title: "Share Your Link",
    body: "Share your personal referral link with anyone looking for a great dentist.",
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

const TIERS_DENTAL = [
  { ...TIER_CONFIG[0], referrals: "1st referral", reward: "$35 reward" },
  { ...TIER_CONFIG[1], referrals: "3+ referrals", reward: "$50 reward" },
  { ...TIER_CONFIG[2], referrals: "6+ referrals", reward: "$75 reward" },
  { ...TIER_CONFIG[3], referrals: "10+ referrals", reward: "$100 reward" },
];

const REWARD_OPTIONS_DENTAL = [
  { icon: "🎁", title: "Gift Card", body: "Amazon, Visa, Target, or Starbucks — delivered instantly to your email." },
  { icon: "🦷", title: "Dental Credit", body: "$100 toward any treatment, applied to your account within 24 hours." },
  { icon: "❤️", title: "Charity Donation", body: "We'll donate in your name and send you a confirmation." },
  { icon: "🏪", title: "Local Business", body: "Redeem at a local partner near you — show your PIN in store." },
];

const FAQS_DENTAL = [
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

// ── Automotive content ─────────────────────────────────────────────────────────

const STEPS_AUTO = [
  {
    emoji: "🔗",
    title: "Share Your Link",
    body: "Share your personal referral link with anyone in the market for a new or used vehicle.",
  },
  {
    emoji: "🚗",
    title: "They Visit & Buy",
    body: "Your friend visits the dealership and completes their vehicle purchase.",
  },
  {
    emoji: "🎁",
    title: "You Earn a Reward",
    body: "You automatically receive a reward — no paperwork, no waiting, no phone calls needed.",
  },
];

const REWARD_OPTIONS_AUTO = [
  { icon: "🎁", title: "Gift Card", body: "Amazon, Visa, Target, or Starbucks — delivered instantly to your email." },
  { icon: "❤️", title: "Charity Donation", body: "We'll donate in your name and send you a confirmation." },
  { icon: "🏪", title: "Local Business", body: "Redeem at a local partner near you — show your PIN in store." },
];

const FAQS_AUTO = [
  {
    q: "How do I share my link?",
    a: "Your dealership will send you a personal referral link by text or email.",
  },
  {
    q: "When do I get my reward?",
    a: "Within 24 hours of your friend's vehicle purchase completing — automatically.",
  },
  {
    q: "Is there a limit?",
    a: "No limit — refer as many friends as you want and keep earning.",
  },
  {
    q: "Who can I refer?",
    a: "Anyone who hasn't recently purchased from the dealership.",
  },
  {
    q: "Do I need to create an account?",
    a: "No account needed — your reward arrives by email or text.",
  },
];

// ── Shared components ──────────────────────────────────────────────────────────

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
      {open && (
        <p className="text-slate-500 text-sm mt-2 leading-relaxed">{a}</p>
      )}
    </button>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0 },
};

// ── Pages ──────────────────────────────────────────────────────────────────────

function HowItWorksDental() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-12 pb-16">

        <div className="pb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="font-display font-bold text-lg"><span className="text-[#E0622A]">rip</span><span className="text-[#E0622A]">pl</span></span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-3">
            Refer friends.<br />Earn rewards.
          </h1>
          <p className="text-slate-500 text-base leading-relaxed max-w-xl mx-auto">
            Share your unique link with friends and family. When they complete their dental exam, you earn a reward — automatically.
          </p>
        </div>

        <motion.section
          initial="hidden" animate="show"
          transition={{ staggerChildren: 0.1 }}
          className="mb-10 md:mb-14"
        >
          <h2 className="text-lg font-bold text-slate-800 mb-4 text-center">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
            {STEPS_DENTAL.map((step, i) => (
              <motion.div key={i} variants={fadeUp} className="flex items-start gap-4 bg-white border border-slate-200 rounded-2xl p-4 md:p-5">
                <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-2xl shrink-0">{step.emoji}</div>
                <div>
                  <p className="text-slate-800 font-bold text-sm mb-0.5">
                    <span className="text-[#E0622A] mr-1.5">Step {i + 1}.</span>
                    {step.title}
                  </p>
                  <p className="text-slate-500 text-sm leading-relaxed">{step.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial="hidden" animate="show"
          transition={{ staggerChildren: 0.08 }}
          className="mb-10 md:mb-14"
        >
          <h2 className="text-lg font-bold text-slate-800 mb-1 text-center">The more you refer, the bigger your reward</h2>
          <p className="text-slate-400 text-sm text-center mb-4">Tiers unlock automatically as you refer more friends</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {TIERS_DENTAL.map((tier) => (
              <motion.div key={tier.name} variants={fadeUp} className={cn("rounded-2xl p-4 md:p-5 border flex items-center gap-4", tier.bg, tier.border)}>
                <img src={tier.icon} alt={tier.label} className="w-10 h-10 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className={cn("font-bold text-sm leading-tight", tier.color)}>{tier.label}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{tier.referrals}</p>
                </div>
                <p className={cn("font-black text-xl shrink-0", tier.color)}>{tier.reward}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial="hidden" animate="show"
          transition={{ staggerChildren: 0.08 }}
          className="mb-10 md:mb-14"
        >
          <h2 className="text-lg font-bold text-slate-800 mb-4 text-center">Choose your reward</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {REWARD_OPTIONS_DENTAL.map((opt) => (
              <motion.div key={opt.title} variants={fadeUp} className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 flex items-start gap-4">
                <div className="text-3xl shrink-0">{opt.icon}</div>
                <div>
                  <p className="text-slate-800 font-bold text-sm mb-1">{opt.title}</p>
                  <p className="text-slate-500 text-xs leading-relaxed">{opt.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section initial="hidden" animate="show" className="mb-10 md:mb-14">
          <h2 className="text-lg font-bold text-slate-800 mb-4 text-center">Frequently asked questions</h2>
          <div className="space-y-2">
            {FAQS_DENTAL.map((faq) => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-orange-50 to-slate-50 border border-orange-200 rounded-3xl p-6 md:p-8 text-center"
        >
          <span className="font-display font-bold text-lg block mb-3"><span className="text-[#E0622A]">rip</span><span className="text-[#E0622A]">pl</span></span>
          <h3 className="text-slate-800 font-bold text-lg mb-2">Your referral link is ready</h3>
          <p className="text-slate-500 text-sm leading-relaxed mb-4 max-w-md mx-auto">
            Ask your dentist for your personal link at your next visit, or check your email from your dental practice.
          </p>
        </motion.div>

        <p className="text-center text-xs text-slate-400 mt-6">Powered by Rippl · Referral Program Terms Apply</p>
      </div>
    </div>
  );
}

function HowItWorksAuto() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-12 pb-16">

        <div className="pb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="font-display font-bold text-lg"><span className="text-[#E0622A]">rip</span><span className="text-[#E0622A]">pl</span></span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-3">
            Refer a friend.<br />Earn a reward.
          </h1>
          <p className="text-slate-500 text-base leading-relaxed max-w-xl mx-auto">
            Share your personal referral link. When your friend buys a vehicle at the dealership, you automatically receive a reward — no paperwork, no waiting.
          </p>
        </div>

        <motion.section
          initial="hidden" animate="show"
          transition={{ staggerChildren: 0.1 }}
          className="mb-10 md:mb-14"
        >
          <h2 className="text-lg font-bold text-slate-800 mb-4 text-center">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
            {STEPS_AUTO.map((step, i) => (
              <motion.div key={i} variants={fadeUp} className="flex items-start gap-4 bg-white border border-slate-200 rounded-2xl p-4 md:p-5">
                <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-2xl shrink-0">{step.emoji}</div>
                <div>
                  <p className="text-slate-800 font-bold text-sm mb-0.5">
                    <span className="text-[#E0622A] mr-1.5">Step {i + 1}.</span>
                    {step.title}
                  </p>
                  <p className="text-slate-500 text-sm leading-relaxed">{step.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Reward highlight — flat rate for automotive */}
        <motion.section
          initial="hidden" animate="show"
          transition={{ staggerChildren: 0.08 }}
          className="mb-10 md:mb-14"
        >
          <h2 className="text-lg font-bold text-slate-800 mb-1 text-center">Your reward</h2>
          <p className="text-slate-400 text-sm text-center mb-4">Every successful referral earns you a reward — automatically</p>
          <motion.div
            variants={fadeUp}
            className="rounded-2xl p-6 md:p-8 border border-orange-200 bg-gradient-to-br from-orange-50 to-slate-50 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#E0622A]/10 flex items-center justify-center text-4xl shrink-0">🎁</div>
            <div className="flex-1">
              <p className="text-slate-800 font-bold text-lg mb-1">$100 Gift Card</p>
              <p className="text-slate-500 text-sm leading-relaxed">
                Every time a friend you refer completes a vehicle purchase, you earn a $100 gift card — delivered instantly to your email. No waiting, no forms.
              </p>
            </div>
            <p className="text-[#E0622A] font-black text-4xl shrink-0">$100</p>
          </motion.div>
        </motion.section>

        <motion.section
          initial="hidden" animate="show"
          transition={{ staggerChildren: 0.08 }}
          className="mb-10 md:mb-14"
        >
          <h2 className="text-lg font-bold text-slate-800 mb-4 text-center">Choose your reward</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {REWARD_OPTIONS_AUTO.map((opt) => (
              <motion.div key={opt.title} variants={fadeUp} className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 flex items-start gap-4">
                <div className="text-3xl shrink-0">{opt.icon}</div>
                <div>
                  <p className="text-slate-800 font-bold text-sm mb-1">{opt.title}</p>
                  <p className="text-slate-500 text-xs leading-relaxed">{opt.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section initial="hidden" animate="show" className="mb-10 md:mb-14">
          <h2 className="text-lg font-bold text-slate-800 mb-4 text-center">Frequently asked questions</h2>
          <div className="space-y-2">
            {FAQS_AUTO.map((faq) => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-orange-50 to-slate-50 border border-orange-200 rounded-3xl p-6 md:p-8 text-center"
        >
          <span className="font-display font-bold text-lg block mb-3"><span className="text-[#E0622A]">rip</span><span className="text-[#E0622A]">pl</span></span>
          <h3 className="text-slate-800 font-bold text-lg mb-2">Your referral link is ready</h3>
          <p className="text-slate-500 text-sm leading-relaxed mb-4 max-w-md mx-auto">
            Check your text or email from your dealership — your personal referral link is waiting for you.
          </p>
        </motion.div>

        <p className="text-center text-xs text-slate-400 mt-6">Powered by Rippl · Referral Program Terms Apply</p>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  const [matchAuto] = useRoute("/how-it-works/automotive");
  return matchAuto ? <HowItWorksAuto /> : <HowItWorksDental />;
}
