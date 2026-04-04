import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Loader2, AlertTriangle, CheckCircle2, Clock, Building2, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type AdminTask = {
  id: string;
  task_type: string;
  amount: number | null;
  notes: string | null;
  completed: boolean;
  referral_event_id: string;
  created_at: string;
  referrer_name: string | null;
  referrer_email: string | null;
  new_patient_name: string | null;
};

async function fetchTasks(): Promise<AdminTask[]> {
  const res = await fetch(`${BASE}/api/admin-tasks`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load tasks");
  return res.json();
}

async function completeTask(id: string): Promise<void> {
  const res = await fetch(`${BASE}/api/admin-tasks/${id}/complete`, {
    method: "PATCH",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to complete task");
}

function taskLabel(task_type: string): { icon: React.ReactNode; label: string; color: string } {
  if (task_type === "in_house_credit") {
    return {
      icon: <Building2 className="w-4 h-4" />,
      label: "In-House Credit",
      color: "text-teal-400 bg-teal-500/10 border-teal-500/20",
    };
  }
  if (task_type === "charity_donation") {
    return {
      icon: <Heart className="w-4 h-4" />,
      label: "Charity Donation",
      color: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    };
  }
  return {
    icon: <CheckSquare className="w-4 h-4" />,
    label: task_type.replace(/_/g, " "),
    color: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminTasksPage() {
  const qc = useQueryClient();
  const [completing, setCompleting] = useState<string | null>(null);
  const { session, isLoading: authLoading } = useAuth();

  const { data: tasks, isLoading, isError } = useQuery<AdminTask[]>({
    queryKey: ["admin-tasks"],
    queryFn: fetchTasks,
    enabled: !authLoading && !!session,
  });

  const mutation = useMutation({
    mutationFn: completeTask,
    onMutate: (id) => setCompleting(id),
    onSettled: () => setCompleting(null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-tasks"] }),
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Admin Tasks</h1>
        <p className="text-muted-foreground mt-1">
          Pending in-house credits to apply and charity donations to process.
        </p>
      </div>

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
          <div className="hidden md:grid grid-cols-[1fr_1fr_140px_100px_120px_80px] gap-4 px-6 py-3 bg-muted/30 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Patient (Referrer)</span>
            <span>New Patient</span>
            <span>Reward Type</span>
            <span>Amount</span>
            <span>Date</span>
            <span className="text-center">Done</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {tasks.map((task) => {
              const { icon, label, color } = taskLabel(task.task_type);
              const isProcessing = completing === task.id || mutation.isPending;

              return (
                <div
                  key={task.id}
                  className="grid md:grid-cols-[1fr_1fr_140px_100px_120px_80px] gap-4 px-6 py-4 items-center hover:bg-muted/20 transition-colors"
                >
                  {/* Referrer */}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {task.referrer_name ?? "—"}
                    </p>
                    {task.referrer_email && (
                      <p className="text-xs text-muted-foreground truncate">{task.referrer_email}</p>
                    )}
                  </div>

                  {/* New patient */}
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {task.new_patient_name ?? "—"}
                    </p>
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

                  {/* Mark complete */}
                  <div className="flex justify-center md:justify-center">
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
