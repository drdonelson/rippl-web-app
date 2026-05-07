import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import { CheckCircle2, Loader2, AlertTriangle, Clock, Gift, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTierConfig, getProgressMessage, TIER_CONFIG } from "@/lib/tier-config";

function useCountUp(target: number, duration = 0.9) {
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const ctrl = animate(mv, target, { duration, ease: "easeOut" });
    const unsub = mv.on("change", v => setDisplay(Math.round(v)));
    return () => { ctrl.stop(); unsub(); };
  }, [target, duration]);
  return display;
}

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const PUBLIC_APP_URL = "https://www.joinrippl.com";

type Phase = "loading" | "invalid" | "expired" | "already_claimed" | "selecting" | "confirming" | "success";

type RewardType = "gift-card" | "local-partner" | "in-house-credit" | "charity";

const GIFT_CARD_BRANDS = ["Amazon", "Visa Prepaid", "Target", "Starbucks"] as const;

interface ClaimData {
  claim: {
    id: string;
    reward_value: number;
    expires_at: string | null;
    claimed_at: string | null;
    status: string;
  };
  referrer: {
    id: string;
    name: string;
    tier: string | null;
    total_referrals: number;
    reward_value: number;
    referral_code: string;
  };
  referral: {
    id: string;
    new_patient_name: string;
    office: string | null;
    office_id: string | null;
    office_logo_url: string | null;
  };
  localPartner: {
    id: string;
    business_name: string;
    category: string;
    address: string | null;
  } | null;
}

interface ClaimResult {
  success: boolean;
  reward_type: RewardType;
  reward_value: number;
  pin_code: string | null;
  tango_order_id: string | null;
  admin_task_created: boolean;
  gift_card_brand: string | null;
  referral_code: string;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// ── Error screen ──────────────────────────────────────────────────────────────
function ErrorCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5">
      <div className="max-w-sm w-full bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-md">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 bg-slate-100">
          {icon}
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
        <p className="text-slate-500 text-sm leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

// ── Tier badge pill ────────────────────────────────────────────────────────────
function TierPill({ tierName }: { tierName: string | null }) {
  const cfg = getTierConfig(tierName);
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border",
      cfg.color, cfg.bg, cfg.border,
    )}>
      <img src={cfg.icon} alt={cfg.label} className="w-4 h-4" /> {cfg.label}
    </span>
  );
}

// ── Reward option card ─────────────────────────────────────────────────────────
function RewardCard({
  isSelected,
  onSelect,
  disabled,
  badge,
  badgeColor,
  icon,
  title,
  subtitle,
  detail,
  children,
}: {
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  badge?: string;
  badgeColor?: "orange" | "amber";
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  detail: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("relative", badge && "mt-5")}>
      {/* Badge floats above the card border */}
      {badge && (
        <span className={cn(
          "absolute -top-3 right-4 z-10 text-[10px] font-bold uppercase tracking-wider px-2.5 py-[5px] rounded-full leading-none pointer-events-none",
          badgeColor === "amber"
            ? "bg-amber-100 text-amber-700 border border-amber-200"
            : "bg-orange-100 text-[#E0622A] border border-orange-200",
        )}>
          {badge}
        </span>
      )}

      <button
        onClick={onSelect}
        disabled={disabled}
        className={cn(
          "w-full text-left rounded-2xl p-4 border transition-all duration-200 relative overflow-hidden",
          "disabled:cursor-not-allowed",
          isSelected
            ? "bg-orange-50 border-[#E0622A] shadow-lg shadow-[#E0622A]/10"
            : "bg-white border-slate-200 hover:border-slate-300 active:scale-[0.99]",
        )}
      >
        <div className="flex items-start gap-4 pr-16">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 mt-0.5",
            isSelected ? "bg-orange-100" : "bg-slate-100",
          )}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-slate-900 leading-tight">{title}</p>
            <p className="text-[#E0622A] text-sm font-medium mt-0.5">{subtitle}</p>
            <p className="text-slate-500 text-xs mt-1 leading-relaxed">{detail}</p>
            {children}
          </div>
        </div>

        <div className={cn(
          "absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 mt-3",
          isSelected ? "bg-[#E0622A] border-[#E0622A]" : "border-slate-300",
        )}>
          {isSelected && (
            <svg viewBox="0 0 20 20" fill="white" className="w-full h-full p-0.5">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </button>
    </div>
  );
}

