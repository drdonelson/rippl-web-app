import React from "react";
import { useGetDashboard } from "@workspace/api-client-react";
import { Users, UserPlus, Gift, Trophy, ArrowRight, Activity } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: stats, isLoading, error } = useGetDashboard();

  if (isLoading) {
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

  if (error || !stats) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 text-destructive p-6 rounded-2xl">
        <h3 className="font-bold text-lg mb-1">Failed to load dashboard</h3>
        <p>There was an error communicating with the API.</p>
      </div>
    );
  }

  const statCards = [
    { label: "Total Referrals", value: stats.total_referrals, icon: Users, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
    { label: "Exams Completed", value: stats.exams_completed, icon: Activity, color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20" },
    { label: "Rewards Issued", value: stats.rewards_issued, icon: Gift, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
    { label: "Active Referrers", value: stats.active_referrers, icon: UserPlus, color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
  ];

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Welcome back</h1>
        <p className="text-muted-foreground mt-2 text-base md:text-lg">Here's what's happening with your referral program today.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div 
            key={i} 
            className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border hover:border-muted-foreground/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.border} border`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <p className="text-muted-foreground font-medium mb-1">{stat.label}</p>
            <h3 className="text-4xl font-display font-bold text-foreground">{stat.value}</h3>
          </div>
        ))}
      </div>

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
