import React, { useState } from "react";
import { useGetReferralEvents, useGetReferrers, useCreateReward, useUpdateReferralStatus } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Gift, Search, MoreHorizontal, CheckCircle2, ChevronDown, ShieldAlert, ShieldCheck, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const logReferralSchema = z.object({
  new_patient_name:  z.string().min(2, "Name is required"),
  new_patient_phone: z.string().min(10, "Valid phone number is required"),
  referrer_id:       z.string().min(1, "Referrer is required"),
  team_source:       z.enum(["front", "back", "assistant"], { required_error: "Team source is required" }),
  office:            z.enum(["brentwood", "nashville"], { required_error: "Office is required" }),
});
type LogReferralValues = z.infer<typeof logReferralSchema>;

function useLogReferral(onSuccess: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: LogReferralValues) =>
      fetch(`${BASE}/api/referrals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/referrals"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      onSuccess();
    },
  });
}

const STATUS_COLORS: Record<string, string> = {
  "Lead": "bg-slate-500/10 text-slate-400 border-slate-500/20",
  "Booked": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Exam Completed": "bg-green-500/10 text-green-400 border-green-500/20",
  "Reward Sent": "bg-primary/10 text-primary border-primary/20",
};

const REWARD_OPTIONS = [
  { id: "in-house-credit", title: "$100 In-House Credit", icon: "💎", desc: "Applied directly to patient account" },
  { id: "amazon-gift-card", title: "$50 Gift Card", icon: "📦", desc: "Reward Link — sent to referrer's email" },
  { id: "charity-donation", title: "$50 Charity Donation", icon: "💛", desc: "We donate $50 on their behalf" },
];

const REWARD_LABELS: Record<string, string> = {
  "in-house-credit": "In-House Credit",
  "amazon-gift-card": "Gift Card",
  "charity-donation": "Charity Donation",
};

interface ReferralEvent {
  id: string;
  new_patient_name: string;
  new_patient_phone: string;
  referrer_id: string;
  referrer_name?: string | null;
  team_source: string;
  office: string;
  status: string;
  reward_type?: string | null;
  household_duplicate?: boolean | null;
  created_at: string;
}

function useOverrideHousehold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) =>
      fetch(`${BASE}/api/referrals/${eventId}/override-household`, { method: "PATCH" })
        .then(r => r.json()) as Promise<ReferralEvent>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/referrals"] });
      qc.invalidateQueries({ queryKey: ["/api/admin-tasks"] });
    },
  });
}

type TabId = "all" | "flagged";

export default function Events() {
  const { data: rawEvents, isLoading } = useGetReferralEvents();
  const events = rawEvents as ReferralEvent[] | undefined;
  const { data: referrers } = useGetReferrers();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  const { register: logRegister, handleSubmit: logHandleSubmit, reset: logReset, formState: { errors: logErrors } } = useForm<LogReferralValues>({
    resolver: zodResolver(logReferralSchema),
  });

  const logReferral = useLogReferral(() => {
    setIsLogModalOpen(false);
    logReset();
  });

  const createReward = useCreateReward({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/referrals"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
        setSelectedEventId(null);
      }
    }
  });

  const updateStatus = useUpdateReferralStatus({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/referrals"] }),
    }
  });

  const overrideHousehold = useOverrideHousehold();

  const flaggedCount = events?.filter(e => e.household_duplicate).length ?? 0;

  const filteredEvents = (events ?? []).filter(e => {
    const matchesSearch =
      e.new_patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.referrer_name && e.referrer_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTab = activeTab === "flagged" ? !!e.household_duplicate : true;
    return matchesSearch && matchesTab;
  });

  const handleReward = (rewardType: string) => {
    if (!selectedEventId) return;
    const event = events?.find(e => e.id === selectedEventId);
    if (!event) return;
    createReward.mutate({
      data: {
        referrer_id: event.referrer_id,
        referral_event_id: event.id,
        reward_type: rewardType as any
      }
    });
  };

  const handleStatusCycle = (eventId: string, currentStatus: string) => {
    const sequence = ["Lead", "Booked", "Exam Completed"];
    const currentIndex = sequence.indexOf(currentStatus);
    if (currentIndex >= 0 && currentIndex < sequence.length - 1) {
      updateStatus.mutate({ id: eventId, data: { status: sequence[currentIndex + 1] as any } });
    }
  };

  const handleOverrideAndReward = (event: ReferralEvent) => {
    overrideHousehold.mutate(event.id, {
      onSuccess: (updatedEvent) => {
        // If status is Exam Completed, open reward modal immediately
        if (updatedEvent.status === "Exam Completed") {
          setSelectedEventId(event.id);
        }
        // Otherwise just refresh — admin advances status then sends reward
      }
    });
  };

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "all", label: "All Events" },
    { id: "flagged", label: "Flagged", count: flaggedCount },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Referral Events</h1>
          <p className="text-muted-foreground mt-2">Track the pipeline of your new patients.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full sm:w-64 transition-all"
            />
          </div>
          <button
            onClick={() => setIsLogModalOpen(true)}
            className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Log Referral
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2",
              activeTab === tab.id
                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-t"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.id === "flagged" && <ShieldAlert className="w-4 h-4 text-amber-400" />}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "flagged" && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <p>
            These referrals share a household with an existing completed patient.
            Review each one and click <strong>Override &amp; Reward</strong> only if it's a genuinely new household member.
          </p>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl shadow-xl shadow-black/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">New Patient</th>
                <th className="px-6 py-4 font-semibold">Referrer</th>
                <th className="px-6 py-4 font-semibold">Source</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-4 w-32 bg-muted rounded"></div></td>
                    <td className="px-6 py-5"><div className="h-4 w-24 bg-muted rounded"></div></td>
                    <td className="px-6 py-5"><div className="h-4 w-16 bg-muted rounded"></div></td>
                    <td className="px-6 py-5"><div className="h-4 w-20 bg-muted rounded"></div></td>
                    <td className="px-6 py-5"><div className="h-6 w-24 bg-muted rounded-full"></div></td>
                    <td className="px-6 py-5"></td>
                  </tr>
                ))
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    {activeTab === "flagged"
                      ? "No flagged referrals — everything looks clean."
                      : "No referral events found."}
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => (
                  <tr
                    key={event.id}
                    className={cn(
                      "hover:bg-muted/10 transition-colors group",
                      event.household_duplicate && "bg-amber-500/5"
                    )}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-semibold text-foreground">{event.new_patient_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{event.new_patient_phone}</p>
                        </div>
                        {event.household_duplicate && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25 whitespace-nowrap">
                            Household Review
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-medium text-foreground">{event.referrer_name || 'Unknown'}</p>
                    </td>
                    <td className="px-6 py-5">
                      <span className="capitalize text-sm text-muted-foreground">{event.team_source}</span>
                    </td>
                    <td className="px-6 py-5 text-sm text-muted-foreground">
                      {format(new Date(event.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-5">
                      <button
                        onClick={() => !event.household_duplicate && handleStatusCycle(event.id, event.status)}
                        disabled={event.status === "Reward Sent" || updateStatus.isPending || !!event.household_duplicate}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all",
                          STATUS_COLORS[event.status] || "bg-muted text-muted-foreground",
                          event.status !== "Reward Sent" && !event.household_duplicate && "hover:brightness-125 cursor-pointer"
                        )}
                      >
                        {event.status}
                        {event.status !== "Reward Sent" && !event.household_duplicate && (
                          <ChevronDown className="w-3 h-3 opacity-50" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {event.household_duplicate ? (
                        <button
                          onClick={() => handleOverrideAndReward(event)}
                          disabled={overrideHousehold.isPending}
                          className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-sm font-semibold border border-amber-500/30 transition-all flex items-center gap-2 ml-auto disabled:opacity-50"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Override &amp; Reward
                        </button>
                      ) : event.status === "Exam Completed" ? (
                        <button
                          onClick={() => setSelectedEventId(event.id)}
                          className="px-4 py-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all flex items-center gap-2 ml-auto"
                        >
                          <Gift className="w-4 h-4" />
                          Send Reward
                        </button>
                      ) : event.status === "Reward Sent" ? (
                        <div className="flex items-center justify-end gap-2 text-primary font-medium text-sm">
                          <CheckCircle2 className="w-4 h-4" />
                          {event.reward_type ? (REWARD_LABELS[event.reward_type] ?? event.reward_type) : ""}
                        </div>
                      ) : (
                        <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Log Referral Modal ────────────────────────────────────────────── */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => { setIsLogModalOpen(false); logReset(); }}
        title="Log Referral"
        description="Manually record a new patient referral into the pipeline."
      >
        <form
          onSubmit={logHandleSubmit((data) => logReferral.mutate(data))}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">New Patient Name</label>
            <input
              {...logRegister("new_patient_name")}
              placeholder="e.g. Jane Smith"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground"
            />
            {logErrors.new_patient_name && <p className="text-destructive text-xs mt-1">{logErrors.new_patient_name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">New Patient Phone</label>
            <input
              {...logRegister("new_patient_phone")}
              placeholder="(555) 123-4567"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground"
            />
            {logErrors.new_patient_phone && <p className="text-destructive text-xs mt-1">{logErrors.new_patient_phone.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Referrer</label>
            <select
              {...logRegister("referrer_id")}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground appearance-none"
            >
              <option value="">Select a referrer…</option>
              {(referrers ?? []).map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            {logErrors.referrer_id && <p className="text-destructive text-xs mt-1">{logErrors.referrer_id.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Team Source</label>
              <select
                {...logRegister("team_source")}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground appearance-none"
              >
                <option value="">Select…</option>
                <option value="front">Front</option>
                <option value="back">Back</option>
                <option value="assistant">Assistant</option>
              </select>
              {logErrors.team_source && <p className="text-destructive text-xs mt-1">{logErrors.team_source.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Office</label>
              <select
                {...logRegister("office")}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground appearance-none"
              >
                <option value="">Select…</option>
                <option value="brentwood">Brentwood</option>
                <option value="nashville">Nashville</option>
              </select>
              {logErrors.office && <p className="text-destructive text-xs mt-1">{logErrors.office.message}</p>}
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={() => { setIsLogModalOpen(false); logReset(); }}
              className="flex-1 py-3 px-4 bg-muted hover:bg-muted/80 text-foreground rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={logReferral.isPending}
              className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {logReferral.isPending ? "Logging…" : "Log Referral"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Select Reward Modal ───────────────────────────────────────────── */}
      <Modal
        isOpen={!!selectedEventId}
        onClose={() => setSelectedEventId(null)}
        title="Select Reward"
        description="The patient has completed their exam. Choose a reward to send to the referrer."
      >
        <div className="space-y-4">
          {REWARD_OPTIONS.map((option) => (
            <button
              key={option.id}
              disabled={createReward.isPending}
              onClick={() => handleReward(option.id)}
              className="w-full p-4 rounded-xl border-2 border-border bg-background hover:border-primary hover:bg-primary/5 transition-all text-left flex items-center gap-4 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl group-hover:bg-primary/20 transition-colors">
                {option.icon}
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-lg">{option.title}</h4>
                <p className="text-sm text-muted-foreground">{option.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
