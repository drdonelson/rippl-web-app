import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Users, Gift, Download, ArrowUpRight, Construction, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useOffice } from "@/contexts/office-context";
import { usePractice } from "@/contexts/practice-context";
import { customFetch } from "@workspace/api-client-react";
import { DEMO_STATS, DEMO_STATS_AUTO, DEMO_STATS_SALON } from "@/lib/demo-data";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────

interface AnalyticsStats {
  total_referrals: number;
  exams_completed: number;
  rewards_sent: number;
  total_reward_value: number;
  vertical: string | null;
}

interface MonthlyTrend {
  period: string;
  label: string;
  referrals: number;
  rewards_sent: number;
}

interface TopReferrer {
  id: string;
  name: string;
  referrals: number;
  rewards: number;
}

interface RewardBreakdown {
  reward_type: string | null;
  count: number;
  total_value: number;
}

interface AnalyticsData {
  stats: AnalyticsStats;
  monthly_trends: MonthlyTrend[];
  top_referrers: TopReferrer[];
  reward_breakdown: RewardBreakdown[];
}

// ── Date range presets ────────────────────────────────────────────────────────

type Preset = "30d" | "90d" | "6m" | "ytd" | "all";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "30d",  label: "30 days" },
  { key: "90d",  label: "90 days" },
  { key: "6m",   label: "6 months" },
  { key: "ytd",  label: "This year" },
  { key: "all",  label: "All time" },
];

function presetDates(preset: Preset): { start: string | null; end: string | null } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (preset === "all") return { start: null, end: null };
  if (preset === "ytd") return { start: `${now.getFullYear()}-01-01`, end: fmt(now) };
  const days = preset === "30d" ? 30 : preset === "90d" ? 90 : 180;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return { start: fmt(start), end: fmt(now) };
}

// ── Reward type display name ──────────────────────────────────────────────────

function rewardLabel(t: string | null) {
  if (!t) return "Unknown";
  const MAP: Record<string, string> = {
    "in-house-credit": "Dental Credit",
    "amazon-gift-card": "Gift Card",
    "gift-card": "Gift Card",
    "charity-donation": "Charity",
    "charity": "Charity",
    "local-partner": "Local Partner",
  };
  return MAP[t] ?? t;
}

const REWARD_COLORS: Record<string, string> = {
  "amazon-gift-card": "bg-[#E0622A]",
  "gift-card":        "bg-[#E0622A]",
  "in-house-credit":  "bg-violet-500",
  "charity-donation": "bg-pink-500",
  "charity":          "bg-pink-500",
  "local-partner":    "bg-amber-500",
};

// ── Demo data ─────────────────────────────────────────────────────────────────

