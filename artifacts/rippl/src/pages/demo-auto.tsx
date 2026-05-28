import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Droplets, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export default function DemoAuto() {
  const { loginAsAutoDemo, session, profile, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && session && profile?.role === "demo") {
      navigate("/dashboard");
    }
  }, [session, profile, isLoading, navigate]);

  const handleAccess = async () => {
    setError(null);
    setLoading(true);
    const { error: err } = await loginAsAutoDemo();
    setLoading(false);
    if (err) {
      setError("Unable to access dashboard. Please try again.");
    } else {
      navigate("/dashboard");
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Rippl logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E0622A] to-[#C9551E] flex items-center justify-center shadow-lg shadow-[#E0622A]/20 mb-4">
            <Droplets className="w-8 h-8 text-white" />
          </div>
          <span className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Powered by Rippl</span>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center space-y-5">
          <div>
            <p className="text-xs font-semibold text-[#E0622A] uppercase tracking-widest mb-2">Summit Auto Group</p>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">
              Your referral dashboard<br />is ready
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Track customer referrals, automate rewards, and drive more vehicle sales — all in one place.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-2 text-left text-sm text-slate-500">
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-orange-100 text-[#E0622A] flex items-center justify-center text-xs font-bold shrink-0">✓</span>
              <span>6 active referrers with unique links</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-orange-100 text-[#E0622A] flex items-center justify-center text-xs font-bold shrink-0">✓</span>
              <span>11 referral events across all stages</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-orange-100 text-[#E0622A] flex items-center justify-center text-xs font-bold shrink-0">✓</span>
              <span>4 Amazon gift card rewards fulfilled</span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleAccess}
            disabled={loading}
            className="w-full bg-[#E0622A] hover:bg-[#c9551e] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors shadow-md shadow-[#E0622A]/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Accessing…</>
            ) : (
              "Access Dashboard"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
