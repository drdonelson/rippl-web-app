import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, UserPlus, Gift, Trophy, ArrowRight, Activity, CheckCircle2, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { useOffice } from "@/contexts/office-context";
import { useAuth } from "@/contexts/auth-context";
import { customFetch } from "@workspace/api-client-react";
import { DEMO_STATS } from "@/lib/demo-data";

interface AdminTask {
  id: string;
  task_type: string;
  amount: number;
  notes: string | null;
  referrer_name: string | null;
  referrer_email: string | null;
  new_patient_name: string | null;
  created_at: string;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface DashboardStats {
  total_referrals: number;
  exams_completed: number;
  rewards_issued: number;
  active_referrers: number;
  top_referrers: { id: string; name: string; total_referrals: number; total_rewards_issued: number }[];
  recent_events: {
    id: string;
    new_patient_name: string;
    new_patient_phone: string;
    referrer_id: string;
    referrer_name: string | null;
    team_source: string;
    office: string;
    office_id: string | null;
    status: string;
    reward_type: string | null;
    created_at: string;
  }[];
}

function useDashboard(officeId: string, enabled: boolean) {
  return useQuery<DashboardStats>({
    queryKey: ["/api/dashboard", officeId],
    queryFn: ({ queryKey }) => {
      const id = queryKey[1] as string;
      const qs = id && id !== "all" ? `?office_id=${encodeURIComponent(id)}` : "";
      return customFetch<DashboardStats>(`${BASE}/api/dashboard${qs}`);
    },
    enabled,
    refetchInterval: enabled ? 30_000 : false,
    staleTime: 0,
  });
}

function useAdminTasks(enabled: boolean) {
  return useQuery<AdminTask[]>({
    queryKey: ["/api/admin-tasks"],
    queryFn: () => customFetch<AdminTask[]>(`${BASE}/api/admin-tasks`),
    enabled,
    refetchInterval: enabled ? 30_000 : false,
  });
}

function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      customFetch(`${BASE}/api/admin-tasks/${id}/complete`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin-tasks"] }),
  });
}

