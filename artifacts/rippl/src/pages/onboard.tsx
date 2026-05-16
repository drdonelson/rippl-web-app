import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  Loader2, CheckCircle2, ArrowLeft, Building2, UserPlus, Eye, EyeOff,
  Trash2, AlertTriangle, KeyRound, Wifi, WifiOff, Users, ChevronRight,
  RefreshCw, Sparkles, Copy, Check, ExternalLink, ChevronDown, ChevronUp,
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

// ── Helpers ───────────────────────────────────────────────────────────────────

function genPassword(len = 14): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  return Array.from(crypto.getRandomValues(new Uint8Array(len)))
    .map(b => chars[b % chars.length])
    .join("");
}

function roleLabel(role: string): string {
  return role.replace("staff_", "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActiveOffice { id: string; name: string; location_code: string; }
interface StaffAccount {
  id: string; full_name: string; email: string;
  role: string; office_name: string; location_code: string; created_at: string;
}
interface WaitlistLead {
  id: string; name: string; practice: string;
  email: string; phone: string; created_at: string;
}
type OdTestResult = { ok: true } | { ok: "reachable" } | { ok: false; error: string } | null;
type Vertical = "dental" | "automotive" | "salon" | "other";

const VERTICALS: { id: Vertical; label: string; icon: string; subtitle: string }[] = [
  { id: "dental",     label: "Dental",     icon: "🦷", subtitle: "Open Dental" },
  { id: "automotive", label: "Automotive", icon: "🚗", subtitle: "DriveCentric" },
  { id: "salon",      label: "Salon",      icon: "💇", subtitle: "Vagaro" },
  { id: "other",      label: "Other",      icon: "⚡", subtitle: "Manual trigger" },
];

// ── Shared input styles ────────────────────────────────────────────────────────

const inputClass =
  "w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E0622A]/25 focus:border-[#E0622A] transition-all";

// ── Reusable field wrapper ────────────────────────────────────────────────────

function Field({
  label, hint, required = false, children,
}: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {label}{required && <span className="text-[#E0622A] ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400 leading-relaxed">{hint}</p>}
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 p-2 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Password field with show/generate/copy ────────────────────────────────────

function PasswordField({
  value, onChange, placeholder = "Min. 8 characters",
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex gap-1">
      <div className="relative flex-1">
        <input
          required
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          minLength={8}
          className={cn(inputClass, "pr-10")}
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      <button
        type="button"
        onClick={() => onChange(genPassword())}
        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-500 hover:border-[#E0622A]/50 hover:text-[#E0622A] text-xs font-medium transition-all"
        title="Generate a strong password"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Generate
      </button>
      {value && <CopyButton value={value} />}
    </div>
  );
}

// ── Practice success panel ────────────────────────────────────────────────────

function PracticeSuccessPanel({
  practiceName, email, newOfficeId,
  onAddStaff, onAddAnother,
}: {
  practiceName: string; email: string; newOfficeId: string | null;
  onAddStaff: (officeId: string) => void; onAddAnother: () => void;
}) {
  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
        <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Practice is live</h2>
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{practiceName}</span> has been created.
          The referral poller will start on the next cycle.
        </p>
        <div className="mt-3 inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
          <span className="text-xs text-slate-400">Setup email sent to</span>
          <span className="text-xs font-semibold text-slate-700 font-mono">{email}</span>
        </div>
      </div>

      {/* Next steps */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">What's next</p>
        </div>
        <div className="divide-y divide-slate-100">
          {newOfficeId && (
            <button
              onClick={() => onAddStaff(newOfficeId)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-orange-50/50 transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#E0622A]/10 flex items-center justify-center shrink-0">
                <UserPlus className="w-4 h-4 text-[#E0622A]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">Add staff accounts</p>
                <p className="text-xs text-slate-400">Create front desk logins for this practice</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#E0622A] transition-colors" />
            </button>
          )}
          <Link href="/practice-admin">
            <div className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer group">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">View all practices</p>
                <p className="text-xs text-slate-400">Manage settings, billing, and integrations</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
            </div>
          </Link>
        </div>
      </div>

      <button
        onClick={onAddAnother}
        className="w-full text-center text-sm text-slate-400 hover:text-slate-600 transition-colors py-1"
      >
        + Set up another practice
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Onboard() {
  const { profile, session } = useAuth();
  const [activeTab, setActiveTab] = useState<"practice" | "staff" | "leads">("practice");

  // ── Practice form ─────────────────────────────────────────────────────────
  const [practiceForm, setPracticeForm] = useState({
    practice_name: "", doctor_name: "", email: "", password: "",
    vertical: "dental" as Vertical,
    // Dental (Open Dental)
    customer_key: "", location_code: "", od_url: "",
    // Automotive (DriveCentric)
    drivecentic_api_key: "", dealer_id: "", lead_source_tag: "",
    // Salon (Vagaro)
    vagaro_business_id: "", vagaro_api_key: "",
    // White label
    white_label_enabled: false,
    white_label_name: "", white_label_logo_url: "", white_label_primary_color: "",
    show_powered_by_rippl: true,
    // In-house credit
    in_house_credit_label: "", in_house_credit_value: "",
  });
  const [whiteLabelExpanded, setWhiteLabelExpanded] = useState(false);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [practiceSubmitting, setPracticeSubmitting] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [practiceSuccess, setPracticeSuccess] = useState(false);
  const [practiceSuccessEmail, setPracticeSuccessEmail] = useState<string | null>(null);
  const [practiceSuccessName, setPracticeSuccessName] = useState<string | null>(null);
  const [newOfficeId, setNewOfficeId] = useState<string | null>(null);
  const [odTestResult, setOdTestResult] = useState<OdTestResult>(null);
  const [odTesting, setOdTesting] = useState(false);

  // ── Staff form ────────────────────────────────────────────────────────────
  const [offices, setOffices] = useState<ActiveOffice[]>([]);
  const [staffForm, setStaffForm] = useState({
    full_name: "", email: "", password: "", office_id: "",
  });
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffSuccessEmail, setStaffSuccessEmail] = useState<string | null>(null);
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

  const fetchOffices = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/offices/active`);
      const data: ActiveOffice[] = await r.json();
      setOffices(data);
      setStaffForm(f => ({ ...f, office_id: f.office_id || data[0]?.id || "" }));
    } catch { /* ignore */ }
  }, []);

  const fetchStaffAccounts = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/staff-accounts`, { headers: authHeaders() });
      if (res.ok) setStaffAccounts(await res.json());
    } catch { /* ignore */ } finally { setListLoading(false); }
  }, [authHeaders]);

  const fetchLeads = useCallback(async () => {
    setLeadsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/waitlist-leads`, { headers: authHeaders() });
      if (res.ok) setLeads(await res.json());
    } catch { /* ignore */ } finally { setLeadsLoading(false); }
  }, [authHeaders]);

  useEffect(() => { fetchOffices(); }, [fetchOffices]);

  useEffect(() => {
    if (activeTab === "staff" && session) fetchStaffAccounts();
    if (activeTab === "leads" && session) fetchLeads();
  }, [activeTab, session, fetchStaffAccounts, fetchLeads]);

  // ── Guards ────────────────────────────────────────────────────────────────

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-[#E0622A]" />
      </div>
    );
  }

  if (profile.role !== "super_admin") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-slate-900 font-semibold">Access denied</p>
          <p className="text-slate-400 text-sm">Super admin only.</p>
          <Link href="/dashboard" className="inline-block text-[#E0622A] text-sm hover:underline">
            Return to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleTestOd = async () => {
    if (!practiceForm.od_url || !practiceForm.customer_key) return;
    setOdTesting(true);
    setOdTestResult(null);
    try {
      const res = await fetch(`${BASE}/api/offices/test-od`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ od_url: practiceForm.od_url, customer_key: practiceForm.customer_key }),
      });
      setOdTestResult(await res.json());
    } catch {
      setOdTestResult({ ok: false, error: "Network error" });
    } finally { setOdTesting(false); }
  };

  const handlePracticeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pf = practiceForm;
    if (pf.vertical === "dental" && !pf.od_url.trim()) { setPracticeError("Open Dental Server URL is required for dental practices."); return; }
    if (!agreementChecked) { setPracticeError("Accept the pricing terms to continue."); return; }
    setPracticeError(null);
    setPracticeSubmitting(true);

    const integration_config: Record<string, string> =
      pf.vertical === "automotive" ? { drivecentic_api_key: pf.drivecentic_api_key, dealer_id: pf.dealer_id, lead_source_tag: pf.lead_source_tag } :
      pf.vertical === "salon"      ? { vagaro_business_id: pf.vagaro_business_id, vagaro_api_key: pf.vagaro_api_key } :
      {};

    const body = {
      practice_name: pf.practice_name, doctor_name: pf.doctor_name,
      email: pf.email, password: pf.password,
      vertical: pf.vertical, location_code: pf.location_code,
      customer_key: pf.vertical === "dental" ? pf.customer_key : undefined,
      od_url: pf.vertical === "dental" ? pf.od_url : undefined,
      integration_config,
      white_label_name: pf.white_label_enabled && pf.white_label_name ? pf.white_label_name : undefined,
      white_label_logo_url: pf.white_label_enabled && pf.white_label_logo_url ? pf.white_label_logo_url : undefined,
      white_label_primary_color: pf.white_label_enabled && pf.white_label_primary_color ? pf.white_label_primary_color.replace(/^#/, "") : undefined,
      show_powered_by_rippl: pf.show_powered_by_rippl,
      in_house_credit_label: pf.in_house_credit_label || undefined,
      in_house_credit_value: pf.in_house_credit_value ? parseInt(pf.in_house_credit_value, 10) : undefined,
    };

    try {
      const res = await fetch(`${BASE}/api/auth/onboard`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setPracticeError(data.error || "Failed to create practice account.");
      } else {
        setPracticeSuccess(true);
        setPracticeSuccessEmail(pf.email);
        setPracticeSuccessName(pf.practice_name);
        setNewOfficeId(data.office_id ?? null);
        fetchOffices();
      }
    } catch {
      setPracticeError("Network error. Please try again.");
    } finally { setPracticeSubmitting(false); }
  };

  const handleAddStaff = (officeId: string) => {
    setStaffForm(f => ({ ...f, office_id: officeId }));
    setActiveTab("staff");
    fetchStaffAccounts();
  };

  const handleAddAnother = () => {
    setPracticeSuccess(false);
    setPracticeSuccessEmail(null);
    setPracticeSuccessName(null);
    setNewOfficeId(null);
    setPracticeForm({
      practice_name: "", doctor_name: "", email: "", password: "",
      vertical: "dental", customer_key: "", location_code: "", od_url: "",
      drivecentic_api_key: "", dealer_id: "", lead_source_tag: "",
      vagaro_business_id: "", vagaro_api_key: "",
      white_label_enabled: false, white_label_name: "", white_label_logo_url: "",
      white_label_primary_color: "", show_powered_by_rippl: true,
      in_house_credit_label: "", in_house_credit_value: "",
    });
    setAgreementChecked(false);
    setOdTestResult(null);
    setWhiteLabelExpanded(false);
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError(null);
    setStaffSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/auth/onboard-staff`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify(staffForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setStaffError(data.error || "Failed to create staff account.");
      } else {
        setStaffSuccessEmail(staffForm.email);
        setStaffForm(f => ({ ...f, full_name: "", email: "", password: "" }));
        fetchStaffAccounts();
      }
    } catch {
      setStaffError("Network error. Please try again.");
    } finally { setStaffSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setDeleteError(null);
    try {
      const res = await fetch(`${BASE}/api/auth/staff-accounts/${id}`, {
        method: "DELETE", headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error ?? "Failed to remove account.");
      } else {
        setStaffAccounts(prev => prev.filter(a => a.id !== id));
      }
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally { setDeletingId(null); }
  };

  const handleResetPassword = async (id: string, email: string) => {
    setResettingId(id);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://www.joinrippl.com/reset-password",
      });
      if (error) toast.error(`Failed: ${error.message}`);
      else toast.success(`Reset email sent to ${email}`);
    } catch {
      toast.error("Network error.");
    } finally { setResettingId(null); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedOffice = offices.find(o => o.id === staffForm.office_id);
  const derivedRole    = selectedOffice ? `staff_${selectedOffice.location_code}` : null;

  const pf = practiceForm;
  const setPf = (field: keyof typeof practiceForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setPracticeForm(f => ({ ...f, [field]: e.target.value }));

  const integrationLabel = pf.vertical === "dental" ? "Open Dental Setup"
    : pf.vertical === "automotive" ? "DriveCentric Setup"
    : pf.vertical === "salon"      ? "Vagaro Setup"
    : "Integration";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-2xl mx-auto px-5 py-10">

        {/* Back link */}
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm mb-8 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Dashboard
        </Link>

        {/* Page header */}
        <div className="mb-7">
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-xl font-bold text-slate-900">Practice Console</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
              super admin
            </span>
          </div>
          <p className="text-sm text-slate-400">Create and manage practice accounts on Rippl.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 p-1 bg-white border border-slate-200 rounded-xl mb-6 shadow-sm">
          {([
            { key: "practice", label: "New Practice", icon: Building2 },
            { key: "staff",    label: "Staff Accounts", icon: UserPlus },
            { key: "leads",    label: "Waitlist", icon: Users, badge: leads.length },
          ] as const).map(({ key, label, icon: Icon, badge }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all",
                activeTab === key
                  ? "bg-[#E0622A] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50",
              )}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{label}</span>
              {badge !== undefined && badge > 0 && (
                <span className={cn(
                  "ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none",
                  activeTab === key ? "bg-white/25 text-white" : "bg-orange-100 text-orange-600",
                )}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Practice tab ── */}
        {activeTab === "practice" && (
          practiceSuccess && practiceSuccessEmail && practiceSuccessName ? (
            <PracticeSuccessPanel
              practiceName={practiceSuccessName}
              email={practiceSuccessEmail}
              newOfficeId={newOfficeId}
              onAddStaff={handleAddStaff}
              onAddAnother={handleAddAnother}
            />
          ) : (
            <form onSubmit={handlePracticeSubmit} className="space-y-4">

              {/* ── Section 1+2 grid: Identity + Integration ── */}
              <div className="grid md:grid-cols-2 gap-4">

                {/* Left: Identity */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                    <div className="w-5 h-5 rounded-md bg-[#E0622A]/10 flex items-center justify-center">
                      <span className="text-[#E0622A] font-bold text-[10px]">1</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Practice Identity</p>
                  </div>

                  <Field label="Practice Name" required>
                    <input value={pf.practice_name} onChange={setPf("practice_name")} required
                      placeholder="Sunrise Dental – Nashville" className={inputClass} />
                  </Field>

                  <Field label="Doctor / Owner Name" required>
                    <input value={pf.doctor_name} onChange={setPf("doctor_name")} required
                      placeholder="Dr. Jane Smith" className={inputClass} />
                  </Field>

                  <Field label="Admin Email" required>
                    <input type="email" value={pf.email} onChange={setPf("email")} required
                      placeholder="admin@sunrisedental.com" className={inputClass} />
                  </Field>

                  <Field label="Temporary Password" required>
                    <PasswordField value={pf.password} onChange={v => setPracticeForm(f => ({ ...f, password: v }))} />
                  </Field>
                </div>

                {/* Right: Vertical + Integration */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                    <div className="w-5 h-5 rounded-md bg-[#E0622A]/10 flex items-center justify-center">
                      <span className="text-[#E0622A] font-bold text-[10px]">2</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{integrationLabel}</p>
                  </div>

                  {/* Vertical selector */}
                  <Field label="Business Type" required>
                    <div className="grid grid-cols-2 gap-1.5">
                      {VERTICALS.map(v => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => { setPracticeForm(f => ({ ...f, vertical: v.id })); setOdTestResult(null); }}
                          className={cn(
                            "flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border text-center transition-all text-xs font-medium",
                            pf.vertical === v.id
                              ? "bg-[#E0622A]/5 border-[#E0622A] text-[#E0622A]"
                              : "bg-white border-slate-200 text-slate-500 hover:border-slate-300",
                          )}
                        >
                          <span className="text-base leading-none">{v.icon}</span>
                          <span className="font-semibold">{v.label}</span>
                          <span className={cn("text-[10px]", pf.vertical === v.id ? "text-[#E0622A]/70" : "text-slate-400")}>{v.subtitle}</span>
                        </button>
                      ))}
                    </div>
                  </Field>

                  {/* Location code — always shown */}
                  <Field
                    label="Location Code" required
                    hint={pf.location_code ? `Staff role: staff_${pf.location_code}` : "Lowercase, no spaces — e.g. springfield"}
                  >
                    <input
                      value={pf.location_code}
                      onChange={e => setPracticeForm(f => ({ ...f, location_code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))}
                      required placeholder="springfield" className={inputClass}
                    />
                  </Field>

                  {/* Dental fields */}
                  {pf.vertical === "dental" && (<>
                    <Field label="Customer Key" required hint="16-character key from Open Dental eConnector">
                      <input value={pf.customer_key} onChange={e => { setPracticeForm(f => ({ ...f, customer_key: e.target.value })); setOdTestResult(null); }}
                        required placeholder="XXXXXXXXXXXXXXXX" className={cn(inputClass, "font-mono text-xs tracking-widest")} />
                    </Field>
                    <Field label="Server URL" required>
                      <div className="space-y-2">
                        <div className="flex gap-1.5">
                          <input
                            value={pf.od_url}
                            onChange={e => { setPracticeForm(f => ({ ...f, od_url: e.target.value })); setOdTestResult(null); }}
                            required placeholder="https://od.theirpractice.com"
                            className={cn(inputClass, "flex-1")}
                          />
                          <button
                            type="button"
                            onClick={handleTestOd}
                            disabled={odTesting || !pf.od_url || !pf.customer_key}
                            className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 text-slate-500 hover:border-[#E0622A]/50 hover:text-[#E0622A] text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {odTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                            Test
                          </button>
                        </div>
                        {odTestResult !== null && (
                          <div className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium",
                            odTestResult.ok === true        && "bg-emerald-50 border-emerald-200 text-emerald-700",
                            odTestResult.ok === "reachable" && "bg-amber-50 border-amber-200 text-amber-700",
                            odTestResult.ok === false        && "bg-red-50 border-red-200 text-red-600",
                          )}>
                            {odTestResult.ok === true        && <><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Connected — credentials verified</>}
                            {odTestResult.ok === "reachable" && <><Wifi className="w-3.5 h-3.5 shrink-0" /> Server reachable — verify customer key</>}
                            {odTestResult.ok === false        && <><WifiOff className="w-3.5 h-3.5 shrink-0" /> {(odTestResult as { ok: false; error: string }).error}</>}
                          </div>
                        )}
                      </div>
                    </Field>
                  </>)}

                  {/* Automotive fields */}
                  {pf.vertical === "automotive" && (<>
                    <Field label="DriveCentric API Key" hint="From DriveCentric partner portal">
                      <input value={pf.drivecentic_api_key} onChange={setPf("drivecentic_api_key")}
                        placeholder="dc_live_..." className={cn(inputClass, "font-mono text-xs")} />
                    </Field>
                    <Field label="Dealer ID" hint="DriveCentric dealer identifier">
                      <input value={pf.dealer_id} onChange={setPf("dealer_id")}
                        placeholder="dealer_12345" className={inputClass} />
                    </Field>
                    <Field label="Lead Source Tag" hint="Tag used to filter Rippl referrals (e.g. 'rippl')">
                      <input value={pf.lead_source_tag} onChange={setPf("lead_source_tag")}
                        placeholder="rippl" className={inputClass} />
                    </Field>
                  </>)}

                  {/* Salon fields */}
                  {pf.vertical === "salon" && (<>
                    <Field label="Vagaro Business ID" hint="From Vagaro Developer Dashboard">
                      <input value={pf.vagaro_business_id} onChange={setPf("vagaro_business_id")}
                        placeholder="your-salon" className={inputClass} />
                    </Field>
                    <Field label="Vagaro API Key" hint="Partner API key for appointment webhooks">
                      <input value={pf.vagaro_api_key} onChange={setPf("vagaro_api_key")}
                        placeholder="vg_..." className={cn(inputClass, "font-mono text-xs")} />
                    </Field>
                  </>)}

                  {/* Other / manual */}
                  {pf.vertical === "other" && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                      <p className="text-xs font-semibold text-slate-500">Webhook trigger URL</p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        After creation, you'll receive a manual trigger endpoint at:
                      </p>
                      <code className="block text-[11px] font-mono bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-600 break-all">
                        POST /api/webhooks/manual/&#123;officeId&#125;
                      </code>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Section 3: White Label ── */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setWhiteLabelExpanded(v => !v)}
                  className="w-full flex items-center gap-2 px-5 py-4 text-left hover:bg-slate-50/50 transition-colors"
                >
                  <div className="w-5 h-5 rounded-md bg-[#E0622A]/10 flex items-center justify-center shrink-0">
                    <span className="text-[#E0622A] font-bold text-[10px]">3</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex-1">White Label Branding</p>
                  <span className="text-[10px] text-slate-400 mr-2">optional</span>
                  {whiteLabelExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {whiteLabelExpanded && (
                  <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox" checked={pf.white_label_enabled}
                        onChange={e => setPracticeForm(f => ({ ...f, white_label_enabled: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 text-[#E0622A] focus:ring-[#E0622A]/30 shrink-0"
                      />
                      <span className="text-sm text-slate-700">Enable white label — hide Rippl branding for this practice</span>
                    </label>

                    {pf.white_label_enabled && (
                      <div className="space-y-4 pt-1">
                        <Field label="Brand Name" hint="Shown instead of 'Rippl' on the claim page">
                          <input value={pf.white_label_name} onChange={setPf("white_label_name")}
                            placeholder="Sunrise Rewards" className={inputClass} />
                        </Field>
                        <Field label="Logo URL" hint="HTTPS URL to a PNG/SVG — shown on the claim page header">
                          <input value={pf.white_label_logo_url} onChange={setPf("white_label_logo_url")}
                            placeholder="https://cdn.example.com/logo.png" className={inputClass} />
                        </Field>
                        <Field label="Primary Color" hint="Hex code for buttons and accents (without #)">
                          <div className="flex gap-2">
                            <input value={pf.white_label_primary_color} onChange={setPf("white_label_primary_color")}
                              placeholder="E0622A" maxLength={7}
                              className={cn(inputClass, "flex-1 font-mono text-sm")} />
                            {pf.white_label_primary_color && (
                              <div
                                className="w-10 h-10 rounded-lg border border-slate-200 shrink-0"
                                style={{ backgroundColor: `#${pf.white_label_primary_color.replace(/^#/, "")}` }}
                              />
                            )}
                          </div>
                        </Field>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox" checked={pf.show_powered_by_rippl}
                            onChange={e => setPracticeForm(f => ({ ...f, show_powered_by_rippl: e.target.checked }))}
                            className="h-4 w-4 rounded border-slate-300 text-[#E0622A] focus:ring-[#E0622A]/30 shrink-0"
                          />
                          <span className="text-sm text-slate-700">Show "Powered by Rippl" on claim page</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Section 4: In-house Credit ── */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <div className="w-5 h-5 rounded-md bg-[#E0622A]/10 flex items-center justify-center">
                    <span className="text-[#E0622A] font-bold text-[10px]">4</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex-1">In-house Credit</p>
                  <span className="text-[10px] text-slate-400">optional — defaults to $100 dental credit</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Credit Label" hint="e.g. '$50 Service Credit' or '$100 Account Credit'">
                    <input value={pf.in_house_credit_label} onChange={setPf("in_house_credit_label")}
                      placeholder="$100 Dental Account Credit" className={inputClass} />
                  </Field>
                  <Field label="Credit Value ($)" hint="Dollar amount applied to the account">
                    <input type="number" value={pf.in_house_credit_value} onChange={setPf("in_house_credit_value")}
                      placeholder="100" min="1" max="10000" className={inputClass} />
                  </Field>
                </div>
              </div>

              {/* ── Section 5: Pricing Agreement ── */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
                  <div className="w-5 h-5 rounded-md bg-[#E0622A]/10 flex items-center justify-center">
                    <span className="text-[#E0622A] font-bold text-[10px]">5</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pricing Agreement</p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox" checked={agreementChecked}
                    onChange={e => setAgreementChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#E0622A] focus:ring-[#E0622A]/30 shrink-0"
                  />
                  <span className="text-sm text-slate-700 leading-relaxed">
                    This practice agrees to Rippl's referral pricing —
                    {" "}<span className="font-semibold text-slate-900">$20 per completed referral, no monthly fee.</span>
                    {" "}The first charge occurs when the first referral is detected.
                  </span>
                </label>
              </div>

              {/* Error */}
              {practiceError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{practiceError}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={practiceSubmitting || !agreementChecked}
                className="w-full bg-[#E0622A] hover:bg-[#C9551E] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
              >
                {practiceSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating practice…</>
                  : !agreementChecked
                  ? "Accept pricing terms to continue"
                  : "Create Practice"}
              </button>

            </form>
          )
        )}

        {/* ── Staff tab ── */}
        {activeTab === "staff" && (
          <div className="space-y-5">

            {/* Success banner */}
            {staffSuccessEmail && (
              <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-emerald-800">Account created</p>
                  <p className="text-xs text-emerald-600 font-mono">{staffSuccessEmail}</p>
                </div>
                <button onClick={() => setStaffSuccessEmail(null)} className="text-emerald-400 hover:text-emerald-600 text-lg leading-none">×</button>
              </div>
            )}

            {/* Staff form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100 pb-3">Create Staff Login</p>
              <form onSubmit={handleStaffSubmit} className="space-y-4">

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Full Name" required>
                    <input value={staffForm.full_name}
                      onChange={e => setStaffForm(f => ({ ...f, full_name: e.target.value }))}
                      required placeholder="Sarah Johnson" className={inputClass} />
                  </Field>
                  <Field label="Assign to Office" required>
                    {offices.length === 0 ? (
                      <p className="text-slate-400 text-sm py-2.5">No offices yet — create a practice first.</p>
                    ) : (
                      <select
                        value={staffForm.office_id}
                        onChange={e => setStaffForm(f => ({ ...f, office_id: e.target.value }))}
                        required
                        className={cn(inputClass, "cursor-pointer")}
                      >
                        <option value="">Select office…</option>
                        {offices.map(o => {
                          const d = o.name.lastIndexOf("–");
                          return <option key={o.id} value={o.id}>{d !== -1 ? o.name.slice(d + 2).trim() : o.name}</option>;
                        })}
                      </select>
                    )}
                    {derivedRole && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        Role: <code className="font-mono bg-slate-100 px-1 rounded text-slate-600">{derivedRole}</code>
                      </p>
                    )}
                  </Field>
                </div>

                <Field label="Email" required>
                  <input type="email" value={staffForm.email}
                    onChange={e => setStaffForm(f => ({ ...f, email: e.target.value }))}
                    required placeholder="frontdesk@practice.com" className={inputClass} />
                </Field>

                <Field label="Temporary Password" required>
                  <PasswordField
                    value={staffForm.password}
                    onChange={v => setStaffForm(f => ({ ...f, password: v }))}
                  />
                </Field>

                {staffError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600">{staffError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={staffSubmitting || offices.length === 0}
                  className="w-full bg-[#E0622A] hover:bg-[#C9551E] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                >
                  {staffSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : "Create Staff Account"}
                </button>
              </form>
            </div>

            {/* Staff list */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Existing Accounts</p>
                <button onClick={fetchStaffAccounts} disabled={listLoading}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40">
                  <RefreshCw className={cn("w-3 h-3", listLoading && "animate-spin")} />
                </button>
              </div>

              {deleteError && (
                <div className="flex items-center gap-2 px-5 py-2.5 bg-red-50 border-b border-red-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <p className="text-xs text-red-600">{deleteError}</p>
                </div>
              )}

              {listLoading && staffAccounts.length === 0 ? (
                <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-slate-300 animate-spin" /></div>
              ) : staffAccounts.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Users className="w-7 h-7 text-slate-200" />
                  <p className="text-sm text-slate-400">No staff accounts yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {staffAccounts.map(acct => (
                    <div key={acct.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold shrink-0">
                        {(acct.full_name || acct.email).slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{acct.full_name || <span className="text-slate-400 italic">No name</span>}</p>
                        <p className="text-xs text-slate-400 truncate">{acct.email}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{acct.role}</span>
                          {acct.office_name && <span className="text-[10px] text-slate-400">· {acct.office_name}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleResetPassword(acct.id, acct.email)}
                        disabled={resettingId === acct.id}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-[#E0622A] hover:bg-orange-50 transition-all disabled:opacity-40"
                        title="Send password reset"
                      >
                        {resettingId === acct.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDelete(acct.id)}
                        disabled={deletingId === acct.id}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all disabled:opacity-40"
                        title="Remove access"
                      >
                        {deletingId === acct.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Leads tab ── */}
        {activeTab === "leads" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{leads.length} {leads.length === 1 ? "lead" : "leads"} from <span className="font-mono text-xs">joinrippl.com/join</span></p>
              <button onClick={fetchLeads} disabled={leadsLoading}
                className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40">
                <RefreshCw className={cn("w-3.5 h-3.5", leadsLoading && "animate-spin")} />
              </button>
            </div>

            {leadsLoading && leads.length === 0 ? (
              <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 text-slate-300 animate-spin" /></div>
            ) : leads.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl flex flex-col items-center gap-3 py-16 text-center shadow-sm">
                <Users className="w-8 h-8 text-slate-200" />
                <p className="text-sm font-medium text-slate-400">No waitlist leads yet</p>
                <p className="text-xs text-slate-300 max-w-xs">Practices interested in Rippl appear here after submitting the form at joinrippl.com/join</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
                {leads.map(lead => (
                  <div key={lead.id} className="flex items-start justify-between gap-3 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">{lead.name}</p>
                      <p className="text-xs text-slate-400 mb-1.5">{lead.practice}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                        <a href={`mailto:${lead.email}`} className="text-xs text-[#E0622A] hover:underline">{lead.email}</a>
                        {lead.phone && <span className="text-xs text-slate-400">{lead.phone}</span>}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-300 shrink-0 mt-0.5">
                      {new Date(lead.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
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
