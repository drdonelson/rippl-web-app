import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Droplets, Loader2, CheckCircle2, ArrowLeft, Building2, UserPlus } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all";

interface ActiveOffice {
  id: string;
  name: string;
  location_code: string;
}

export default function Onboard() {
  const { profile, session } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"practice" | "staff">("practice");

  // ── Practice form state ──────────────────────────────────────────────────
  const [practiceForm, setPracticeForm] = useState({
    practice_name: "", doctor_name: "", email: "", password: "",
    customer_key: "", location_code: "",
  });
  const [practiceSubmitting, setPracticeSubmitting] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [practiceSuccess, setPracticeSuccess] = useState(false);

  // ── Staff form state ─────────────────────────────────────────────────────
  const [offices, setOffices] = useState<ActiveOffice[]>([]);
  const [staffForm, setStaffForm] = useState({
    full_name: "", email: "", password: "", office_id: "",
  });
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffSuccess, setStaffSuccess] = useState(false);

  // Fetch active offices for the staff form
  useEffect(() => {
    fetch(`${BASE}/api/offices/active`)
      .then(r => r.json())
      .then((data: ActiveOffice[]) => {
        setOffices(data);
        if (data.length > 0) setStaffForm(f => ({ ...f, office_id: data[0].id }));
      })
      .catch(() => {});
  }, []);

  // Access guard — only super_admin may use this page
  if (profile && profile.role !== "super_admin") {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          <p className="text-white/50">Only super admins can access this page.</p>
          <Link href="/dashboard" className="inline-block mt-4 text-teal-400 hover:text-teal-300 underline text-sm">
            Return to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const authHeaders = () => ({
    "Content-Type": "application/json",
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  });

  // ── Practice submit ──────────────────────────────────────────────────────
  const handlePracticeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      else setPracticeSuccess(true);
    } catch {
      setPracticeError("Network error. Please try again.");
    } finally {
      setPracticeSubmitting(false);
    }
  };

  // ── Staff submit ─────────────────────────────────────────────────────────
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
      if (!res.ok) setStaffError(data.error || "Failed to create staff account.");
      else setStaffSuccess(true);
    } catch {
      setStaffError("Network error. Please try again.");
    } finally {
      setStaffSubmitting(false);
    }
  };

  // ── Success screens ──────────────────────────────────────────────────────
  if (practiceSuccess || staffSuccess) {
    const isPractice = practiceSuccess;
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9 text-teal-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            {isPractice ? "Practice Created!" : "Staff Account Created!"}
          </h2>
          <p className="text-white/60 text-sm">
            {isPractice
              ? "The practice admin account has been created and can now log in."
              : "The staff account has been created. They can log in immediately."}
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <button
              onClick={() => {
                if (isPractice) {
                  setPracticeSuccess(false);
                  setPracticeForm({ practice_name: "", doctor_name: "", email: "", password: "", customer_key: "", location_code: "" });
                } else {
                  setStaffSuccess(false);
                  setStaffForm({ full_name: "", email: "", password: "", office_id: offices[0]?.id ?? "" });
                }
              }}
              className="px-4 py-2 border border-white/10 rounded-lg text-white/70 hover:text-white text-sm transition-colors"
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

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md relative z-10">
        <Link href="/dashboard" className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Account Setup</h1>
            <p className="text-white/40 text-xs">Create practice or staff accounts</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl mb-6">
          <button
            onClick={() => setActiveTab("practice")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === "practice"
                ? "bg-teal-500 text-white shadow"
                : "text-white/50 hover:text-white"
            )}
          >
            <Building2 className="w-4 h-4" />
            New Practice
          </button>
          <button
            onClick={() => setActiveTab("staff")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === "staff"
                ? "bg-teal-500 text-white shadow"
                : "text-white/50 hover:text-white"
            )}
          >
            <UserPlus className="w-4 h-4" />
            New Staff Account
          </button>
        </div>

        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl">

          {/* ── New Practice form ── */}
          {activeTab === "practice" && (
            <form onSubmit={handlePracticeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Practice Name</label>
                <input name="practice_name" value={practiceForm.practice_name} onChange={e => setPracticeForm(f => ({ ...f, practice_name: e.target.value }))} required placeholder="My Practice – Nashville" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Doctor Name</label>
                <input name="doctor_name" value={practiceForm.doctor_name} onChange={e => setPracticeForm(f => ({ ...f, doctor_name: e.target.value }))} required placeholder="Dr. Jane Smith" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Admin Email</label>
                <input name="email" type="email" value={practiceForm.email} onChange={e => setPracticeForm(f => ({ ...f, email: e.target.value }))} required placeholder="admin@mypractice.com" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Temporary Password</label>
                <input name="password" type="password" value={practiceForm.password} onChange={e => setPracticeForm(f => ({ ...f, password: e.target.value }))} required placeholder="Min. 8 characters" minLength={8} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Location Code</label>
                <input name="location_code" value={practiceForm.location_code} onChange={e => setPracticeForm(f => ({ ...f, location_code: e.target.value }))} required placeholder="springfield" className={inputClass} />
                <p className="text-xs text-white/30 mt-1">Lowercase, no spaces (used internally)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Open Dental Customer Key</label>
                <input name="customer_key" value={practiceForm.customer_key} onChange={e => setPracticeForm(f => ({ ...f, customer_key: e.target.value }))} required placeholder="16-character key" className={inputClass} />
              </div>
              {practiceError && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{practiceError}</p>
              )}
              <button type="submit" disabled={practiceSubmitting} className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2">
                {practiceSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : "Create Practice Admin"}
              </button>
            </form>
          )}

          {/* ── New Staff Account form ── */}
          {activeTab === "staff" && (
            <form onSubmit={handleStaffSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Full Name</label>
                <input value={staffForm.full_name} onChange={e => setStaffForm(f => ({ ...f, full_name: e.target.value }))} placeholder="e.g. Sarah Johnson" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Email</label>
                <input type="email" value={staffForm.email} onChange={e => setStaffForm(f => ({ ...f, email: e.target.value }))} required placeholder="staff@mypractice.com" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Temporary Password</label>
                <input type="password" value={staffForm.password} onChange={e => setStaffForm(f => ({ ...f, password: e.target.value }))} required placeholder="Min. 8 characters" minLength={8} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Assign to Office</label>
                {offices.length === 0 ? (
                  <p className="text-white/40 text-sm">No offices found. Create a practice first.</p>
                ) : (
                  <select
                    value={staffForm.office_id}
                    onChange={e => setStaffForm(f => ({ ...f, office_id: e.target.value }))}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all"
                  >
                    {offices.map(o => {
                      const d = o.name.lastIndexOf("–");
                      const display = d !== -1 ? o.name.slice(d + 2).trim() : o.name;
                      return <option key={o.id} value={o.id}>{display}</option>;
                    })}
                  </select>
                )}
                <p className="text-xs text-white/30 mt-1">Staff role is derived automatically from the selected office.</p>
              </div>
              {staffError && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{staffError}</p>
              )}
              <button type="submit" disabled={staffSubmitting || offices.length === 0} className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2">
                {staffSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : "Create Staff Account"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
