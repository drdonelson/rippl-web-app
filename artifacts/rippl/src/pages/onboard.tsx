import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  Droplets, Loader2, CheckCircle2, ArrowLeft, Building2,
  UserPlus, Eye, EyeOff, Trash2, AlertTriangle, KeyRound,
  Wifi, WifiOff, Users,
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const inputClass =
  "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all";

interface ActiveOffice {
  id: string;
  name: string;
  location_code: string;
}

interface StaffAccount {
  id: string;
  full_name: string;
  email: string;
  role: string;
  office_name: string;
  location_code: string;
  created_at: string;
}

interface WaitlistLead {
  id: string;
  name: string;
  practice: string;
  email: string;
  phone: string;
  created_at: string;
}

type OdTestResult = { ok: true } | { ok: "reachable" } | { ok: false; error: string } | null;

function roleLabel(role: string): string {
  return role
    .replace("staff_", "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default function Onboard() {
  const { profile, session } = useAuth();
  const [activeTab, setActiveTab] = useState<"practice" | "staff" | "leads">("practice");

  // ── Practice form ─────────────────────────────────────────────────────────
  const [practiceForm, setPracticeForm] = useState({
    practice_name: "", doctor_name: "", email: "", password: "",
    customer_key: "", location_code: "", od_url: "",
  });
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [practiceSubmitting, setPracticeSubmitting] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [practiceSuccess, setPracticeSuccess] = useState(false);
  const [practiceSuccessEmail, setPracticeSuccessEmail] = useState<string | null>(null);
  const [odTestResult, setOdTestResult] = useState<OdTestResult>(null);
  const [odTesting, setOdTesting] = useState(false);

  // ── Staff form ────────────────────────────────────────────────────────────
  const [offices, setOffices] = useState<ActiveOffice[]>([]);
  const [staffForm, setStaffForm] = useState({
    full_name: "", email: "", password: "", office_id: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffSuccessEmail, setStaffSuccessEmail] = useState<string | null>(null);

  // ── Staff accounts list ───────────────────────────────────────────────────
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  // ── Leads ─────────────────────────────────────────────────────────────────
  const [leads, setLeads] = useState<WaitlistLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

  const authHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }), [session]);

  const fetchStaffAccounts = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/staff-accounts`, { headers: authHeaders() });
      if (res.ok) setStaffAccounts(await res.json());
    } catch { /* ignore */ } finally {
      setListLoading(false);
    }
  }, [authHeaders]);

  const fetchLeads = useCallback(async () => {
    setLeadsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/waitlist-leads`, { headers: authHeaders() });
      if (res.ok) setLeads(await res.json());
    } catch { /* ignore */ } finally {
      setLeadsLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetch(`${BASE}/api/offices/active`)
      .then(r => r.json())
      .then((data: ActiveOffice[]) => {
        setOffices(data);
        if (data.length > 0) setStaffForm(f => ({ ...f, office_id: data[0].id }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === "staff" && session) fetchStaffAccounts();
    if (activeTab === "leads" && session) fetchLeads();
  }, [activeTab, session, fetchStaffAccounts, fetchLeads]);

  // Access guard — undefined = still loading, null/missing role = not authorized
  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    );
  }

  if (profile.role !== "super_admin") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
          <p className="text-slate-500">Only super admins can access this page.</p>
          <Link href="/dashboard" className="inline-block mt-4 text-teal-600 hover:text-teal-500 underline text-sm">
            Return to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── OD connectivity test ──────────────────────────────────────────────────
  const handleTestOd = async () => {
    if (!practiceForm.od_url || !practiceForm.customer_key) return;
    setOdTesting(true);
    setOdTestResult(null);
    try {
      const res = await fetch(`${BASE}/api/offices/test-od`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ od_url: practiceForm.od_url, customer_key: practiceForm.customer_key }),
      });
      const data = await res.json();
      setOdTestResult(data);
    } catch {
      setOdTestResult({ ok: false, error: "Network error" });
    } finally {
      setOdTesting(false);
    }
  };

  // ── Practice submit ───────────────────────────────────────────────────────
  const handlePracticeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practiceForm.od_url.trim()) {
      setPracticeError("Open Dental Server URL is required.");
      return;
    }
    if (!agreementChecked) {
      setPracticeError("Please accept the pricing terms before submitting.");
      return;
    }
    setPracticeError(null);
    setPracticeSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/auth/onboard`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(practiceForm),
      });
      const data = await res.json();
      if (!res.ok) setPracticeError(data.error || "Failed to create practice account.");
      else { setPracticeSuccess(true); setPracticeSuccessEmail(practiceForm.email); }
    } catch {
      setPracticeError("Network error. Please try again.");
    } finally {
      setPracticeSubmitting(false);
    }
  };

  // ── Staff submit ──────────────────────────────────────────────────────────
  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError(null);
    setStaffSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/auth/onboard-staff`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(staffForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setStaffError(data.error || "Failed to create staff account.");
      } else {
        setStaffSuccessEmail(staffForm.email);
        setStaffForm({ full_name: "", email: "", password: "", office_id: offices[0]?.id ?? "" });
        setShowPassword(false);
        fetchStaffAccounts();
      }
    } catch {
      setStaffError("Network error. Please try again.");
    } finally {
      setStaffSubmitting(false);
    }
  };

  // ── Delete staff account ──────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setDeleteError(null);
    try {
      const res = await fetch(`${BASE}/api/auth/staff-accounts/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error ?? "Failed to remove account.");
      } else {
        setStaffAccounts(prev => prev.filter(a => a.id !== id));
      }
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Reset staff password ──────────────────────────────────────────────────
  const handleResetPassword = async (id: string, email: string) => {
    setResettingId(id);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://www.joinrippl.com/reset-password",
      });
      if (error) {
        toast.error(`Failed to send reset email: ${error.message}`);
      } else {
        toast.success(`Password reset email sent to ${email}`);
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setResettingId(null);
    }
  };

  // ── Practice success screen ───────────────────────────────────────────────
  if (practiceSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9 text-teal-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Practice Created!</h2>
          <p className="text-slate-500 text-sm">Practice admin account created. A welcome email with a setup link was sent to <span className="font-medium text-slate-700">{practiceSuccessEmail}</span>.</p>
          <div className="flex gap-3 justify-center mt-6">
            <button
              onClick={() => {
                setPracticeSuccess(false);
                setPracticeSuccessEmail(null);
                setPracticeForm({ practice_name: "", doctor_name: "", email: "", password: "", customer_key: "", location_code: "", od_url: "" });
                setAgreementChecked(false);
                setOdTestResult(null);
              }}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 text-sm transition-colors"
            >
              Add another
            </button>
            <Link href="/dashboard" className="px-4 py-2 bg-teal-500 hover:bg-teal-400 rounded-lg text-white font-semibold text-sm transition-colors">
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Derive role from selected office ──────────────────────────────────────
  const selectedOffice = offices.find(o => o.id === staffForm.office_id);
  const derivedRole    = selectedOffice ? `staff_${selectedOffice.location_code}` : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-md relative z-10">
        <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-slate-600 text-sm mb-8 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Account Setup</h1>
            <p className="text-slate-400 text-xs">Create practice or staff accounts</p>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl mb-6">
          <button
            onClick={() => setActiveTab("practice")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg text-sm font-medium transition-all",
              activeTab === "practice" ? "bg-teal-500 text-white shadow" : "text-slate-500 hover:text-slate-900",
            )}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            Practice
          </button>
          <button
            onClick={() => setActiveTab("staff")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg text-sm font-medium transition-all",
              activeTab === "staff" ? "bg-teal-500 text-white shadow" : "text-slate-500 hover:text-slate-900",
            )}
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            Staff
          </button>
          <button
            onClick={() => setActiveTab("leads")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg text-sm font-medium transition-all",
              activeTab === "leads" ? "bg-teal-500 text-white shadow" : "text-slate-500 hover:text-slate-900",
            )}
          >
            <Users className="w-4 h-4 shrink-0" />
            Leads
            {leads.length > 0 && (
              <span className={cn(
                "ml-1 text-xs font-semibold px-1.5 py-0.5 rounded-full",
                activeTab === "leads" ? "bg-white/20 text-white" : "bg-teal-100 text-teal-700",
              )}>
                {leads.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Practice form ── */}
        {activeTab === "practice" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-8">
            <form onSubmit={handlePracticeSubmit} className="space-y-4">

              {/* Practice Identity */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Practice Name</label>
                <input value={practiceForm.practice_name} onChange={e => setPracticeForm(f => ({ ...f, practice_name: e.target.value }))} required placeholder="My Practice – Nashville" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Doctor Name</label>
                <input value={practiceForm.doctor_name} onChange={e => setPracticeForm(f => ({ ...f, doctor_name: e.target.value }))} required placeholder="Dr. Jane Smith" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Admin Email</label>
                <input type="email" value={practiceForm.email} onChange={e => setPracticeForm(f => ({ ...f, email: e.target.value }))} required placeholder="admin@mypractice.com" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Temporary Password</label>
                <input type="password" value={practiceForm.password} onChange={e => setPracticeForm(f => ({ ...f, password: e.target.value }))} required placeholder="Min. 8 characters" minLength={8} className={inputClass} />
              </div>

              {/* Technical Setup */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Technical Setup</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Location Code</label>
                    <input value={practiceForm.location_code} onChange={e => setPracticeForm(f => ({ ...f, location_code: e.target.value }))} required placeholder="springfield" className={inputClass} />
                    <p className="text-xs text-slate-400 mt-1">Lowercase, no spaces (used internally)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Open Dental Customer Key</label>
                    <input value={practiceForm.customer_key} onChange={e => { setPracticeForm(f => ({ ...f, customer_key: e.target.value })); setOdTestResult(null); }} required placeholder="16-character key" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">
                      Open Dental Server URL <span className="text-red-400">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={practiceForm.od_url}
                        onChange={e => { setPracticeForm(f => ({ ...f, od_url: e.target.value })); setOdTestResult(null); }}
                        required
                        placeholder="https://od.theirpractice.com"
                        className={cn(inputClass, "flex-1")}
                      />
                      <button
                        type="button"
                        onClick={handleTestOd}
                        disabled={odTesting || !practiceForm.od_url || !practiceForm.customer_key}
                        className="shrink-0 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:border-teal-400 hover:text-teal-600 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {odTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test"}
                      </button>
                    </div>
                    {odTestResult !== null && (
                      <div className={cn(
                        "mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium",
                        odTestResult.ok === true && "bg-teal-50 border-teal-200 text-teal-700",
                        odTestResult.ok === "reachable" && "bg-amber-50 border-amber-200 text-amber-700",
                        odTestResult.ok === false && "bg-red-50 border-red-200 text-red-600",
                      )}>
                        {odTestResult.ok === true && <><Wifi className="w-4 h-4 shrink-0" /> Connected</>}
                        {odTestResult.ok === "reachable" && <><Wifi className="w-4 h-4 shrink-0" /> Server reachable — check customer key</>}
                        {odTestResult.ok === false && <><WifiOff className="w-4 h-4 shrink-0" /> {(odTestResult as any).error ?? "Connection failed"}</>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Agreement */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreementChecked}
                    onChange={e => setAgreementChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500/30"
                  />
                  <span className="text-sm text-slate-700 leading-relaxed">
                    I agree to Rippl referral pricing terms — <span className="font-semibold">$20 per completed referral, no monthly fee</span>
                  </span>
                </label>
              </div>

              {practiceError && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{practiceError}</p>
              )}
              <div>
                <button
                  type="submit"
                  disabled={practiceSubmitting || !agreementChecked}
                  className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {practiceSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : "Create Practice Admin"}
                </button>
                {!agreementChecked && (
                  <p className="text-xs text-slate-400 text-center mt-2">Accept the pricing terms above to continue</p>
                )}
              </div>
            </form>
          </div>
        )}

        {/* ── Staff tab ── */}
        {activeTab === "staff" && (
          <>
            {/* ── Staff success banner ── */}
            {staffSuccessEmail && (
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-teal-700 font-semibold text-sm">Account created!</p>
                  <p className="text-teal-600 text-xs mt-0.5">
                    <span className="font-mono">{staffSuccessEmail}</span> can now log in at joinrippl.com
                  </p>
                </div>
                <button onClick={() => setStaffSuccessEmail(null)} className="ml-auto text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
              </div>
            )}

            {/* ── Staff form ── */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 shadow-2xl mb-6">
              <form onSubmit={handleStaffSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Full Name</label>
                  <input value={staffForm.full_name} onChange={e => setStaffForm(f => ({ ...f, full_name: e.target.value }))} required placeholder="e.g. Sarah Johnson" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Email</label>
                  <input type="email" value={staffForm.email} onChange={e => setStaffForm(f => ({ ...f, email: e.target.value }))} required placeholder="frontdesk@hallmarkdds.com" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Temporary Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={staffForm.password}
                      onChange={e => setStaffForm(f => ({ ...f, password: e.target.value }))}
                      required
                      placeholder="Min. 8 characters"
                      minLength={8}
                      className={cn(inputClass, "pr-12")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Assign to Office</label>
                  {offices.length === 0 ? (
                    <p className="text-slate-400 text-sm">No offices found. Create a practice first.</p>
                  ) : (
                    <select
                      value={staffForm.office_id}
                      onChange={e => setStaffForm(f => ({ ...f, office_id: e.target.value }))}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                    >
                      {offices.map(o => {
                        const d = o.name.lastIndexOf("–");
                        const display = d !== -1 ? o.name.slice(d + 2).trim() : o.name;
                        return <option key={o.id} value={o.id}>{display}</option>;
                      })}
                    </select>
                  )}
                  {derivedRole && (
                    <p className="text-xs text-teal-600 mt-1.5 flex items-center gap-1">
                      <span className="text-slate-400">Role assigned:</span>
                      <code className="font-mono bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded text-teal-700">{derivedRole}</code>
                    </p>
                  )}
                </div>
                {staffError && (
                  <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{staffError}</p>
                )}
                <button
                  type="submit"
                  disabled={staffSubmitting || offices.length === 0}
                  className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {staffSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : "Create Staff Account"}
                </button>
              </form>
            </div>

            {/* ── Existing staff accounts list ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-slate-900 font-semibold text-sm">Existing Staff Accounts</h2>
                <button onClick={fetchStaffAccounts} disabled={listLoading} className="text-xs text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40">
                  {listLoading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : "Refresh"}
                </button>
              </div>

              {deleteError && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-400 text-xs">{deleteError}</p>
                </div>
              )}

              {listLoading && staffAccounts.length === 0 ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                </div>
              ) : staffAccounts.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl px-5 py-6 text-center">
                  <p className="text-slate-400 text-sm">No staff accounts yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {staffAccounts.map(acct => (
                    <div
                      key={acct.id}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-900 text-sm font-medium truncate">
                          {acct.full_name || <span className="text-slate-400 italic">No name</span>}
                        </p>
                        <p className="text-slate-500 text-xs truncate">{acct.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-600 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 font-mono">
                            {acct.role}
                          </span>
                          {acct.office_name && (
                            <span className="text-xs text-slate-400 truncate">· {acct.office_name}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleResetPassword(acct.id, acct.email)}
                        disabled={resettingId === acct.id}
                        className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-500/10 transition-all disabled:opacity-40"
                        title={`Send password reset email to ${acct.email}`}
                      >
                        {resettingId === acct.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <KeyRound className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(acct.id)}
                        disabled={deletingId === acct.id}
                        className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                        title="Remove access"
                      >
                        {deletingId === acct.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Leads tab ── */}
        {activeTab === "leads" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-slate-900 font-semibold text-sm">Waitlist Leads</h2>
              <button onClick={fetchLeads} disabled={leadsLoading} className="text-xs text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40">
                {leadsLoading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : "Refresh"}
              </button>
            </div>

            {leadsLoading && leads.length === 0 ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
              </div>
            ) : leads.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl px-5 py-10 flex flex-col items-center gap-3 text-center">
                <Users className="w-8 h-8 text-slate-300" />
                <p className="text-slate-700 font-medium text-sm">No leads yet</p>
                <p className="text-slate-400 text-xs max-w-xs">Practices interested in Rippl appear here after filling out the form at joinrippl.com/join.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leads.map(lead => (
                  <div key={lead.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-slate-900 text-sm font-medium">{lead.name}</p>
                        <p className="text-slate-500 text-xs">{lead.practice}</p>
                      </div>
                      <p className="text-slate-400 text-xs shrink-0">{new Date(lead.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
                      <a href={`mailto:${lead.email}`} className="text-xs text-teal-600 hover:underline">{lead.email}</a>
                      {lead.phone && <span className="text-xs text-slate-400">{lead.phone}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
