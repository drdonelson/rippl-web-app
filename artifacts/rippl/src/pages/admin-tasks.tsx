import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckSquare, Loader2, AlertTriangle, CheckCircle2, Clock,
  Building2, Heart, Wand2, UserSearch, ChevronDown, X, Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useOffice } from "@/contexts/office-context";
import { customFetch } from "@workspace/api-client-react";
import { DEMO_ADMIN_TASKS, DEMO_ADMIN_TASKS_AUTO } from "@/lib/demo-data";

interface BackfillReport {
  scanned: number;
  resolved: number;
  stillUnknown: number;
  skipped: number;
  errors: Array<{ eventId: string; reason: string }>;
  updates: Array<{ eventId: string; from: string; to: string }>;
}

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type AdminTask = {
  id: string;
  task_type: string;
  amount: number | null;
  notes: string | null;
  status: string;
  referral_event_id: string;
  created_at: string;
  referrer_name: string | null;
  referrer_email: string | null;
  new_patient_name: string | null;
  office_id: string | null;
};

type ReferrerSearchResult = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
};

async function fetchTasks(officeId: string): Promise<AdminTask[]> {
  const params = officeId !== "all" ? `?office_id=${encodeURIComponent(officeId)}` : "";
  return customFetch<AdminTask[]>(`${BASE}/api/admin-tasks${params}`);
}

async function completeTask(id: string): Promise<void> {
  await customFetch(`${BASE}/api/admin-tasks/${id}/complete`, { method: "PATCH" });
}

async function processReward(id: string): Promise<void> {
  await customFetch(`${BASE}/api/admin-tasks/${id}/process-reward`, { method: "POST" });
}

