import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Droplets, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

export default function Onboard() {
  const { profile } = useAuth();
  const [, navigate] = useLocation();

  const [form, setForm] = useState({
    practice_name: "",
    doctor_name: "",
    email: "",
    password: "",
    customer_key: "",
    location_code: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`${BASE}/api/auth/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create practice account.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all";

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9 text-teal-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Practice Created!</h2>
          <p className="text-white/60 text-sm">
            The practice admin account has been created and can now log in.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <button
              onClick={() => { setSuccess(false); setForm({ practice_name: "", doctor_name: "", email: "", password: "", customer_key: "", location_code: "" }); }}
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

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Onboard New Practice</h1>
            <p className="text-white/40 text-xs">Create a practice admin account</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Practice Name</label>
              <input name="practice_name" value={form.practice_name} onChange={handleChange} required placeholder="Hallmark Dental – Springfield" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Doctor Name</label>
              <input name="doctor_name" value={form.doctor_name} onChange={handleChange} required placeholder="Dr. Jane Smith" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Admin Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="jane@hallmarkdds.com" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Temporary Password</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} required placeholder="Min. 8 characters" minLength={8} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Location Code</label>
              <input name="location_code" value={form.location_code} onChange={handleChange} required placeholder="springfield" className={inputClass} />
              <p className="text-xs text-white/30 mt-1">Lowercase, no spaces (used internally)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Open Dental Customer Key</label>
              <input name="customer_key" value={form.customer_key} onChange={handleChange} required placeholder="16-character key" className={inputClass} />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
              ) : "Create Practice Admin"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
