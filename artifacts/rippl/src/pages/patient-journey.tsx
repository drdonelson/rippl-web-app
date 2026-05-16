import { Link } from "wouter";
import { ArrowLeft, ExternalLink, Eye } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

const APP_URL = "https://www.joinrippl.com";
const DEMO_TOKEN = "demo-claim-preview-token-screenshot";

function StepNum({ n }: { n: number }) {
  return (
    <div className="w-8 h-8 rounded-full bg-[#E0622A]/10 border border-[#E0622A]/20 flex items-center justify-center shrink-0">
      <span className="text-[#E0622A] font-bold text-xs font-mono">{String(n).padStart(2, "0")}</span>
    </div>
  );
}

function Badge({ label, blue }: { label: string; blue?: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border",
      blue
        ? "bg-blue-50 text-blue-600 border-blue-100"
        : "bg-orange-50 text-orange-600 border-orange-100",
    )}>
      {label}
    </span>
  );
}

function SmsMockup() {
  return (
    <div className="bg-slate-100 rounded-xl p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">✓</span>
        </div>
        <span className="text-xs font-semibold text-slate-500">+1 (615) 882-4095 · Rippl</span>
      </div>
      <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 max-w-xs shadow-sm">
        <p className="text-sm text-slate-800 leading-relaxed">
          Hi <span className="font-semibold">Sarah</span>, your referred patient completed their
          first visit at Hallmark Dental! Click to claim your reward:{" "}
          <span className="text-[#E0622A] font-medium break-all">joinrippl.com/claim?token=…</span>
        </p>
      </div>
      <p className="text-[10px] text-slate-400 mt-2 ml-1">Fires within seconds of R0150 detection in Open Dental</p>
    </div>
  );
}

