import React from "react";
import { TrendingUp, Construction, Users, Gift, ArrowUpRight, Percent } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

// ── Demo data (shown to demo accounts only) ───────────────────────────────────

const DEMO_STATS = [
  { label: "Total Referrals",   value: "142",  sub: "+18 this month",  icon: TrendingUp,    color: "text-teal-400",   bg: "bg-teal-500/10",   border: "border-teal-500/20"  },
  { label: "Active Referrers",  value: "61",   sub: "across 3 offices", icon: Users,         color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  { label: "Rewards Issued",    value: "89",   sub: "$4,150 total value", icon: Gift,         color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20"  },
  { label: "Conversion Rate",   value: "62%",  sub: "referral → appt",  icon: Percent,       color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20"  },
];

const DEMO_TRENDS = [
  { month: "Nov 2025", referrals: 14, rewards: 9,  revenue: "$390" },
  { month: "Dec 2025", referrals: 19, rewards: 12, revenue: "$540" },
  { month: "Jan 2026", referrals: 22, rewards: 14, revenue: "$630" },
  { month: "Feb 2026", referrals: 28, rewards: 18, revenue: "$830" },
  { month: "Mar 2026", referrals: 31, rewards: 21, revenue: "$970" },
  { month: "Apr 2026", referrals: 18, rewards: 10, revenue: "$450" },
];

const DEMO_TOP_REFERRERS = [
  { name: "Sarah M.",   referrals: 12, tier: "Ambassador",  reward: "$75 credit" },
  { name: "James K.",   referrals: 9,  tier: "Amplifier",   reward: "Gift card" },
  { name: "Priya D.",   referrals: 8,  tier: "Amplifier",   reward: "Gift card" },
  { name: "Tom R.",     referrals: 6,  tier: "Influencer",  reward: "Dental credit" },
  { name: "Ashley W.",  referrals: 5,  tier: "Influencer",  reward: "Gift card" },
];

const DEMO_REWARDS = [
  { type: "Gift Card",      count: 38, pct: 43, color: "bg-teal-500"    },
  { type: "Dental Credit",  count: 29, pct: 33, color: "bg-violet-500"  },
  { type: "Local Partner",  count: 14, pct: 16, color: "bg-amber-500"   },
  { type: "Charity",        count: 8,  pct: 9,  color: "bg-pink-500"    },
];

// ── Demo analytics view ───────────────────────────────────────────────────────

function DemoAnalytics() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Platform-wide referral and reward insights.</p>
        </div>
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold self-start mt-1">
          <Construction className="w-3 h-3" />
          Demo Data
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {DEMO_STATS.map(s => (
          <div key={s.label} className={`rounded-2xl border ${s.border} ${s.bg} p-4 flex flex-col gap-2`}>
            <div className={`w-9 h-9 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <div>
              <p className="text-xs font-semibold text-foreground">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Referral trends */}
      <div className="rounded-2xl border border-border bg-card/30 overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Monthly Referral Trends</h2>
        </div>
        <div className="divide-y divide-border">
          <div className="hidden md:grid grid-cols-4 px-6 py-2 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Month</span>
            <span>Referrals</span>
            <span>Rewards Issued</span>
            <span>Est. Revenue</span>
          </div>
          {DEMO_TRENDS.map(row => (
            <div key={row.month} className="grid md:grid-cols-4 gap-2 px-6 py-3 text-sm hover:bg-muted/20 transition-colors">
              <span className="font-medium text-foreground">{row.month}</span>
              <span className="text-muted-foreground">{row.referrals}</span>
              <span className="text-muted-foreground">{row.rewards}</span>
              <span className="text-muted-foreground">{row.revenue}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top referrers */}
        <div className="rounded-2xl border border-border bg-card/30 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Top Referrers</h2>
          </div>
          <div className="divide-y divide-border">
            {DEMO_TOP_REFERRERS.map((r, i) => (
              <div key={r.name} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/20 transition-colors">
                <span className="text-xs font-bold text-muted-foreground w-5 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.tier} · {r.reward}</p>
                </div>
                <div className="flex items-center gap-1 text-teal-400 text-sm font-semibold">
                  <ArrowUpRight className="w-3 h-3" />
                  {r.referrals}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reward breakdown */}
        <div className="rounded-2xl border border-border bg-card/30 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Reward Type Breakdown</h2>
          </div>
          <div className="divide-y divide-border">
            {DEMO_REWARDS.map(r => (
              <div key={r.type} className="px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{r.type}</span>
                  <span className="text-xs text-muted-foreground">{r.count} · {r.pct}%</span>
                </div>
                <div className="w-full bg-muted/30 rounded-full h-2">
                  <div className={`${r.color} h-2 rounded-full transition-all`} style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { isDemo } = useAuth();

  if (isDemo) return <DemoAnalytics />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1">Platform-wide referral and reward insights.</p>
      </div>

      <div className="flex flex-col items-center justify-center py-32 gap-5 rounded-2xl border border-border border-dashed bg-muted/10">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <TrendingUp className="w-10 h-10 text-primary/60" />
        </div>
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold mb-3">
            <Construction className="w-3 h-3" />
            Coming Soon
          </div>
          <p className="text-xl font-semibold text-foreground">Analytics dashboard</p>
          <p className="text-muted-foreground text-sm mt-2">
            Referral conversion rates, reward trends, and location performance — coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
