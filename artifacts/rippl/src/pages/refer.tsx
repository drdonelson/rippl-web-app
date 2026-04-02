import React, { useState, useEffect } from "react";
import { Droplets, Phone, Calendar, CheckCircle2, Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const OFFICES = [
  "Brentwood",
  "Lewisburg",
  "Greenbrier",
];

interface ReferrerInfo {
  referrer_name: string;
  referral_code: string;
  office_name: string;
}

function buildApiUrl(path: string) {
  const origin = window.location.origin;
  return `${origin}${BASE}${path}`;
}

export default function Refer() {
  const params = new URLSearchParams(window.location.search);
  const refCode = params.get("ref")?.trim() || "";

  const [referrerInfo, setReferrerInfo] = useState<ReferrerInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(true);
  const [infoError, setInfoError] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [phone, setPhone]         = useState("");
  const [email, setEmail]         = useState("");
  const [office, setOffice]       = useState(OFFICES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (refCode) {
      try { localStorage.setItem("rippl_ref", refCode); } catch {}
    } else {
      try {
        const stored = localStorage.getItem("rippl_ref");
        if (stored) { window.history.replaceState({}, "", `${window.location.pathname}?ref=${stored}`); }
      } catch {}
    }

    if (!refCode) {
      setInfoLoading(false);
      return;
    }

    fetch(buildApiUrl(`/api/referral/${encodeURIComponent(refCode)}`))
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: ReferrerInfo) => { setReferrerInfo(data); setInfoLoading(false); })
      .catch(() => { setInfoError(true); setInfoLoading(false); });
  }, [refCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setFormError("Please fill in your name and phone number.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(buildApiUrl("/api/referral/leads"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          office_preference: office,
          referral_code: refCode || undefined,
        }),
      });
      if (!res.ok) throw new Error("Server error");
      setSubmitted(true);
    } catch {
      setFormError("Something went wrong. Please try again or call us directly.");
    } finally {
      setSubmitting(false);
    }
  };

  const officeName = referrerInfo?.office_name || "Hallmark Dental";
  const referrerName = referrerInfo?.referrer_name;

  if (infoLoading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-teal-400 animate-spin" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0f2040] border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-20 h-20 bg-teal-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-teal-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">You're all set!</h2>
          <p className="text-white/60 mb-6">
            Our team at <span className="text-white font-semibold">{officeName}</span> will reach out shortly to schedule your first appointment.
          </p>
          <p className="text-sm text-teal-400">
            {referrerName ? `Thanks to ${referrerName} for the recommendation!` : "We look forward to meeting you!"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl" />
      </div>

      <main className="relative z-10 flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-10">
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Droplets className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">Rippl</h1>
            <p className="text-xs text-teal-400 leading-tight">{officeName}</p>
          </div>
        </div>

        <div className="bg-[#0f2040] border border-white/10 rounded-3xl p-7 shadow-2xl mb-5">
          {!infoError && referrerName ? (
            <>
              <p className="text-teal-400 text-sm font-semibold tracking-wider uppercase mb-2">Personal Invitation</p>
              <h2 className="text-2xl font-bold text-white mb-3 leading-tight">
                {referrerName} invited you to try {officeName}!
              </h2>
              <p className="text-white/60 text-sm leading-relaxed">
                You've been personally referred by a trusted patient of ours. Request an appointment below — we'll reach out to get you scheduled.
              </p>
            </>
          ) : (
            <>
              <p className="text-teal-400 text-sm font-semibold tracking-wider uppercase mb-2">New Patient Welcome</p>
              <h2 className="text-2xl font-bold text-white mb-3 leading-tight">
                Welcome to {officeName}!
              </h2>
              <p className="text-white/60 text-sm leading-relaxed">
                Request a new patient appointment below and our team will reach out shortly to get you scheduled.
              </p>
            </>
          )}

          <div className="flex gap-3 mt-5">
            <a
              href="tel:+16155550100"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-semibold transition-all text-sm"
            >
              <Phone className="w-4 h-4 text-teal-400" />
              Call Office
            </a>
            <button
              onClick={() => document.getElementById("appt-form")?.scrollIntoView({ behavior: "smooth" })}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-semibold transition-all text-sm shadow-lg shadow-teal-500/20"
            >
              <Calendar className="w-4 h-4" />
              Request Appointment
            </button>
          </div>
        </div>

        <div id="appt-form" className="bg-[#0f2040] border border-white/10 rounded-3xl p-7 shadow-2xl">
          <h3 className="text-lg font-bold text-white mb-1">Request an Appointment</h3>
          <p className="text-white/50 text-sm mb-6">Fill in your info and we'll be in touch within one business day.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">First Name *</label>
                <input
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Jane"
                  className="w-full px-4 py-2.5 bg-[#0a1628] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-teal-400/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Last Name *</label>
                <input
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="w-full px-4 py-2.5 bg-[#0a1628] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-teal-400/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Phone Number *</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(615) 555-0100"
                className="w-full px-4 py-2.5 bg-[#0a1628] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-teal-400/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Email (Optional)</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full px-4 py-2.5 bg-[#0a1628] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-teal-400/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">
                <MapPin className="w-3 h-3 inline mr-1 text-teal-400" />
                Preferred Location
              </label>
              <select
                value={office}
                onChange={e => setOffice(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0a1628] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-teal-400/50 transition-colors"
              >
                {OFFICES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {refCode && (
              <input type="hidden" value={refCode} />
            )}

            {formError && (
              <p className="text-red-400 text-sm">{formError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all shadow-lg shadow-teal-500/20",
                submitting
                  ? "bg-teal-500/50 cursor-not-allowed"
                  : "bg-teal-500 hover:bg-teal-400"
              )}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting…
                </span>
              ) : "Request My Appointment"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-white/25 mt-6">
          © {new Date().getFullYear()} Hallmark Dental · Powered by Rippl
        </p>
      </main>
    </div>
  );
}