export default function Dashboard() {
  const { isDemo, isLoading: authIsLoading, profile } = useAuth();
  const { selectedOfficeId } = useOffice();

  // Gate queries on auth being fully loaded AND user not being demo.
  // Without !authIsLoading, queries fire before profile resolves (isDemo=false
  // on first render) and bypass the hardcoded demo data entirely.
  const queryEnabled = !authIsLoading && !isDemo;

  console.log("[Dashboard] isDemo:", isDemo, "authIsLoading:", authIsLoading, "role:", profile?.role);

  const { data: fetchedStats, isLoading, error } = useDashboard(selectedOfficeId, queryEnabled);
  const { data: adminTasks = [] } = useAdminTasks(queryEnabled);
  const completeTask = useCompleteTask();

  const stats: DashboardStats | undefined = isDemo ? DEMO_STATS : fetchedStats;
  const loading = !isDemo && (authIsLoading || isLoading);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div>
          <div className="h-10 w-64 bg-muted rounded-lg mb-2"></div>
          <div className="h-5 w-48 bg-muted/50 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-card rounded-2xl border border-border"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!isDemo && (error || !stats)) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 text-destructive p-6 rounded-2xl">
        <h3 className="font-bold text-lg mb-1">Failed to load dashboard</h3>
        <p>There was an error communicating with the API.</p>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: "Total Referrals",  value: stats.total_referrals,  icon: Users,    color: "text-blue-400",   bg: "bg-blue-400/10",   border: "border-blue-400/20",   href: "/events" },
    { label: "Exams Completed",  value: stats.exams_completed,  icon: Activity, color: "text-green-400",  bg: "bg-green-400/10",  border: "border-green-400/20",  href: "/events?tab=exam-completed" },
    { label: "Rewards Issued",   value: stats.rewards_issued,   icon: Gift,     color: "text-primary",    bg: "bg-primary/10",    border: "border-primary/20",    href: "/events?tab=reward-sent" },
    { label: "Active Referrers", value: stats.active_referrers, icon: UserPlus, color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20", href: "/patients" },
  ];

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Welcome back</h1>
        <p className="text-muted-foreground mt-2 text-base md:text-lg">Here's what's happening with your referral program today.</p>
      </header>

      {/* Stats Grid — each tile navigates to the relevant filtered view */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <Link
            key={i}
            href={stat.href}
            className="group bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border hover:border-primary/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 cursor-pointer block"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.border} border transition-all group-hover:scale-110`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors" />
            </div>
            <p className="text-muted-foreground font-medium mb-1">{stat.label}</p>
            <h3 className="text-4xl font-display font-bold text-foreground">{stat.value}</h3>
          </Link>
        ))}
      </div>

      {/* Pending Admin Tasks — hidden in demo mode */}
      {!isDemo && adminTasks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-yellow-400" />
            <h2 className="text-xl font-display font-bold text-foreground">
              Pending Tasks
            </h2>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              {adminTasks.length}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {adminTasks.map(task => {
              const isHouseholdDupe = task.task_type === "household-duplicate-review";
              const isGiftCard = task.task_type === "amazon-gift-card";

              const accent = isHouseholdDupe
                ? { border: "border-orange-500/20", bg: "bg-orange-500/10", text: "text-orange-400", badgeBg: "bg-orange-500/10", badgeBorder: "border-orange-500/20", btnBg: "bg-orange-500/10 hover:bg-orange-500/20", btnBorder: "border-orange-500/20" }
                : { border: "border-yellow-500/20", bg: "bg-yellow-500/10", text: "text-yellow-400", badgeBg: "bg-yellow-500/10", badgeBorder: "border-yellow-500/20", btnBg: "bg-yellow-500/10 hover:bg-yellow-500/20", btnBorder: "border-yellow-500/20" };

              const taskLabel = isHouseholdDupe
                ? "🏠 Household Review"
                : isGiftCard
                ? "📦 Gift Card"
                : "💛 Charity Donation";

              return (
                <div key={task.id} className={`bg-card rounded-2xl border ${accent.border} p-5 flex flex-col gap-3`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wider ${accent.text}`}>
                        {taskLabel}
                      </p>
                      {task.amount > 0 && (
                        <p className="font-bold text-foreground text-lg mt-0.5">${task.amount}</p>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${accent.badgeBg} ${accent.text} border ${accent.badgeBorder} shrink-0`}>
                      Pending
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    <p><span className="text-foreground font-medium">Referrer:</span> {task.referrer_name ?? "—"}</p>
                    {task.referrer_email && <p className="truncate text-xs">{task.referrer_email}</p>}
                    {task.new_patient_name && (
                      <p><span className="text-foreground font-medium">Patient:</span> {task.new_patient_name}</p>
                    )}
                    {task.notes && isHouseholdDupe && (
                      <p className="text-xs pt-1 text-muted-foreground/70 italic line-clamp-2">{task.notes}</p>
                    )}
                    <p className="text-xs pt-1 text-muted-foreground/70">
                      {format(new Date(task.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  {isHouseholdDupe ? (
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); window.location.hash = "/events?tab=flagged"; }}
                      className={`mt-auto flex items-center justify-center gap-2 w-full py-2 px-4 rounded-xl ${accent.btnBg} ${accent.text} text-sm font-semibold border ${accent.btnBorder} transition-colors`}
                    >
                      Review on Events Page →
                    </a>
                  ) : (
                    <button
                      onClick={() => completeTask.mutate(task.id)}
                      disabled={completeTask.isPending}
                      className={`mt-auto flex items-center justify-center gap-2 w-full py-2 px-4 rounded-xl ${accent.btnBg} ${accent.text} text-sm font-semibold border ${accent.btnBorder} transition-colors disabled:opacity-50`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Mark as Done
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Events */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-bold text-foreground">Recent Activity</h2>
            <Link href="/events" className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {stats.recent_events.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                <Activity className="w-12 h-12 mb-4 opacity-20" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {stats.recent_events.slice(0, 5).map((event) => (
                  <div key={event.id} className="p-4 md:p-5 flex items-start md:items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 shrink-0 rounded-full bg-secondary flex items-center justify-center border border-border">
                        <Users className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm md:text-base truncate">
                          {event.new_patient_name} <span className="text-muted-foreground font-normal">referred by</span> {event.referrer_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(event.created_at), 'MMM d, yyyy • h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border shrink-0">
                      {event.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Referrers */}
        <div className="space-y-6">
          <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Top Referrers
          </h2>
          
          <div className="bg-card rounded-2xl border border-border overflow-hidden p-2">
            {stats.top_referrers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p>No referrers yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {stats.top_referrers.map((referrer, idx) => (
                  <div key={referrer.id} className="p-4 rounded-xl flex items-center justify-between hover:bg-muted/50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                        ${idx === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : 
                          idx === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' : 
                          idx === 2 ? 'bg-amber-700/20 text-amber-500 border border-amber-700/30' : 
                          'bg-muted text-muted-foreground'}`}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{referrer.name}</p>
                        <p className="text-xs text-muted-foreground">{referrer.total_rewards_issued} rewards</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-lg text-foreground">{referrer.total_referrals}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Referrals</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
