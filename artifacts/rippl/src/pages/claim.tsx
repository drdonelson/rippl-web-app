import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, CheckCircle2, Loader2, AlertTriangle, Clock, Gift, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTierConfig, getProgressMessage, TIER_CONFIG } from "@/lib/tier-config";

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
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-5">
      <div className="max-w-sm w-full bg-slate-800/60 backdrop-blur border border-slate-700 rounded-3xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 bg-slate-700/60">
          {icon}
        </div>
        <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
        <p className="text-slate-400 text-sm leading-relaxed">{body}</p>
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
      {cfg.emoji} {cfg.label}
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
  badgeColor?: "teal" | "amber";
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  detail: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "w-full text-left rounded-2xl p-4 border transition-all duration-200 relative overflow-hidden",
        "disabled:cursor-not-allowed",
        isSelected
          ? "bg-teal-900/40 border-teal-500 shadow-lg shadow-teal-500/10"
          : "bg-slate-800/50 border-slate-700 hover:border-slate-500 active:scale-[0.99]",
      )}
    >
      {badge && (
        <span className={cn(
          "absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
          badgeColor === "amber"
            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
            : "bg-teal-500/20 text-teal-400 border border-teal-500/30",
        )}>
          {badge}
        </span>
      )}

      <div className="flex items-start gap-4 pr-16">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 mt-0.5",
          isSelected ? "bg-teal-500/20" : "bg-slate-700/60",
        )}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-white leading-tight">{title}</p>
          <p className="text-teal-400 text-sm font-medium mt-0.5">{subtitle}</p>
          <p className="text-slate-400 text-xs mt-1 leading-relaxed">{detail}</p>
          {children}
        </div>
      </div>

      <div className={cn(
        "absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 mt-3",
        isSelected ? "bg-teal-500 border-teal-500" : "border-slate-500",
      )}>
        {isSelected && (
          <svg viewBox="0 0 20 20" fill="white" className="w-full h-full p-0.5">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    </button>
  );
}