async function matchReferrer(taskId: string, referrerId: string): Promise<void> {
  await customFetch(`${BASE}/api/admin-tasks/${taskId}/match-referrer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ referrer_id: referrerId }),
  });
}

function taskLabel(task_type: string): { icon: React.ReactNode; label: string; color: string } {
  if (task_type === "in_house_credit" || task_type === "apply-credit") {
    return {
      icon: <Building2 className="w-4 h-4" />,
      label: "In-House Credit",
      color: "text-orange-700 bg-orange-50 border-orange-200",
    };
  }
  if (task_type === "charity_donation" || task_type === "charity-donation") {
    return {
      icon: <Heart className="w-4 h-4" />,
      label: "Charity Donation",
      color: "text-pink-700 bg-pink-50 border-pink-200",
    };
  }
  if (task_type === "unmatched-referral") {
    return {
      icon: <UserSearch className="w-4 h-4" />,
      label: "Unmatched Referral",
      color: "text-amber-700 bg-amber-50 border-amber-200",
    };
  }
  if (task_type === "reward-pending") {
    return {
      icon: <AlertTriangle className="w-4 h-4" />,
      label: "Missed Reward",
      color: "text-red-700 bg-red-50 border-red-200",
    };
  }
  return {
    icon: <CheckSquare className="w-4 h-4" />,
    label: task_type.replace(/_/g, " "),
    color: "text-slate-600 bg-slate-100 border-slate-200",
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function runUnknownNameBackfill(): Promise<BackfillReport> {
  return customFetch<BackfillReport>(`${BASE}/api/backfill/unknown-names`, { method: "POST" });
}

// ── Match Referrer Dropdown ───────────────────────────────────────────────────

function MatchReferrerDropdown({
  taskId,
  onSuccess,
}: {
  taskId: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ReferrerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [matching, setMatching] = useState(false);

  const search = async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const data = await customFetch<ReferrerSearchResult[]>(
        `${BASE}/api/admin-tasks/referrers/search?q=${encodeURIComponent(q)}`,
      );
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleMatch = async (referrerId: string) => {
    setMatching(true);
    try {
      await matchReferrer(taskId, referrerId);
      onSuccess();
      setOpen(false);
    } catch {
      // Keep open so user can retry
    } finally {
      setMatching(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all",
          open
            ? "bg-amber-100 border-amber-300 text-amber-800"
            : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100",
        )}
      >
        <UserSearch className="w-3.5 h-3.5" />
        Match Referrer
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-72 z-50 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2">
            <input
              autoFocus
              value={query}
              onChange={e => search(e.target.value)}
              placeholder="Search by name or phone…"
              className="flex-1 text-sm px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
            />
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="max-h-52 overflow-y-auto">
            {searching ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              </div>
            ) : results.length === 0 && query.length >= 2 ? (
              <p className="text-xs text-slate-400 text-center py-4">No referrers found</p>
            ) : results.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Type a name or phone to search</p>
            ) : (
              results.map(r => (
                <button
                  key={r.id}
                  disabled={matching}
                  onClick={() => handleMatch(r.id)}
                  className="w-full text-left px-3 py-2.5 hover:bg-amber-50 transition-colors flex items-start gap-2 disabled:opacity-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{r.name}</p>
                    <p className="text-xs text-slate-400 truncate">{r.phone}{r.email ? ` · ${r.email}` : ""}</p>
                  </div>
                  {matching && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500 mt-0.5 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminTasksPage() {
  const qc = useQueryClient();
  const [completing, setCompleting] = useState<string | null>(null);
  const [backfillResult, setBackfillResult] = useState<BackfillReport | null>(null);
  const { session, isLoading: authLoading, isDemo, demoVertical } = useAuth();
  const { selectedOfficeId } = useOffice();

  const demoTasks = demoVertical === "automotive" ? DEMO_ADMIN_TASKS_AUTO : DEMO_ADMIN_TASKS;

  const { data: tasks, isLoading, isError } = useQuery<AdminTask[]>({
    queryKey: ["admin-tasks", demoVertical, selectedOfficeId],
    queryFn: isDemo ? () => Promise.resolve(demoTasks as AdminTask[]) : () => fetchTasks(selectedOfficeId),
    enabled: isDemo || (!authLoading && !!session),
  });

  const mutation = useMutation({
    mutationFn: completeTask,
    onMutate: (id) => setCompleting(id),
    onSettled: () => setCompleting(null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-tasks"], exact: false }),
  });

  const rewardMutation = useMutation({
    mutationFn: processReward,
    onMutate: (id) => setCompleting(id),
    onSettled: () => setCompleting(null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-tasks"], exact: false }),
  });

  const backfill = useMutation({
    mutationFn: runUnknownNameBackfill,
    onSuccess: (report) => {
      setBackfillResult(report);
      qc.invalidateQueries({ queryKey: ["admin-tasks"] });
      qc.invalidateQueries({ queryKey: ["referral-events"] });
    },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Admin Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Pending in-house credits, charity donations, and unmatched referrals to process.
          </p>
        </div>
        <button
          onClick={() => backfill.mutate()}
          disabled={backfill.isPending}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted/50 text-foreground text-sm font-semibold transition-colors disabled:opacity-60"
          title="Re-resolve any referral events stuck at 'Unknown Patient' using Open Dental"
        >
          {backfill.isPending
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Resolving...</>
            : <><Wand2 className="w-4 h-4" /> Resolve unknown patient names</>}
        </button>
      </div>

      {/* Backfill result banner */}
      {backfillResult && (
        <div
          className={cn(
            "rounded-2xl border p-4 flex items-start justify-between gap-4 flex-wrap",
            backfillResult.resolved > 0
              ? "bg-primary/5 border-primary/20"
              : backfillResult.scanned === 0
                ? "bg-card border-border"
                : "bg-amber-50 border-amber-200",
          )}
        >
          <div className="text-sm">
            <p className="font-semibold text-foreground">
              {backfillResult.scanned === 0
                ? "No unknown-patient events found — nothing to backfill."
                : `Scanned ${backfillResult.scanned}, resolved ${backfillResult.resolved}, still unknown ${backfillResult.stillUnknown}.`}
            </p>
            {backfillResult.updates.length > 0 && (
              <ul className="mt-2 space-y-1 text-muted-foreground text-xs">
                {backfillResult.updates.slice(0, 5).map((u) => (
                  <li key={u.eventId}>✓ Event <span className="font-mono">{u.eventId.slice(0, 8)}</span> → <span className="text-foreground font-medium">{u.to}</span></li>
                ))}
                {backfillResult.updates.length > 5 && (
                  <li className="italic">... and {backfillResult.updates.length - 5} more</li>
                )}
              </ul>
            )}
            {backfillResult.errors.length > 0 && (
              <p className="mt-2 text-xs text-amber-700">
                {backfillResult.errors.length} event{backfillResult.errors.length === 1 ? "" : "s"} failed — see server logs.
              </p>
            )}
          </div>
          <button
            onClick={() => setBackfillResult(null)}
            className="text-muted-foreground hover:text-foreground text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {backfill.isError && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          Backfill failed. Check server logs for details.
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="flex items-center gap-3 p-5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm">Failed to load admin tasks. Please try refreshing.</p>
        </div>
      ) : !tasks || tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">All caught up!</p>
            <p className="text-muted-foreground text-sm mt-1">No pending admin tasks right now.</p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card/30 overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[1fr_1fr_160px_100px_120px_120px] gap-4 px-6 py-3 bg-muted/30 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Patient (Referrer)</span>
            <span>Details</span>
            <span>Type</span>
            <span>Amount</span>
            <span>Date</span>
            <span className="text-center">Action</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {tasks.map((task) => {
              const { icon, label, color } = taskLabel(task.task_type);
              const isUnmatched    = task.task_type === "unmatched-referral";
              const isRewardTask   = task.task_type === "reward-pending";
              const isProcessing   = completing === task.id || mutation.isPending || rewardMutation.isPending;

              return (
                <div
                  key={task.id}
                  className={cn(
                    "grid md:grid-cols-[1fr_1fr_160px_100px_120px_120px] gap-4 px-6 py-4 items-center hover:bg-muted/20 transition-colors",
                    isUnmatched && "bg-amber-50/30",
                  )}
                >
                  {/* Referrer */}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {task.referrer_name ?? (isUnmatched ? "Unknown" : "—")}
                    </p>
                    {task.referrer_email && (
                      <p className="text-xs text-muted-foreground truncate">{task.referrer_email}</p>
                    )}
                  </div>

                  {/* Details */}
                  <div className="min-w-0">
                    {isUnmatched ? (
                      <p className="text-xs text-amber-700 leading-snug line-clamp-2" title={task.notes ?? ""}>
                        {task.notes ?? "No details"}
                      </p>
                    ) : (
                      <p className="text-sm text-foreground truncate">
                        {task.new_patient_name ?? "—"}
                      </p>
                    )}
                  </div>

                  {/* Reward type badge */}
                  <div>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border",
                      color
                    )}>
                      {icon}
                      {label}
                    </span>
                  </div>

                  {/* Amount */}
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {task.amount != null ? `$${task.amount}` : "—"}
                    </p>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-sm">{formatDate(task.created_at)}</span>
                  </div>

                  {/* Action */}
                  <div className="flex justify-center md:justify-end gap-2">
                    {isUnmatched ? (
                      <MatchReferrerDropdown
                        taskId={task.id}
                        onSuccess={() => qc.invalidateQueries({ queryKey: ["admin-tasks"] })}
                      />
                    ) : isRewardTask ? (
                      <button
                        onClick={() => rewardMutation.mutate(task.id)}
                        disabled={isProcessing}
                        title="Send reward notification and create claim"
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                          isProcessing && completing === task.id
                            ? "bg-red-100 border-red-300 text-red-800 cursor-wait"
                            : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                        )}
                      >
                        {isProcessing && completing === task.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Gift className="w-3.5 h-3.5" />
                        )}
                        Send Reward
                      </button>
                    ) : (
                      <button
                        onClick={() => mutation.mutate(task.id)}
                        disabled={isProcessing}
                        title="Mark as complete"
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                          isProcessing && completing === task.id
                            ? "bg-primary/20 text-primary cursor-wait"
                            : "bg-muted/40 border border-border text-muted-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary"
                        )}
                      >
                        {isProcessing && completing === task.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckSquare className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer count */}
          <div className="px-6 py-3 border-t border-border bg-muted/10">
            <p className="text-xs text-muted-foreground">
              {tasks.length} pending task{tasks.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
