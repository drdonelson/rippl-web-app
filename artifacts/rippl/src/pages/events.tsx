import React, { useState } from "react";
import { useGetReferralEvents, useCreateReward, useUpdateReferralStatus } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Gift, Search, MoreHorizontal, CheckCircle2, ChevronDown } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

const STATUS_COLORS: Record<string, string> = {
  "Lead": "bg-slate-500/10 text-slate-400 border-slate-500/20",
  "Booked": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Exam Completed": "bg-green-500/10 text-green-400 border-green-500/20",
  "Reward Sent": "bg-primary/10 text-primary border-primary/20",
};

const REWARD_OPTIONS = [
  { id: "in-house-credit", title: "$100 In-House Credit", icon: "💎", desc: "Applied directly to patient account" },
  { id: "amazon-gift-card", title: "$50 Amazon Gift Card", icon: "📦", desc: "Digital delivery via email" },
  { id: "partner-gift-card", title: "$75 Partner Gift Card", icon: "🤝", desc: "Local business partner card" },
];

export default function Events() {
  const { data: events, isLoading } = useGetReferralEvents();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
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
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/referrals"] });
      }
    }
  });

  const filteredEvents = events?.filter(e => 
    e.new_patient_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (e.referrer_name && e.referrer_name.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

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
      updateStatus.mutate({
        id: eventId,
        data: { status: sequence[currentIndex + 1] as any }
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Referral Events</h1>
          <p className="text-muted-foreground mt-2">Track the pipeline of your new patients.</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input 
            type="text"
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full sm:w-72 transition-all"
          />
        </div>
      </div>

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
                Array.from({length: 5}).map((_, i) => (
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
                    No referral events found.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-muted/10 transition-colors group">
                    <td className="px-6 py-5">
                      <p className="font-semibold text-foreground">{event.new_patient_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{event.new_patient_phone}</p>
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
                        onClick={() => handleStatusCycle(event.id, event.status)}
                        disabled={event.status === "Reward Sent" || updateStatus.isPending}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all",
                          STATUS_COLORS[event.status] || "bg-muted text-muted-foreground",
                          event.status !== "Reward Sent" && "hover:brightness-125 cursor-pointer"
                        )}
                      >
                        {event.status}
                        {event.status !== "Reward Sent" && <ChevronDown className="w-3 h-3 opacity-50" />}
                      </button>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {event.status === "Exam Completed" ? (
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
                          {event.reward_type?.split('-').join(' ')}
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
