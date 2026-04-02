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

  // Navigate if user is already logged in before submitting the form
  useEffect(() => {
    if (!isLoading && session && !loginSuccess) {
      navigate("/dashboard");
    }
  }, [session, isLoading, loginSuccess, navigate]);

  // After a successful login attempt, wait for the profile to load then navigate.
  // For staff accounts, briefly show the office label before redirecting.
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
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-teal-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[300px] bg-teal-600/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-xl shadow-teal-500/20 mb-4">
            <Droplets className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Rippl</h1>
          <p className="text-teal-400/80 text-sm mt-2 font-medium tracking-wide">
            Referral rewards for dental practices
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@yourpractice.com"
                className={cn(
                  "w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder:text-white/30",
                  "focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all",
                  error ? "border-red-500/50" : "border-white/10"
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={cn(
                    "w-full bg-white/5 border rounded-xl px-4 py-3 pr-11 text-white placeholder:text-white/30",
                    "focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all",
                    error ? "border-red-500/50" : "border-white/10"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {loginLabel && (
              <div className="flex items-center gap-2 py-2 px-3 bg-teal-500/10 border border-teal-500/20 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
                <span className="text-teal-300 text-sm font-medium">{loginLabel}</span>
              </div>
            )}

            {loginSuccess && !loginLabel && (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />
                <span className="text-white/50 text-sm">Signing in…</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || loginSuccess}
              className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          © 2026 Rippl — Made by dentists, for dentists.
        </p>
      </div>
    </div>
  );
}
