import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Loader2, CheckCircle2, Zap, Plug, Target } from "lucide-react";
import { useAuth, staffOfficeLabel } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

const VERTICALS = ["Dental", "Automotive", "Salon"] as const;

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
    if (!isLoading && session && !loginSuccess && !submitting) {
      navigate("/dashboard");
    }
  }, [session, isLoading, loginSuccess, submitting, navigate]);

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
        <Loader2 className="w-8 h-8 text-[#E0622A] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left brand panel ─────────────────────────────────────────── */}
      <div
        className="hidden md:flex w-[45%] flex-col justify-between p-12 relative overflow-hidden shrink-0"
        style={{ background: "linear-gradient(135deg, #F5A623 0%, #E0622A 100%)" }}
      >
        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 -right-16 w-56 h-56 bg-white/5 rounded-full blur-2xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-black/10 rounded-full blur-2xl" />
        </div>

        {/* Logo */}
        <div className="relative">
          <span className="font-bold text-3xl tracking-tight" style={{ fontFamily: "var(--font-sans)" }}>
            <span className="text-white/70">rip</span><span className="text-white">pl</span>
          </span>
        </div>

        {/* Headline block */}
        <div className="relative space-y-8">
          <div>
            <h2
              className="text-white text-5xl leading-[1.1] mb-5"
              style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700 }}
            >
              Turn customers into your best marketers.
            </h2>
            <p className="text-white/80 text-base leading-relaxed">
              Automatic referral rewards — detected, sent, and celebrated without a single staff step.
            </p>
          </div>

          {/* Feature bullets */}
          <div className="space-y-3">
            {[
              { Icon: Zap,    text: "Zero staff work required" },
              { Icon: Plug,   text: "Software-connected, auto-verified" },
              { Icon: Target, text: "Only pay when referrals fire" },
            ].map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-semibold text-base">{text}</span>
              </div>
            ))}
          </div>

          {/* Vertical badges */}
          <div className="flex items-center gap-2 pt-2">
            {VERTICALS.map((v, i) => (
              <React.Fragment key={v}>
                <span className="text-white/70 text-sm font-medium">{v}</span>
                {i < VERTICALS.length - 1 && (
                  <span className="text-white/30 text-xs">·</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative flex items-center justify-between">
          <p className="text-white/40 text-xs">© 2026 Rippl</p>
          <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-300 shrink-0" />
            <span className="text-white/70 text-xs font-medium">SMS verified by Twilio</span>
          </div>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white">

        {/* Mobile logo */}
        <div className="flex flex-col items-center mb-8 md:hidden">
          <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: "var(--font-sans)" }}>
            <span className="text-slate-900">rip</span><span className="text-[#E0622A]">pl</span>
          </h1>
          <p className="text-slate-500 text-sm">Automated referral rewards</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 hidden md:block">
            <h2 className="text-3xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-slate-500 text-base mt-1">Sign in to your dashboard</p>
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
                placeholder="you@yourbusiness.com"
                className={cn(
                  "w-full bg-slate-50 border rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400",
                  "focus:outline-none focus:ring-2 focus:ring-[#E0622A]/30 focus:border-[#E0622A] transition-all",
                  error ? "border-red-400" : "border-slate-200"
                )}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-base font-medium text-slate-700">Password</label>
                <a
                  href="/reset-password"
                  className="text-sm text-[#E0622A] hover:text-[#C9551E] transition-colors font-medium"
                >
                  Forgot password?
                </a>
              </div>
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
                    "focus:outline-none focus:ring-2 focus:ring-[#E0622A]/30 focus:border-[#E0622A] transition-all",
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
              <div className="flex items-center gap-2 py-2 px-3 bg-orange-50 border border-orange-200 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-[#E0622A] flex-shrink-0" />
                <span className="text-orange-700 text-sm font-medium">{loginLabel}</span>
              </div>
            )}

            {loginSuccess && !loginLabel && (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 className="w-4 h-4 text-[#E0622A] animate-spin" />
                <span className="text-slate-500 text-sm">Signing in…</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || loginSuccess}
              className="w-full bg-[#E0622A] hover:bg-[#C9551E] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all shadow-md shadow-[#E0622A]/20 flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="text-center text-slate-400 text-xs mt-8">
            © 2026 Rippl
          </p>
        </div>
      </div>
    </div>
  );
}
