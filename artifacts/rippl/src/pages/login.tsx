import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Droplets, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth, staffOfficeLabel } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

export default function Login() {
  const { login, session, isLoading, profile } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [loginLabel, setLoginLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && session && !loginSuccess) {
      navigate("/dashboard");
    }
  }, [session, isLoading, loginSuccess, navigate]);

  useEffect(() => {
    if (!loginSuccess || !profile) return;
    const label = staffOfficeLabel(profile.role);
    if (!label) {
      navigate("/dashboard");
      return;
    }
    setLoginLabel(`Logged in as ${label}`);
    const t = setTimeout(() => navigate("/dashboard"), 1800);
    return () => clearTimeout(t);
  }, [loginSuccess, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await login(email, password);
    setSubmitting(false);
    if (err) {
      setError("Invalid email or password. Please try again.");
    } else {
      setLoginSuccess(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left brand panel ───────────────────────────────────────────── */}
      <div className="hidden md:flex w-[45%] bg-gradient-to-br from-teal-600 to-teal-800 flex-col justify-between p-12 relative overflow-hidden shrink-0">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-teal-900/30 rounded-full blur-2xl" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Droplets className="w-6 h-6 text-white" />
          </div>
          <span className="text-white font-bold text-2xl">Rippl</span>
        </div>

        {/* Headline + bullets */}
        <div className="relative">
          <h2 className="text-white font-black text-4xl leading-tight mb-4">
            Turn patients into your best marketers.
          </h2>
          <p className="text-teal-100 text-base leading-relaxed mb-10">
            Automated referral rewards — fully integrated with Open Dental.
          </p>
          <div className="space-y-4">
            {[
              { icon: "⚡", text: "Zero staff work required" },
              { icon: "🦷", text: "EMR-connected, auto-verified" },
              { icon: "💰", text: "Pay only $20 per new patient" },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-base shrink-0">
                  {f.icon}
                </div>
                <span className="text-white font-semibold text-base">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative">
          <p className="text-teal-100/50 text-xs">
            © 2026 Rippl · Made by dentists, for dentists.
          </p>
        </div>
      </div>

      {/* ── Right form panel ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white">
        {/* Mobile logo */}
        <div className="flex flex-col items-center mb-8 md:hidden">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-lg mb-3">
            <Droplets className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Rippl</h1>
          <p className="text-slate-500 text-sm mt-1">Referral rewards for dental practices</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 hidden md:block">
            <h2 className="text-3xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-slate-500 text-base mt-1">Sign in to your practice dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-base font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@yourpractice.com"
                className={cn(
                  "w-full bg-slate-50 border rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400",
                  "focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all",
                  error ? "border-red-400" : "border-slate-200"
                )}
              />
            </div>

            <div>
              <label className="block text-base font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={cn(
                    "w-full bg-slate-50 border rounded-xl px-4 py-3 pr-11 text-slate-900 placeholder:text-slate-400",
                    "focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all",
                    error ? "border-red-400" : "border-slate-200"
                  )}
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

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {loginLabel && (
              <div className="flex items-center gap-2 py-2 px-3 bg-teal-50 border border-teal-200 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span className="text-teal-700 text-sm font-medium">{loginLabel}</span>
              </div>
            )}

            {loginSuccess && !loginLabel && (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
                <span className="text-slate-500 text-sm">Signing in…</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || loginSuccess}
              className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all shadow-md shadow-teal-500/15 hover:shadow-teal-500/25 flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="text-center text-slate-400 text-xs mt-8">
            © 2026 Rippl — Made by dentists, for dentists.
          </p>
        </div>
      </div>
    </div>
  );
}
