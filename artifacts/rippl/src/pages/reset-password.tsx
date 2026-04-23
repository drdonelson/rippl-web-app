import React, { useEffect, useState } from "react";
import { Droplets, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ResetPassword() {
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [showPw, setShowPw]           = useState(false);
  const [ready, setReady]             = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [done, setDone]               = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Exchange the code from the URL for a valid session before allowing the form
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code   = params.get("code");

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) setError("This reset link is invalid or has expired. Request a new one.");
        else setReady(true);
      });
    } else {
      // Legacy hash-based flow (#access_token=...)
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) setReady(true);
        else setError("This reset link is invalid or has expired. Request a new one.");
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters."); return; }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) setError(error.message);
    else setDone(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Rippl</h1>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          {done ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Password updated</h2>
              <p className="text-slate-500 text-sm">You can now log in with your new password.</p>
              <a
                href="/"
                className="inline-block mt-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                Go to login
              </a>
            </div>
          ) : !ready && !error ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : error && !ready ? (
            <div className="text-center space-y-3">
              <p className="text-slate-900 font-semibold">Link expired</p>
              <p className="text-slate-500 text-sm">{error}</p>
              <a href="/" className="inline-block text-primary text-sm underline hover:text-primary/80">Back to login</a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Set new password</h2>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">New password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Min. 8 characters"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 pr-12 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Confirm password</label>
                <input
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  placeholder="Re-enter password"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}
              <button type="submit" disabled={submitting}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
