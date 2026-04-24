import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { customFetch } from "@workspace/api-client-react";
import {
  Users, UserPlus, Trash2, Building2, Loader2, X, Eye, EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Demo fake data ─────────────────────────────────────────────────────────────

const DEMO_STAFF = [
  { id: "s1", full_name: "Sarah Johnson",  email: "frontdesk@brentwood.demo",  office_name: "Brentwood",  role_label: "Front Desk" },
  { id: "s2", full_name: "Mike Williams",  email: "frontdesk@lewisburg.demo",  office_name: "Lewisburg",  role_label: "Front Desk" },
  { id: "s3", full_name: "Lisa Chen",      email: "frontdesk@greenbrier.demo", office_name: "Greenbrier", role_label: "Front Desk" },
];

// ── Types ──────────────────────────────────────────────────────────────────────

interface StaffAccount {
  id: string;
  full_name: string;
  email: string;
  role: string;
  office_id: string;
  office_name: string;
  location_code: string;
  created_at: string;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Add Staff Modal ────────────────────────────────────────────────────────────

function AddStaffModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      await customFetch(`${BASE}/api/auth/onboard-staff`, {
        method: "POST",
        body: JSON.stringify(form),
      });
    },
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (err: any) => setError(err?.data?.error ?? err.message ?? "Failed to create account"),
  });

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const inputClass = "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl z-10">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Add Staff Account</h3>
        <p className="text-slate-500 text-sm mb-5">Create a login for your front desk or office staff.</p>

        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Full name</label>
            <input required value={form.full_name} onChange={set("full_name")} placeholder="Jane Smith" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input required type="email" value={form.email} onChange={set("email")} placeholder="jane@yourpractice.com" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Temporary password</label>
            <div className="relative">
              <input
                required
                type={showPw ? "text" : "password"}
                value={form.password}
                onChange={set("password")}
                placeholder="Min. 8 characters"
                minLength={8}
                className={cn(inputClass, "pr-11")}
              />
              <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const { isDemo, profile } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // super_admin goes to the full onboard page
  if (!isDemo && profile?.role === "super_admin") {
    navigate("/onboard");
    return null;
  }

  // staff_* can't manage other staff
  if (!isDemo && profile?.role?.startsWith("staff_")) {
    navigate("/dashboard");
    return null;
  }

  // ── Demo view ──────────────────────────────────────────────────────────────
  if (isDemo) {
    return (
      <div className="space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Staff Accounts</h1>
            <p className="text-muted-foreground mt-1">Manage front desk and admin staff who can access the dashboard.</p>
          </div>
          <button disabled className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-primary/30 text-primary-foreground/50 rounded-xl font-semibold text-sm cursor-not-allowed opacity-60">
            <UserPlus className="w-4 h-4" /><span className="hidden sm:inline">Add Staff</span>
          </button>
        </div>
        <div className="rounded-2xl border border-border bg-card/30 overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_2fr_1.5fr_1.5fr] gap-4 px-6 py-3 bg-muted/20 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
            <span>Name</span><span>Email</span><span>Office</span><span>Role</span>
          </div>
          <div className="divide-y divide-border">
            {DEMO_STAFF.map(acct => (
              <div key={acct.id} className="grid md:grid-cols-[2fr_2fr_1.5fr_1.5fr] gap-4 px-6 py-4 text-sm items-center">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {acct.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <span className="font-semibold text-foreground truncate">{acct.full_name}</span>
                </div>
                <div className="text-muted-foreground text-xs truncate">{acct.email}</div>
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <Building2 className="w-3.5 h-3.5 shrink-0 text-primary/60" />
                  <span className="truncate">{acct.office_name}</span>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                  {acct.role_label}
                </span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Read-only demo view — staff management is disabled in demo mode.</p>
      </div>
    );
  }

  // ── Real practice_admin view ───────────────────────────────────────────────

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { data: staff = [], isLoading, error } = useQuery<StaffAccount[]>({
    queryKey: ["/api/auth/staff-accounts"],
    queryFn: () => customFetch<StaffAccount[]>(`${BASE}/api/auth/staff-accounts`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customFetch(`${BASE}/api/auth/staff-accounts/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/auth/staff-accounts"] }); setDeletingId(null); },
  });

  const roleLabel = (role: string) => {
    if (role === "practice_admin") return "Practice Admin";
    if (role.startsWith("staff_")) return "Front Desk";
    return role;
  };

  return (
    <div className="space-y-8">
      {showAdd && (
        <AddStaffModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ["/api/auth/staff-accounts"] })}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Staff Accounts</h1>
          <p className="text-muted-foreground mt-1">Manage who has access to your practice dashboard.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold text-sm transition-colors"
        >
          <UserPlus className="w-4 h-4" /><span className="hidden sm:inline">Add Staff</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
        </div>
      ) : error ? (
        <p className="text-destructive text-sm">Failed to load staff accounts.</p>
      ) : staff.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 rounded-2xl border border-dashed border-border bg-muted/10">
          <Users className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No staff accounts yet. Add your front desk team above.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card/30 overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_2fr_1.5fr_1.5fr_48px] gap-4 px-6 py-3 bg-muted/20 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
            <span>Name</span><span>Email</span><span>Office</span><span>Role</span><span />
          </div>
          <div className="divide-y divide-border">
            {staff.map(acct => (
              <div key={acct.id} className="grid md:grid-cols-[2fr_2fr_1.5fr_1.5fr_48px] gap-4 px-6 py-4 text-sm items-center hover:bg-muted/10 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {(acct.full_name || acct.email).split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <span className="font-semibold text-foreground truncate">{acct.full_name || "(no name)"}</span>
                </div>
                <div className="text-muted-foreground text-xs truncate">{acct.email}</div>
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <Building2 className="w-3.5 h-3.5 shrink-0 text-primary/60" />
                  <span className="truncate">{acct.office_name || "—"}</span>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                  {roleLabel(acct.role)}
                </span>
                <div className="flex items-center justify-end">
                  {deletingId === acct.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteMutation.mutate(acct.id)}
                        disabled={deleteMutation.isPending}
                        className="text-xs text-destructive hover:underline font-semibold disabled:opacity-50"
                      >
                        {deleteMutation.isPending ? "…" : "Yes"}
                      </button>
                      <span className="text-muted-foreground text-xs">/</span>
                      <button onClick={() => setDeletingId(null)} className="text-xs text-muted-foreground hover:underline">No</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingId(acct.id)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Remove account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Staff can view Dashboard, Events, Patients, and Admin Tasks. They cannot manage campaigns, offices, or other staff accounts.
      </p>
    </div>
  );
}
