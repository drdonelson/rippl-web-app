import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Droplets, Loader2, Play, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Link } from "wouter";

const DEMO_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export default function Demo() {
  const { loginAsDemo, session, profile, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && session && profile?.role === "demo") {
      // Set demo session start time
      const existing = localStorage.getItem("rippl_demo_start");
      if (!existing) {
        localStorage.setItem("rippl_demo_start", Date.now().toString());
      }
      navigate("/dashboard");
    }
  }, [session, profile, isLoading, navigate]);

  const handleTryDemo = async () => {
    setError(null);
    setLoading(true);
    localStorage.setItem("rippl_demo_start", Date.now().toString());
    const { error: err } = await loginAsDemo();
    setLoading(false);
    if (err) {
      setError("Demo is temporarily unavailable. Please try again.");
      localStorage.removeItem("rippl_demo_start");
    } else {
      navigate("/dashboard");
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
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-teal-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <Link href="/" className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-10 transition-colors w-fit mx-auto">
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>

        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-xl shadow-teal-500/20 mb-4">
            <Droplets className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Rippl Demo</h1>
          <p className="text-teal-400/80 text-sm mt-2 font-medium text-center">
            Explore the platform with sample data — no sign-up needed
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="space-y-3 text-sm text-white/60">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">✓</span>
              <span>5 Nashville patients with referral QR codes</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">✓</span>
              <span>12 referral events across all status stages</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">✓</span>
              <span>2 rewards sent — Amazon gift card &amp; in-house credit</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">!</span>
              <span>Session lasts 30 minutes · No real patient data is shown</span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleTryDemo}
            disabled={loading}
            className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Starting demo…</>
            ) : (
              <><Play className="w-4 h-4" /> Try Demo — No sign-up needed</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