// ── Tier progress bar ─────────────────────────────────────────────────────────
function TierProgressBar({ tierName, totalReferrals }: { tierName: string | null; totalReferrals: number }) {
  const cfg = getTierConfig(tierName);
  if (!cfg.nextTierAt) {
    return (
      <div className="text-center">
        <p className="text-purple-400 text-sm font-semibold">You've reached Legend status!</p>
      </div>
    );
  }
  const pct = Math.min(100, Math.round(
    ((totalReferrals - cfg.minReferrals) / (cfg.nextTierAt - cfg.minReferrals)) * 100
  ));
  const nextCfg = TIER_CONFIG.find(t => t.label === cfg.nextTierLabel);

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-slate-400">
        <span className={cn("inline-flex items-center gap-1 font-semibold", cfg.color)}>
          <img src={cfg.icon} alt={cfg.label} className="w-4 h-4" /> {cfg.label}
        </span>
        <span className={cn("inline-flex items-center gap-1 font-semibold", nextCfg?.color)}>
          {nextCfg && <img src={nextCfg.icon} alt={cfg.nextTierLabel ?? ''} className="w-4 h-4" />} {cfg.nextTierLabel}
        </span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className={cn("h-full rounded-full", cfg.progressBg)}
        />
      </div>
      <p className="text-center text-xs text-slate-400">
        {totalReferrals} of {cfg.nextTierAt} referrals to {cfg.nextTierLabel}
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Claim() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const [phase, setPhase]             = useState<Phase>("loading");
  const [claimData, setClaimData]     = useState<ClaimData | null>(null);
  const [errorDetail, setErrorDetail] = useState<{ expiresAt?: string; claimedAt?: string } | null>(null);
  const [selected, setSelected]       = useState<RewardType | null>(null);
  const [brand, setBrand]             = useState<string>("Amazon");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult]           = useState<ClaimResult | null>(null);
  const [copied, setCopied]           = useState(false);
  const animatedReward = useCountUp(claimData?.claim?.reward_value ?? 0);

  useEffect(() => {
    if (!token) { setPhase("invalid"); return; }

    fetch(`${BASE}/api/claim/by-token/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (res.status === 404) { setPhase("invalid"); return; }
        if (res.status === 410) { setErrorDetail({ expiresAt: body.expiresAt }); setPhase("expired"); return; }
        if (res.status === 409) { setErrorDetail({ claimedAt: body.claimedAt }); setPhase("already_claimed"); return; }
        if (!res.ok) { setPhase("invalid"); return; }
        setClaimData(body);
        setPhase("selecting");
      })
      .catch(() => setPhase("invalid"));
  }, [token]);

  const handleConfirm = useCallback(async () => {
    if (!selected || !claimData) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${BASE}/api/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, reward_type: selected, gift_card_brand: brand }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) { setErrorDetail({ claimedAt: data.claimedAt }); setPhase("already_claimed"); return; }
      if (!res.ok) { setSubmitError(data.error ?? "Something went wrong. Please try again."); return; }
      setResult({ ...data, referral_code: claimData.referrer.referral_code });
      setPhase("success");
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [selected, claimData, token, brand]);

  const handleShare = useCallback(() => {
    const code = result?.referral_code ?? claimData?.referrer.referral_code ?? "";
    const url  = `${PUBLIC_APP_URL}/refer?ref=${code}`;
    const subject = encodeURIComponent("I think you'd love my dentist");
    const body    = encodeURIComponent(
      `Hey! I've been going to Hallmark Dental and wanted to share my referral link with you. Book your first visit here: ${url} — they're great and it only takes a minute to book online.`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }, [result, claimData]);

  const handleCopy = useCallback(async () => {
    const code = result?.referral_code ?? claimData?.referrer.referral_code ?? "";
    const url  = `${PUBLIC_APP_URL}/refer?ref=${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback — ignore
    }
  }, [result, claimData]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#E0622A] animate-spin" />
      </div>
    );
  }

  // ── Error states ──────────────────────────────────────────────────────────
  if (phase === "invalid") {
    return (
      <ErrorCard
        icon={<Gift className="w-8 h-8 text-slate-400" />}
        title="Invalid Reward Link"
        body="This reward link is invalid or has expired. Please contact your dental practice for assistance."
      />
    );
  }

  if (phase === "expired") {
    return (
      <ErrorCard
        icon={<Clock className="w-8 h-8 text-orange-400" />}
        title="Reward Expired"
        body={errorDetail?.expiresAt
          ? `This reward expired on ${formatDate(errorDetail.expiresAt)}.`
          : "This reward link has expired."}
      />
    );
  }

  if (phase === "already_claimed") {
    return (
      <ErrorCard
        icon={<CheckCircle2 className="w-8 h-8 text-[#E0622A]" />}
        title="Already Claimed"
        body={errorDetail?.claimedAt
          ? `This reward was already claimed on ${formatDate(errorDetail.claimedAt)}.`
          : "This reward has already been claimed."}
      />
    );
  }

  if (!claimData) return null;

  const { referrer, referral, localPartner, claim } = claimData;
  const rawFirst    = referrer.name.split(" ")[0] ?? referrer.name;
  const firstName   = (!rawFirst || rawFirst === "###") ? "there" : rawFirst;
  const rewardValue = claim.reward_value;
  const OFFICE_NAMES: Record<string, string> = {
    brentwood:  "Hallmark Dental – Brentwood",
    lewisburg:  "Hallmark Dental – Lewisburg",
    greenbrier: "Hallmark Dental – Greenbrier",
  };
  const office = OFFICE_NAMES[referral?.office ?? ""] ?? referral?.office ?? "Hallmark Dental";

  // ── Success ───────────────────────────────────────────────────────────────
  if (phase === "success" && result) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #F5A623 0%, #E8842A 100%)" }}>
        {/* Hero */}
        <div className="px-5 pt-10 pb-20 text-white text-center">
          <div className="flex items-center justify-center gap-2 mb-8">
            {claimData?.referral?.office_logo_url ? (
              <img src={claimData.referral.office_logo_url} alt="Practice logo" className="h-8 max-w-[120px] object-contain brightness-0 invert" />
            ) : (
              <span className="font-display font-bold text-2xl">
                <span className="text-white/70">rip</span><span className="text-white">pl</span>
              </span>
            )}
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12, delay: 0.1 }}
            className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle2 className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-3xl font-bold text-white mb-1">Reward Claimed!</h2>
          <p className="text-white/80 text-base">Thank you for being a loyal patient, {firstName}.</p>
        </div>

        {/* White card */}
        <div className="bg-white rounded-t-3xl -mt-12 flex-1 px-5 pt-6 pb-10 max-w-md mx-auto w-full">
          {/* Reward-specific message */}
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 mb-5 text-left">
            {result.reward_type === "local-partner" && result.pin_code ? (
              <>
                <p className="text-4xl font-black text-[#E0622A] tracking-[0.2em] text-center py-2 font-mono">
                  {result.pin_code}
                </p>
                <p className="text-slate-500 text-xs text-center mt-2">
                  Show this PIN at {localPartner?.business_name ?? "the store"} to redeem.
                </p>
              </>
            ) : result.reward_type === "gift-card" ? (
              <>
                <p className="text-slate-900 font-semibold mb-1">🎁 {result.tango_order_id ? "Gift card on its way!" : "Request received!"}</p>
                <p className="text-slate-500 text-sm">
                  {result.tango_order_id
                    ? `Your ${result.gift_card_brand ?? "Amazon"} gift card is on its way! Check your email — it usually arrives within a few minutes.`
                    : "Your gift card request has been received — we'll email it to you within 24 hours."}
                </p>
              </>
            ) : result.reward_type === "in-house-credit" ? (
              <>
                <p className="text-slate-900 font-semibold mb-1">🦷 Credit incoming!</p>
                <p className="text-slate-500 text-sm">
                  Your $100 dental credit will be applied to your account within 24 hours. You'll see it at your next appointment.
                </p>
              </>
            ) : (
              <>
                <p className="text-slate-900 font-semibold mb-1">❤️ Donation confirmed!</p>
                <p className="text-slate-500 text-sm">
                  We'll make a ${result.reward_value} donation in your name and send you a confirmation email.
                </p>
              </>
            )}
          </div>

          {/* Tier progress */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-5">
            <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-3 text-center">Your Referral Progress</p>
            <TierProgressBar tierName={referrer.tier} totalReferrals={referrer.total_referrals} />
          </div>

          {/* Share CTAs */}
          <button
            onClick={handleShare}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all mb-2 bg-[#E0622A] text-white hover:bg-[#C9551E]"
          >
            📤 Share with a friend
          </button>
          <button
            onClick={handleCopy}
            className={cn(
              "w-full py-2.5 rounded-2xl font-semibold text-sm transition-all",
              copied
                ? "bg-orange-50 border border-orange-200 text-[#E0622A]"
                : "bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300",
            )}
          >
            {copied ? "✓ Link Copied!" : "Or copy referral link"}
          </button>
        </div>
      </div>
    );
  }

  // ── Confirmation ──────────────────────────────────────────────────────────
  if (phase === "confirming" && selected) {
    const labels: Record<RewardType, { icon: string; name: string; value: string; detail: string }> = {
      "gift-card":       { icon: "🎁", name: `${brand} Gift Card`, value: `$${rewardValue}`, detail: "Delivered to your email" },
      "local-partner":   { icon: "🏪", name: localPartner?.business_name ?? "Local Partner", value: `$${rewardValue}`, detail: "Show PIN in store to redeem" },
      "in-house-credit": { icon: "🦷", name: "Dental Account Credit", value: "$100", detail: "Applied within 24 hours" },
      "charity":         { icon: "❤️", name: "Charitable Donation", value: `$${rewardValue}`, detail: "Confirmation email sent to you" },
    };
    const lbl = labels[selected];

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-5 py-8 justify-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-5xl mb-5">
              {lbl.icon}
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Confirm your reward</h2>
            <p className="text-slate-500 text-sm mb-6">
              You're about to claim your <span className="text-slate-900 font-semibold">{lbl.value} {lbl.name}</span>.
            </p>

            <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 mb-5 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Reward</span>
                <span className="text-slate-900 font-medium">{lbl.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Value</span>
                <span className="text-[#E0622A] font-bold">{lbl.value}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Delivery</span>
                <span className="text-slate-900 font-medium">{lbl.detail}</span>
              </div>
            </div>

            {submitError && (
              <div className="w-full bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-600 text-xs">{submitError}</p>
              </div>
            )}

            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-[#E0622A] hover:bg-[#C9551E] text-white font-bold text-base transition-all shadow-lg shadow-[#E0622A]/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3"
            >
              {isSubmitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Claiming…</>
              ) : (
                <><Gift className="w-5 h-5" /> Claim My Reward</>
              )}
            </button>

            <button
              onClick={() => { setPhase("selecting"); setSubmitError(null); }}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 text-slate-500 text-sm hover:text-slate-800 transition-colors disabled:opacity-40"
            >
              <ArrowLeft className="w-4 h-4" /> Go back
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Selecting ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #F5A623 0%, #E8842A 100%)" }}>

      {/* Gradient hero */}
      <div className="px-5 pt-10 pb-24 text-white text-center">
        {/* Logo / office */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {referral?.office_logo_url ? (
            <img src={referral.office_logo_url} alt="Practice logo" className="h-8 max-w-[120px] object-contain brightness-0 invert" />
          ) : (
            <span className="font-display font-bold text-xl">
              <span className="text-white/70">rip</span><span className="text-white">pl</span>
            </span>
          )}
        </div>

        <p className="text-white/80 text-base font-medium mb-1">Hey {firstName} —</p>
        <p className="text-white/80 text-sm mb-6 font-medium italic" style={{ fontFamily: "var(--font-fraunces)" }}>
          You've earned it.
        </p>

        {/* Count-up reward amount */}
        <div
          className="text-[96px] font-bold leading-none text-white mb-2 tracking-tight"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          ${animatedReward}
        </div>
        <p className="text-white/80 text-base font-medium">reward for you</p>

        <div className="flex items-center justify-center mt-5">
          <TierPill tierName={referrer.tier} />
        </div>
      </div>

      {/* White card pulls up */}
      <div className="bg-white rounded-t-3xl -mt-12 flex-1 px-5 pt-6 pb-10">
        <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-4 text-center">
          {referral?.new_patient_name ?? "A friend"} just completed their visit — pick your reward:
        </p>

        {/* Reward cards */}
        <div className="space-y-3 mb-6">

          {/* In-house credit — shown first */}
          <RewardCard
            isSelected={selected === "in-house-credit"}
            onSelect={() => setSelected("in-house-credit")}
            badge="Most Valuable"
            badgeColor="amber"
            icon="🦷"
            title="$100 Dental Account Credit"
            subtitle="Applied to your account within 24 hours"
            detail="Worth the most — use it toward any future treatment"
          />

          {/* Gift card */}
          <RewardCard
            isSelected={selected === "gift-card"}
            onSelect={() => setSelected("gift-card")}
            badge="Most Popular"
            badgeColor="orange"
            icon="🎁"
            title={`$${rewardValue} Gift Card`}
            subtitle="Delivered instantly to your email"
            detail="No account needed · Choose your brand below"
          >
            <AnimatePresence>
              {selected === "gift-card" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 overflow-hidden"
                >
                  <p className="text-slate-400 text-xs mb-2">Choose brand:</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {GIFT_CARD_BRANDS.map((b) => (
                      <button
                        key={b}
                        onClick={(e) => { e.stopPropagation(); setBrand(b); }}
                        className={cn(
                          "py-1.5 px-2 rounded-lg text-xs font-semibold transition-all border",
                          brand === b
                            ? "bg-[#E0622A] border-[#E0622A] text-white"
                            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300",
                        )}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </RewardCard>

          {/* Local partner — conditional */}
          {localPartner && (
            <RewardCard
              isSelected={selected === "local-partner"}
              onSelect={() => setSelected("local-partner")}
              icon="🏪"
              title={`$${rewardValue} at ${localPartner.business_name}`}
              subtitle={localPartner.category}
              detail={localPartner.address
                ? `Show your PIN in store · ${localPartner.address}`
                : "Show your PIN in store to redeem"}
            />
          )}

          {/* Charity */}
          <RewardCard
            isSelected={selected === "charity"}
            onSelect={() => setSelected("charity")}
            icon="❤️"
            title={`Donate $${rewardValue} to Charity`}
            subtitle="In your name"
            detail="We'll make a donation and send you a confirmation email"
          />
        </div>

        {/* Proceed button */}
        <AnimatePresence>
          {selected && (
            <motion.div
              key="proceed"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
            >
              <button
                onClick={() => setPhase("confirming")}
                className="w-full py-4 rounded-2xl bg-[#E0622A] hover:bg-[#C9551E] text-white font-bold text-base transition-all shadow-lg shadow-[#E0622A]/25"
              >
                Continue with {
                  selected === "gift-card" ? `${brand} Gift Card` :
                  selected === "local-partner" ? localPartner?.business_name ?? "Local Partner" :
                  selected === "in-house-credit" ? "Dental Credit" :
                  "Charity Donation"
                } →
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-xs text-slate-400 mt-5">
          By claiming, you agree to Rippl's referral program terms.
        </p>
      </div>
    </div>
  );
}
