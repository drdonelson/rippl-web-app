import React, { useState, useEffect } from "react";
import { useGetReferralByToken, useCreateReward, getGetReferralByTokenQueryKey } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, Gift, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const REWARDS = [
  { id: "in-house-credit", title: "$100 Account Credit", value: "$100", type: "In-House", icon: "💎", desc: "Applied directly to your next dental visit as an account credit", gradient: "from-blue-600 to-indigo-600" },
  { id: "amazon-gift-card", title: "$50 Gift Card", value: "$50", type: "Your Choice", icon: "📦", desc: "Choose from Amazon, Target, Starbucks & more — sent to your email", gradient: "from-orange-500 to-amber-500" },
  { id: "charity-donation", title: "$50 Charity Donation", value: "$50", type: "Charity", icon: "💛", desc: "We donate on your behalf to a cause you care about", gradient: "from-yellow-400 to-amber-500" },
];

export default function Claim() {
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("ref") || searchParams.get("token") || "";
  const preselectedReward = searchParams.get("reward") || null;
  
  const { data, isLoading, error } = useGetReferralByToken(token, {
    query: { queryKey: getGetReferralByTokenQueryKey(token), enabled: !!token, retry: false }
  });

  const [selectedReward, setSelectedReward] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const createReward = useCreateReward({
    mutation: {
      onSuccess: () => {
        setIsSuccess(true);
      }
    }
  });

  // Pre-select (highlight) the reward from the ?reward= URL param on load — does NOT auto-submit
  useEffect(() => {
    if (data && preselectedReward && !isSuccess) {
      const valid = REWARDS.find(r => r.id === preselectedReward);
      if (valid) setSelectedReward(preselectedReward);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Selecting a card just highlights it; submitting is a separate action
  const handleSelect = (rewardId: string) => {
    if (!createReward.isPending) setSelectedReward(rewardId);
  };

  const handleConfirm = () => {
    if (!selectedReward || !data || createReward.isPending) return;
    createReward.mutate({
      data: {
        referrer_id: data.referrer.id,
        referral_event_id: data.referral.id,
        reward_type: selectedReward as any,
      }
    });
  };

  if (!token || error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card p-8 rounded-3xl border border-border text-center shadow-2xl">
          <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-6">
            <Gift className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">Invalid or Expired Link</h2>
          <p className="text-muted-foreground">This referral link appears to be invalid or has already been claimed. Please contact your dental practice for assistance.</p>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  // If already rewarded
  if (data.referral.status === "Reward Sent" && !isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card p-8 rounded-3xl border border-border text-center shadow-2xl">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">Reward Already Claimed</h2>
          <p className="text-muted-foreground mb-6">The reward for referring {data.referral.new_patient_name} has already been processed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Background aesthetics */}
      <img 
        src={`${import.meta.env.BASE_URL}images/auth-bg.png`} 
        alt="Background" 
        className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background pointer-events-none" />

      <main className="flex-1 relative z-10 flex flex-col max-w-lg mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-center gap-3 mb-12 mt-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
            <Droplets className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">{data.referral.office}</h1>
        </div>

        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card/80 backdrop-blur-xl border border-border p-8 rounded-3xl text-center shadow-2xl mt-auto mb-auto"
            >
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12, delay: 0.2 }}
                className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30"
              >
                <CheckCircle2 className="w-12 h-12 text-white" />
              </motion.div>
              <h2 className="text-3xl font-display font-bold text-foreground mb-3">Thank You!</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Your reward is on its way. We truly appreciate you recommending {data.referral.new_patient_name} to our practice!
              </p>
              <div className="p-4 bg-background rounded-2xl border border-border">
                <p className="text-sm font-medium text-foreground">A confirmation has been sent to {data.referral.office}.</p>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="claim"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
              className="flex flex-col h-full"
            >
              <div className="text-center mb-10">
                <p className="text-primary font-semibold tracking-wider uppercase text-sm mb-3">A Gift For You</p>
                <h2 className="text-4xl font-display font-bold text-foreground mb-4">
                  Thank you, {data.referrer.name.split(' ')[0]}!
                </h2>
                <p className="text-lg text-muted-foreground">
                  {data.referral.new_patient_name} just completed their first exam. Please select your reward below as our token of appreciation.
                </p>
              </div>

              <div className="space-y-4 mb-6">
                {REWARDS.map((reward, i) => {
                  const isSelected = selectedReward === reward.id;
                  return (
                    <motion.button
                      key={reward.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => handleSelect(reward.id)}
                      disabled={createReward.isPending}
                      className={cn(
                        "w-full text-left backdrop-blur-md rounded-3xl p-5 relative overflow-hidden group transition-all duration-300",
                        "disabled:cursor-not-allowed disabled:transform-none",
                        isSelected
                          ? "bg-card border-2 border-primary shadow-xl shadow-primary/20 -translate-y-1"
                          : "bg-card/60 border border-border hover:bg-card hover:border-primary/50 hover:shadow-xl hover:-translate-y-1"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0 right-0 w-32 h-32 bg-gradient-to-br rounded-full blur-3xl -mr-10 -mt-10 transition-opacity",
                        reward.gradient,
                        isSelected ? "opacity-20" : "opacity-10 group-hover:opacity-20"
                      )} />

                      <div className="flex items-center gap-5 relative z-10">
                        <div className={cn(
                          "w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm transition-colors",
                          isSelected ? "bg-primary/10 border-2 border-primary" : "bg-background border border-border"
                        )}>
                          {reward.icon}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">{reward.type}</p>
                          <h3 className="text-xl font-display font-bold text-foreground mb-1">{reward.value}</h3>
                          <p className="text-sm text-muted-foreground leading-snug">{reward.desc}</p>
                        </div>
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-secondary group-hover:bg-primary group-hover:text-primary-foreground"
                        )}>
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Confirm button — appears when a card is selected */}
              <AnimatePresence>
                {selectedReward && (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    className="mb-6"
                  >
                    <button
                      onClick={handleConfirm}
                      disabled={createReward.isPending}
                      className="w-full py-4 px-6 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg shadow-primary/30 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {createReward.isPending ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Claiming…
                        </>
                      ) : (
                        <>
                          <Gift className="w-5 h-5" />
                          Confirm &amp; Claim Reward
                        </>
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="text-center text-xs text-muted-foreground mt-auto">
                By claiming a reward, you agree to {data.referral.office}'s referral program terms and conditions.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