function EmailMockup() {
  return (
    <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      {/* Browser chrome */}
      <div className="bg-slate-700 px-3 py-2 flex items-center gap-2">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <div className="w-2 h-2 rounded-full bg-yellow-400" />
          <div className="w-2 h-2 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-slate-600 rounded px-2 py-0.5">
          <p className="text-[10px] text-slate-300 truncate">You've earned a reward 🎁 — Hallmark Dental</p>
        </div>
      </div>
      {/* Email body — matches new warm orange design */}
      <div className="bg-[#f5f5f5] px-4 py-4">
        <div className="bg-white rounded-xl overflow-hidden border border-slate-100">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="font-bold text-[#E0622A] text-base tracking-wide">Rippl</span>
            <span className="text-[10px] text-slate-400 font-medium">Hallmark Dental</span>
          </div>
          {/* Hero gradient */}
          <div className="text-center py-5 px-4" style={{ background: "linear-gradient(135deg, #F5A623, #E0622A)" }}>
            <p className="text-white/85 text-xs font-medium mb-1">Hey Sarah —</p>
            <p className="text-white/75 text-xs italic mb-3">You've earned it.</p>
            <p className="text-white font-bold leading-none mb-1" style={{ fontSize: 44, fontFamily: "Georgia, serif" }}>$35</p>
            <p className="text-white/85 text-xs font-medium">reward for you</p>
          </div>
          {/* Trigger */}
          <p className="text-center text-xs text-slate-500 px-4 pt-3 pb-2 leading-relaxed">
            <strong className="text-slate-800">James Wilson</strong> just completed their first visit.<br />
            Choose your reward below.
          </p>
          {/* Reward cards */}
          <div className="grid grid-cols-3 gap-1.5 px-3 pb-3">
            {[
              { emoji: "💎", amount: "$100", label: "Account Credit", highlight: true },
              { emoji: "🎁",  amount: "$35",  label: "Gift Card",      highlight: false },
              { emoji: "❤️",  amount: "$35",  label: "Charity",        highlight: false },
            ].map((r) => (
              <div
                key={r.label}
                className={cn(
                  "rounded-lg p-2.5 text-center border-2",
                  r.highlight ? "bg-orange-50 border-[#E0622A]" : "bg-slate-50 border-slate-200",
                )}
              >
                <p className="text-base mb-1">{r.emoji}</p>
                <p className="text-[#E0622A] font-bold text-sm">{r.amount}</p>
                <p className="text-slate-700 text-[9px] font-semibold leading-tight mt-0.5">{r.label}</p>
              </div>
            ))}
          </div>
          {/* CTA */}
          <div className="px-4 pb-4 text-center">
            <div className="inline-block bg-[#E0622A] text-white text-xs font-bold px-5 py-2 rounded-full">
              Claim My Reward →
            </div>
          </div>
          {/* Footer */}
          <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 text-center">
            <p className="text-[10px] text-slate-400">
              Sent with <span className="text-[#E0622A] font-semibold">Rippl</span> by Hallmark Dental
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GiftCardMockup() {
  return (
    <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      {/* Browser chrome */}
      <div className="bg-slate-700 px-3 py-2 flex items-center gap-2">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <div className="w-2 h-2 rounded-full bg-yellow-400" />
          <div className="w-2 h-2 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-slate-600 rounded px-2 py-0.5">
          <p className="text-[10px] text-slate-300 truncate">Your $35 Amazon Gift Card — Tango Card</p>
        </div>
      </div>
      <div className="bg-[#f5f5f5] px-4 py-4">
        <div className="bg-white rounded-xl overflow-hidden border border-slate-100">
          {/* Header */}
          <div className="bg-[#232F3E] px-4 py-3 text-center">
            <p className="text-[#FF9900] font-bold text-base tracking-tight">amazon</p>
          </div>
          {/* Body */}
          <div className="px-5 py-5 text-center">
            <p className="text-slate-400 text-[10px] uppercase tracking-widest font-semibold mb-1">Gift Card</p>
            <p className="text-slate-900 font-bold text-2xl mb-0.5">$35.00</p>
            <p className="text-slate-400 text-xs mb-4">From: Hallmark Dental via Rippl</p>
            {/* Mock gift card */}
            <div className="bg-gradient-to-br from-[#232F3E] to-[#374151] rounded-xl p-4 mb-4 text-left">
              <p className="text-[#FF9900] font-bold text-sm mb-3">amazon</p>
              <div className="bg-white/10 rounded-lg px-3 py-2 mb-2">
                <p className="text-white/50 text-[9px] uppercase tracking-wider mb-0.5">Claim Code</p>
                <p className="text-white font-mono font-bold text-sm tracking-widest">XXXX-XXXXXX-XXXX</p>
              </div>
              <p className="text-white/50 text-[10px] text-right mt-2">Balance: $35.00</p>
            </div>
            <div className="inline-block bg-[#FF9900] text-white text-xs font-bold px-5 py-2 rounded-full">
              Redeem at amazon.com →
            </div>
          </div>
          {/* Footer */}
          <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 text-center">
            <p className="text-[10px] text-slate-400">
              Delivered by <span className="font-semibold text-slate-600">Tango Card</span> · on behalf of Hallmark Dental
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  {
    n: 1,
    title: "How It Works",
    audience: "Existing patient",
    blue: true,
    timing: "Before they refer — walk them through the program",
    description:
      "A page your enrolled patient visits to understand the referral program. Shows the 3-step flow, all four reward tiers ($35–$100), and the redemption options. Share this link at the front desk, on a QR card, or via text.",
    href: `${APP_URL}/how-it-works`,
    linkLabel: "Preview How It Works",
    emoji: "📖",
  },
  {
    n: 2,
    title: "Referral Link",
    audience: "New patient (the friend)",
    blue: false,
    timing: "When the friend clicks the shared link",
    description:
      "The landing page a prospective patient sees when they click a referral link. Shows the referring patient's name and practice info. One clear call to action: book their first visit.",
    href: `${APP_URL}/refer?ref=DEMO`,
    linkLabel: "Preview Refer Page",
    emoji: "🔗",
  },
  {
    n: 3,
    title: "SMS Notification",
    audience: "Existing patient",
    blue: true,
    timing: "Within seconds of referral completing (fully automatic)",
    description:
      "Fired the moment Open Dental detects a completed first visit via the R0150 procedure code. No front desk action required — the patient gets their claim link by text.",
    mockup: "sms" as const,
    emoji: "💬",
  },
  {
    n: 4,
    title: "Email Notification",
    audience: "Existing patient",
    blue: true,
    timing: "Same moment as SMS",
    description:
      "A branded reward email sent simultaneously. Orange gradient design with the reward amount and three redemption choices. Patient clicks directly from their inbox.",
    mockup: "email" as const,
    emoji: "✉️",
  },
  {
    n: 5,
    title: "Claim Page",
    audience: "Existing patient",
    blue: true,
    timing: "When they click the link in the SMS or email",
    description:
      "The reward experience. The patient's reward amount animates in, they pick gift card / dental credit / charity, and it's fulfilled instantly. No login, no forms, no waiting.",
    href: `${APP_URL}/claim?token=${DEMO_TOKEN}`,
    linkLabel: "Preview Claim Page",
    emoji: "🎁",
  },
  {
    n: 6,
    title: "Gift Card Delivery",
    audience: "Existing patient",
    blue: true,
    timing: "Within minutes of choosing gift card (if selected)",
    description:
      "If the patient picks a gift card, Tango Card sends this email automatically with their Amazon, Visa, Target, or Starbucks gift card. No manual fulfillment — delivered directly to their inbox.",
    mockup: "giftcard" as const,
    emoji: "🛍️",
  },
];

export default function PatientJourney() {
  const { profile, isDemo } = useAuth();

  if (!isDemo && profile?.role !== "super_admin") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-slate-400 text-sm">Access denied.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm mb-8 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Dashboard
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-slate-900">Patient Journey</h1>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E0622A]/10 text-[#E0622A] border border-[#E0622A]/20">
            demo tool
          </span>
        </div>
        <p className="text-sm text-slate-400">
          Every touchpoint a patient sees — in the exact order it happens.
        </p>
      </div>

      <div className="space-y-4">
        {STEPS.map((step, i) => (
          <div key={step.n} className="relative">
            {i < STEPS.length - 1 && (
              <div className="absolute left-[18px] top-[52px] bottom-[-16px] w-px bg-slate-200 z-0" />
            )}

            <div className="relative bg-white border border-slate-200 rounded-2xl p-5 shadow-sm z-10">
              <div className="flex items-start gap-3 mb-3">
                <StepNum n={step.n} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <h2 className="text-sm font-bold text-slate-900">{step.title}</h2>
                    <Badge label={step.audience} blue={step.blue} />
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">{step.timing}</p>
                </div>
                <span className="text-xl shrink-0 mt-0.5">{step.emoji}</span>
              </div>

              <p className="text-sm text-slate-500 leading-relaxed ml-11 mb-3">
                {step.description}
              </p>

              <div className="ml-11">
                {step.mockup === "sms"      && <SmsMockup />}
                {step.mockup === "email"    && <EmailMockup />}
                {step.mockup === "giftcard" && <GiftCardMockup />}
                {"href" in step && step.href && (
                  <a
                    href={step.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E0622A] hover:text-[#C9551E] transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {step.linkLabel}
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        <p className="text-xs text-slate-400 leading-relaxed">
          Steps 3–5 are fully automatic — no staff action required after a referral completes.
          The only human touch in this flow is sharing the referral link with an existing patient.
        </p>
      </div>
    </div>
  );
}