// ── Tier progress bar ─────────────────────────────────────────────────────────
function TierProgressBar({ tierName, totalReferrals }: { tierName: string | null; totalReferrals: number }) {
  const cfg = getTierConfig(tierName);
  if (!cfg.nextTierAt) {
    return (
      <div className="text-center">
        <p className="text-amber-400 text-sm font-semibold">You've reached the highest tier! 🏆</p>
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
        <span className={cn("font-semibold", cfg.color)}>{cfg.emoji} {cfg.label}</span>
        <span className={cn("font-semibold", nextCfg?.color)}>{nextCfg?.emoji} {cfg.nextTierLabel}</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
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
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
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
        icon={<CheckCircle2 className="w-8 h-8 text-teal-400" />}
        title="Already Claimed"
        body={errorDetail?.claimedAt
          ? `This reward was already claimed on ${formatDate(errorDetail.claimedAt)}.`
          : "This reward has already been claimed."}
      />
    );
  }

  if (!claimData) return null;

  const { referrer, referral, localPartner, claim } = claimData;
  const firstName   = referrer.name.split(" ")[0] ?? referrer.name;
  const rewardValue = claim.reward_value;
  const OFFICE_NAMES: Record<string, string> = {
    brentwood:  "Hallmark Dental – Brentwood",
    lewisburg:  "Hallmark Dental – Lewisburg",
    greenbrier: "Hallmark Dental – Greenbrier",
  };
  const office = OFFICE_NAMES[referral.office] ?? referral.office ?? "Hallmark Dental";

  // ── Success ───────────────────────────────────────────────────────────────
  if (phase === "success" && result) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex flex-col">
        <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-5 py-8 justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center"
          >
            {/* Logo */}
            <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
                <Droplets className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold text-lg">Rippl</span>
            </div>

            {/* Checkmark */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12, delay: 0.15 }}
              className="w-20 h-20 bg-gradient-to-br from-teal-400 to-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-teal-500/30"
            >
              <CheckCircle2 className="w-10 h-10 text-white" />
            </motion.div>

            <h2 className="text-2xl font-bold text-white mb-1">Reward Claimed!</h2>
            <p className="text-slate-400 text-sm mb-6">Thank you for being a loyal patient, {firstName}.</p>

            {/* Reward-specific message */}
            <div className="w-full bg-slate-800/60 border border-slate-700 rounded-2xl p-5 mb-5 text-left">
              {result.reward_type === "local-partner" && result.pin_code ? (
                <>
                  <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">Your Redemption PIN</p>
                  <p className="text-6xl font-black text-white tracking-[0.2em] text-center py-2 font-mono">
                    {result.pin_code}
                  </p>
                  <p className="text-slate-400 text-xs text-center mt-2">Show this screen to the cashier to redeem your reward at {localPartner?.business_name ?? "the store"}.</p>
                </>
              ) : result.reward_type === "gift-card" ? (
                <>
                  <p className="text-white font-semibold mb-1">🎁 Check your email!</p>
                  <p className="text-slate-400 text-sm">
                    Your ${result.reward_value} {result.gift_card_brand ?? "Amazon"} gift card is on its way to {referrer.name.split(" ")[0]}'s inbox. It usually arrives within a few minutes.
                  </p>
                </>
              ) : result.reward_type === "in-house-credit" ? (
                <>
                  <p className="text-white font-semibold mb-1">🦷 Credit incoming!</p>
                  <p className="text-slate-400 text-sm">
                    Your $100 dental credit will be applied to your account within 24 hours. You'll see it at your next appointment.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-white font-semibold mb-1">❤️ Thank you for giving back!</p>
                  <p className="text-slate-400 text-sm">
                    We'll donate ${result.reward_value} to charity in your name and send you a confirmation email.
                  </p>
                </>
              )}
            </div>

            {/* Tier progress */}
            <div className="w-full bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 mb-5">
              <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-3 text-center">Your Referral Progress</p>
              <TierProgressBar tierName={referrer.tier} totalReferrals={referrer.total_referrals} />
            </div>

            {/* Share CTA */}
            <button
              onClick={handleCopy}
              className={cn(
                "w-full py-3.5 rounded-2xl font-semibold text-sm transition-all",
                copied
                  ? "bg-teal-600 text-white"
                  : "bg-teal-500/20 border border-teal-500/40 text-teal-400 hover:bg-teal-500/30",
              )}
            >
              {copied ? "✓ Link Copied!" : "📤 Share Rippl with another friend"}
            </button>
            <p className="text-slate-600 text-xs mt-2">Copies your personal referral link</p>
          </motion.div>
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
      <div className="min-h-screen bg-[#0a1628] flex flex-col">
        <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-5 py-8 justify-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-5xl mb-5">
              {lbl.icon}
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Confirm your reward</h2>
            <p className="text-slate-400 text-sm mb-6">
              You're about to claim your <span className="text-white font-semibold">{lbl.value} {lbl.name}</span>.
            </p>

            <div className="w-full bg-slate-800/60 border border-slate-700 rounded-2xl p-4 mb-5 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Reward</span>
                <span className="text-white font-medium">{lbl.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Value</span>
                <span className="text-teal-400 font-bold">{lbl.value}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Delivery</span>
                <span className="text-white font-medium">{lbl.detail}</span>
              </div>
            </div>

            {submitError && (
              <div className="w-full bg-red-900/30 border border-red-500/40 rounded-xl p-3 mb-4 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-400 text-xs">{submitError}</p>
              </div>
            )}

            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-base transition-all shadow-lg shadow-teal-600/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3"
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
              className="flex items-center gap-1.5 text-slate-400 text-sm hover:text-white transition-colors disabled:opacity-40"
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
    <div className="min-h-screen bg-[#0a1628]">
      <div className="max-w-md mx-auto px-5 py-6 pb-10">

        {/* Logo + Office */}
        <div className="flex items-center gap-2 mb-7">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <span className="text-slate-300 text-sm font-medium">{office}</span>
        </div>

        {/* Header */}
        <div className="mb-7">
          <h1 className="text-3xl font-black text-white leading-tight mb-3">
            Congratulations, {firstName}! 🎉
          </h1>
          <div className="flex items-center gap-3 mb-2">
            <TierPill tierName={referrer.tier} />
          </div>
          <p className="text-teal-400 font-semibold text-lg mt-2">
            You've earned a ${rewardValue} reward
          </p>
          <p className="text-slate-400 text-sm mt-1">
            {getProgressMessage(referrer.tier, referrer.total_referrals)}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            {referral.new_patient_name} just completed their visit — pick your reward below.
          </p>
        </div>

        {/* Reward cards */}
        <div className="space-y-3 mb-6">

          {/* Gift card */}
          <RewardCard
            isSelected={selected === "gift-card"}
            onSelect={() => setSelected("gift-card")}
            badge="Most Popular"
            badgeColor="teal"
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
                            ? "bg-teal-600 border-teal-500 text-white"
                            : "bg-slate-700/60 border-slate-600 text-slate-300 hover:border-slate-400",
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

          {/* In-house credit */}
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
                className="w-full py-4 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-base transition-all shadow-lg shadow-teal-600/25"
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

        <p className="text-center text-xs text-slate-600 mt-5">
          By claiming, you agree to {office}'s referral program terms.
        </p>
      </div>
    </div>
  );
}