const DEMO_TRENDS = [
  { period: "2025-11", label: "Nov 2025", referrals: 14, rewards_sent: 9 },
  { period: "2025-12", label: "Dec 2025", referrals: 19, rewards_sent: 12 },
  { period: "2026-01", label: "Jan 2026", referrals: 22, rewards_sent: 14 },
  { period: "2026-02", label: "Feb 2026", referrals: 28, rewards_sent: 18 },
  { period: "2026-03", label: "Mar 2026", referrals: 31, rewards_sent: 21 },
  { period: "2026-04", label: "Apr 2026", referrals: 18, rewards_sent: 10 },
];
const DEMO_TOP_REFERRERS: TopReferrer[] = [
  { id: "1", name: "Sarah M.",  referrals: 12, rewards: 12 },
  { id: "2", name: "James K.",  referrals: 9,  rewards: 9  },
  { id: "3", name: "Priya D.",  referrals: 8,  rewards: 8  },
  { id: "4", name: "Tom R.",    referrals: 6,  rewards: 6  },
  { id: "5", name: "Ashley W.", referrals: 5,  rewards: 5  },
];
const DEMO_REWARD_BREAKDOWN: RewardBreakdown[] = [
  { reward_type: "amazon-gift-card", count: 38, total_value: 1330 },
  { reward_type: "in-house-credit",  count: 29, total_value: 2900 },
  { reward_type: "local-partner",    count: 14, total_value: 490  },
  { reward_type: "charity-donation", count: 8,  total_value: 280  },
];

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, color, bg, border,
}: {
  label: string; value: string; sub: string;
  icon: React.ElementType; color: string; bg: string; border: string;
}) {
  return (
    <div className={`rounded-2xl border ${border} ${bg} p-5 flex flex-col gap-3`}>
      <div className={`w-9 h-9 rounded-xl ${bg} border ${border} flex items-center justify-center`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <div>
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

// ── CSS bar chart ─────────────────────────────────────────────────────────────

function TrendChart({ trends }: { trends: MonthlyTrend[] }) {
  const max = Math.max(...trends.map(t => t.referrals), 1);
  return (
    <div className="flex items-end gap-2 h-32 px-2">
      {trends.map(t => (
        <div key={t.period} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: "100px" }}>
            <div
              className="w-full rounded-t-md bg-[#E0622A]/80 transition-all"
              style={{ height: `${Math.max(4, Math.round((t.referrals / max) * 100))}px` }}
              title={`${t.referrals} referrals`}
            />
          </div>
          <span className="text-[10px] text-muted-foreground truncate w-full text-center leading-none">
            {t.label.split(" ")[0]}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main analytics view ───────────────────────────────────────────────────────

function AnalyticsView({
  data,
  preset,
  onPreset,
  startDate,
  endDate,
  onStartDate,
  onEndDate,
  exportUrl,
  isDemo,
}: {
  data: AnalyticsData;
  preset: Preset;
  onPreset: (p: Preset) => void;
  startDate: string;
  endDate: string;
  onStartDate: (v: string) => void;
  onEndDate: (v: string) => void;
  exportUrl: string;
  isDemo: boolean;
}) {
  const { stats, monthly_trends, top_referrers, reward_breakdown } = data;
  const isAuto = stats.vertical === "automotive";

  const totalCount = reward_breakdown.reduce((s, r) => s + r.count, 0) || 1;

  const statCards = [
    {
      label: "Total Referrals",
      value: stats.total_referrals.toLocaleString(),
      sub: "detected in period",
      icon: Users,
      color: "text-[#E0622A]",
      bg: "bg-primary/10",
      border: "border-[#E0622A]/20",
    },
    {
      label: isAuto ? "Deals Closed" : "Exams Completed",
      value: stats.exams_completed.toLocaleString(),
      sub: isAuto ? "referral → closed deal" : "referral → first visit",
      icon: TrendingUp,
      color: "text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
    },
    {
      label: "Rewards Sent",
      value: stats.rewards_sent.toLocaleString(),
      sub: "patients rewarded",
      icon: Gift,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
      border: "border-violet-500/20",
    },
    {
      label: "Reward Value",
      value: `$${stats.total_reward_value.toLocaleString()}`,
      sub: "total claimed",
      icon: DollarSign,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Referral and reward insights for the selected period.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isDemo && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold">
              <Construction className="w-3 h-3" />
              Demo Data
            </span>
          )}
          <a
            href={isDemo ? "#" : exportUrl}
            onClick={isDemo ? e => e.preventDefault() : undefined}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              isDemo
                ? "opacity-40 cursor-not-allowed border-border bg-muted text-muted-foreground"
                : "border-border bg-card hover:bg-muted text-foreground"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </a>
        </div>
      </div>

      {/* Date range controls */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => onPreset(p.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              preset === p.key
                ? "bg-primary text-white border-primary"
                : "border-border bg-card hover:bg-muted text-muted-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
        <div className="flex items-center gap-1.5 ml-2">
          <input
            type="date"
            value={startDate}
            onChange={e => { onStartDate(e.target.value); onPreset("all"); }}
            className="px-2 py-1 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={endDate}
            onChange={e => { onEndDate(e.target.value); onPreset("all"); }}
            className="px-2 py-1 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Trend chart + table */}
      {monthly_trends.length > 0 && (
        <div className="rounded-2xl border border-border bg-card/30 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Monthly Referral Trends</h2>
          </div>
          {monthly_trends.length >= 2 && (
            <div className="px-6 pt-6 pb-2">
              <TrendChart trends={monthly_trends} />
            </div>
          )}
          <div className="divide-y divide-border">
            <div className="hidden md:grid grid-cols-3 px-6 py-2 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Month</span>
              <span>Referrals</span>
              <span>Rewards Sent</span>
            </div>
            {monthly_trends.map(row => (
              <div key={row.period} className="grid md:grid-cols-3 gap-2 px-6 py-3 text-sm hover:bg-muted/20 transition-colors">
                <span className="font-medium text-foreground">{row.label}</span>
                <span className="text-muted-foreground">{row.referrals}</span>
                <span className="text-muted-foreground">{row.rewards_sent}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top referrers */}
        <div className="rounded-2xl border border-border bg-card/30 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">
              {isAuto ? "Top Customers" : "Top Referrers"}
            </h2>
          </div>
          {top_referrers.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground text-center">No data for this period</p>
          ) : (
            <div className="divide-y divide-border">
              {top_referrers.map((r, i) => (
                <div key={r.id} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/20 transition-colors">
                  <span className="text-xs font-bold text-muted-foreground w-5 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{r.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{r.rewards} rewards</p>
                  </div>
                  <div className="flex items-center gap-1 text-[#E0622A] text-sm font-semibold shrink-0">
                    <ArrowUpRight className="w-3 h-3" />
                    {r.referrals}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reward breakdown */}
        <div className="rounded-2xl border border-border bg-card/30 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Reward Type Breakdown</h2>
          </div>
          {reward_breakdown.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground text-center">No claimed rewards yet</p>
          ) : (
            <div className="divide-y divide-border">
              {reward_breakdown.map(r => {
                const pct = Math.round((r.count / totalCount) * 100);
                const barColor = REWARD_COLORS[r.reward_type ?? ""] ?? "bg-muted-foreground";
                return (
                  <div key={r.reward_type} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">{rewardLabel(r.reward_type)}</span>
                      <span className="text-xs text-muted-foreground">{r.count} · ${r.total_value.toLocaleString()} · {pct}%</span>
                    </div>
                    <div className="w-full bg-muted/30 rounded-full h-2">
                      <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { isDemo, isLoading: authIsLoading, demoVertical } = useAuth();
  const { selectedOfficeId } = useOffice();
  const { selectedPracticeId } = usePractice();

  const [preset, setPreset] = useState<Preset>("90d");
  const today = new Date().toISOString().slice(0, 10);

  const [customStart, setCustomStart] = useState("");
  const [customEnd,   setCustomEnd]   = useState(today);

  const { start, end } = useMemo(() => {
    if (customStart && preset === "all") return { start: customStart, end: customEnd };
    return presetDates(preset);
  }, [preset, customStart, customEnd]);

  function handlePreset(p: Preset) {
    setPreset(p);
    setCustomStart("");
    setCustomEnd(today);
  }

  const queryEnabled = !authIsLoading && !isDemo;

  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics", selectedOfficeId, selectedPracticeId, start, end],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedOfficeId && selectedOfficeId !== "all") params.set("office_id", selectedOfficeId);
      if (selectedPracticeId) params.set("practice_id", selectedPracticeId);
      if (start) params.set("start_date", start);
      if (end)   params.set("end_date",   end);
      return customFetch<AnalyticsData>(`${BASE}/api/analytics?${params}`);
    },
    enabled: queryEnabled,
    staleTime: 60_000,
  });

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedOfficeId && selectedOfficeId !== "all") params.set("office_id", selectedOfficeId);
    if (selectedPracticeId) params.set("practice_id", selectedPracticeId);
    if (start) params.set("start_date", start);
    if (end)   params.set("end_date",   end);
    return `${BASE}/api/analytics/export?${params}`;
  }, [selectedOfficeId, selectedPracticeId, start, end]);

  if (isDemo) {
    const demoStats = demoVertical === "automotive" ? DEMO_STATS_AUTO : demoVertical === "salon" ? DEMO_STATS_SALON : DEMO_STATS;
    const demoData: AnalyticsData = {
      stats: {
        total_referrals: demoStats.total_referrals as number ?? 142,
        exams_completed: demoStats.exams_completed as number ?? 98,
        rewards_sent:    demoStats.rewards_issued   as number ?? 89,
        total_reward_value: 4150,
        vertical: demoVertical === "automotive" ? "automotive" : null,
      },
      monthly_trends: DEMO_TRENDS,
      top_referrers: DEMO_TOP_REFERRERS,
      reward_breakdown: demoVertical === "automotive"
        ? [
            { reward_type: "amazon-gift-card", count: 53, total_value: 6360 },
            { reward_type: "charity-donation", count: 36, total_value: 3600 },
          ]
        : DEMO_REWARD_BREAKDOWN,
    };
    return (
      <AnalyticsView
        data={demoData}
        preset={preset}
        onPreset={handlePreset}
        startDate={customStart || (start ?? "")}
        endDate={customEnd || (end ?? "")}
        onStartDate={setCustomStart}
        onEndDate={setCustomEnd}
        exportUrl="#"
        isDemo
      />
    );
  }

  if (authIsLoading || isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-48 bg-muted rounded-lg" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-8 w-20 bg-muted rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-card rounded-2xl border border-border" />)}
        </div>
        <div className="h-64 bg-card rounded-2xl border border-border" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 text-destructive p-6 rounded-2xl">
        <p className="font-bold">Failed to load analytics</p>
        <p className="text-sm mt-1">There was an error communicating with the API.</p>
      </div>
    );
  }

  return (
    <AnalyticsView
      data={data}
      preset={preset}
      onPreset={handlePreset}
      startDate={customStart || (start ?? "")}
      endDate={customEnd || (end ?? "")}
      onStartDate={setCustomStart}
      onEndDate={setCustomEnd}
      exportUrl={exportUrl}
      isDemo={false}
    />
  );
}
