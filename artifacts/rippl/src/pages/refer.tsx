import React, { useState, useEffect, useRef } from "react";
import {
  Droplets, Phone, Calendar, CheckCircle2, Loader2,
  MapPin, MessageSquare, Star, ChevronRight, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OFFICE_CONFIG, getOffice, phoneHref, buildBookingUrl, type OfficeConfig } from "@/lib/office-config";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

function buildApiUrl(path: string) {
  return `${window.location.origin}${BASE}${path}`;
}

// ── Attribution helpers ───────────────────────────────────────────────────────
// Persists referral attribution across sessions so even if the front desk
// forgets to ask, the lead record already has the referrer attached.

function saveAttribution(code: string, referrerId: string | null, referrerName: string | null) {
  try {
    const payload = JSON.stringify({ code, referrerId, referrerName });
    localStorage.setItem("rippl_referral_code", code);
    localStorage.setItem("rippl_referral_meta", payload);
    sessionStorage.setItem("rippl_referral_code", code);
    sessionStorage.setItem("rippl_referral_meta", payload);
  } catch {}
}

function loadStoredCode(): string | null {
  try { return localStorage.getItem("rippl_referral_code"); } catch { return null; }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReferrerInfo {
  referrer_id: string;
  referrer_name: string;
  referral_code: string;
  office_name: string;
}

// ── Trust statements ──────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  { title: "Family-friendly care", body: "All ages welcome — from first teeth to full smile makeovers." },
  { title: "Modern & comfortable", body: "State-of-the-art technology designed to keep you at ease." },
  { title: "Transparent pricing", body: "We walk you through every cost before any treatment begins." },
  { title: "3 convenient locations", body: "Brentwood, Lewisburg, and Greenbrier — always close to home." },
];

// ── Testimonials (placeholder — replace with real patient quotes) ─────────────

const TESTIMONIALS = [
  {
    quote: "Best dental experience I've ever had. The team made me feel completely at home.",
    author: "Sarah M., Brentwood patient",
  },
  {
    quote: "I'd been putting off a dentist visit for years. They made it so easy to get started.",
    author: "James T., Lewisburg patient",
  },
];

// ── Office card component ─────────────────────────────────────────────────────

function OfficeCard({
  office, selected, onClick,
}: { office: OfficeConfig; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left flex items-center gap-4 p-4 rounded-2xl border transition-all duration-150",
        selected
          ? "bg-teal-500/10 border-teal-400/40 shadow-sm shadow-teal-500/10"
          : "bg-white/3 border-white/8 hover:border-white/20 hover:bg-white/5"
      )}
    >
      <div className={cn(
        "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
        selected ? "bg-teal-500/20" : "bg-white/5"
      )}>
        <MapPin className={cn("w-4 h-4", selected ? "text-teal-400" : "text-white/40")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("font-semibold text-sm leading-tight", selected ? "text-teal-300" : "text-white")}>
          Hallmark Dental — {office.label}
        </p>
        <p className="text-xs text-white/40 mt-0.5">{office.address}</p>
      </div>
      {selected && <ChevronRight className="w-4 h-4 text-teal-400 flex-shrink-0" />}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Refer() {
  const formRef = useRef<HTMLDivElement>(null);
  const officeSectionRef = useRef<HTMLDivElement>(null);

  // Parse query string once via lazy state initializer — stable across renders
  const [refCode] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("ref")?.trim() || "";
    } catch { return ""; }
  });

  // Referrer state
  const [referrerInfo, setReferrerInfo] = useState<ReferrerInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(!!refCode);

  // Form state
  // "" means no office chosen yet — user must tap a card before Book Online works
  const [selectedOffice, setSelectedOffice] = useState<string>("");
  const [firstName, setFirstName]       = useState("");
  const [lastName, setLastName]         = useState("");
  const [phone, setPhone]               = useState("");
  const [email, setEmail]               = useState("");
  const [contactPref, setContactPref]   = useState("phone");
  const [message, setMessage]           = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [formError, setFormError]       = useState("");

  // ── On mount: validate referral code, store attribution ──────────────────
  useEffect(() => {
    // Recover stored code if URL has none
    let code = refCode;
    if (!code) {
      const stored = loadStoredCode();
      if (stored) code = stored;
    }

    if (!code) {
      setInfoLoading(false);
      return;
    }

    // Persist code immediately before fetch resolves
    try {
      localStorage.setItem("rippl_referral_code", code);
      sessionStorage.setItem("rippl_referral_code", code);
    } catch {}

    fetch(buildApiUrl(`/api/referral/${encodeURIComponent(code)}`))
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: ReferrerInfo) => {
        setReferrerInfo(data);
        // Store full attribution metadata
        saveAttribution(code, data.referrer_id, data.referrer_name);
        // Pre-select office if referrer's office matches one of our config keys
        const matchedOffice = OFFICE_CONFIG.find(o =>
          data.office_name?.toLowerCase().includes(o.key.toLowerCase())
        );
        if (matchedOffice) setSelectedOffice(matchedOffice.key);
        setInfoLoading(false);
      })
      .catch(() => {
        // Invalid code — graceful fallback, attribution not stored
        setInfoLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Form submit ───────────────────────────────────────────────────────────
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
          office_preference: selectedOffice || undefined,
          referral_code: refCode || referrerInfo?.referral_code || undefined,
          referrer_id: referrerInfo?.referrer_id || undefined,
          contact_preference: contactPref,
          message: message.trim() || undefined,
          source: "qr_landing_page",
        }),
      });
      if (!res.ok) throw new Error("Server error");
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setFormError("Something went wrong. Please try again or call us directly.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Book Online ───────────────────────────────────────────────────────────
  // Requires an office to be selected. Appends &rippl_ref=CODE to the booking
  // URL so attribution is preserved on the external PMS site. Persists the
  // referral code to storage before navigating away.
  const handleBookOnline = () => {
    // 1. Require explicit office selection
    if (!selectedOffice) {
      officeSectionRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const office = getOffice(selectedOffice);
    const code = refCode || referrerInfo?.referral_code || undefined;

    // 2. Persist referral code before any navigation
    if (code) {
      try {
        localStorage.setItem("rippl_referral_code", code);
        sessionStorage.setItem("rippl_referral_code", code);
      } catch {}
    }

    // 3. Redirect to booking URL with rippl_ref appended, or fall back to form
    if (office?.bookingUrl) {
      const finalUrl = code
        ? buildBookingUrl(office.bookingUrl, code)
        : office.bookingUrl;
      window.open(finalUrl, "_blank", "noopener");
    } else {
      // No booking URL configured — graceful fallback to appointment request form
      formRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const officeName = referrerInfo?.office_name || "Hallmark Dental";
  const referrerName = referrerInfo?.referrer_name;
  const selectedOfficeConfig = getOffice(selectedOffice);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (infoLoading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
      </div>
    );
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0f2040] border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-20 h-20 bg-teal-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-teal-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">You're all set!</h2>
          <p className="text-white/60 mb-4 leading-relaxed">
            Your request has been sent to <span className="text-white font-semibold">
              Hallmark Dental — {selectedOffice}
            </span>. Our team will reach out shortly to get you scheduled.
          </p>
          {referrerName && (
            <p className="text-sm text-teal-400 font-medium">
              Thanks to {referrerName} for the recommendation!
            </p>
          )}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs text-white/30">
              Questions? Call us at{" "}
              <a href={phoneHref(selectedOfficeConfig?.phone || "")} className="text-teal-400 underline underline-offset-2">
                {selectedOfficeConfig?.phone}
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main page ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col">

      {/* Ambient glows — CSS only, no canvas, Safari-safe */}
      <div aria-hidden className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[28rem] h-[28rem] bg-teal-500/4 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-72 h-72 bg-teal-500/3 rounded-full blur-3xl" />
      </div>

      <main className="relative z-10 flex-1 max-w-lg mx-auto w-full px-4 pt-10 pb-16 space-y-5">

        {/* ── Logo / Brand ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20 flex-shrink-0">
            <Droplets className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs text-teal-400 font-medium tracking-wider uppercase">Hallmark Dental</p>
            <p className="text-sm text-white/50">Powered by Rippl</p>
          </div>
        </div>

        {/* ── Hero card ─────────────────────────────────────────────────── */}
        <div className="bg-[#0f2040] border border-white/10 rounded-3xl p-7 shadow-2xl">
          {referrerName ? (
            <>
              <span className="inline-block text-teal-400 text-xs font-semibold tracking-widest uppercase mb-3 px-3 py-1 bg-teal-400/8 rounded-full border border-teal-400/20">
                Personal Invitation
              </span>
              <h1 className="text-2xl font-bold text-white mb-2 leading-tight">
                {referrerName} invited you to<br />Hallmark Dental
              </h1>
              <p className="text-white/55 text-sm leading-relaxed">
                A trusted recommendation is the best way to find a dental home. Request an appointment below — we'll reach out to get you scheduled.
              </p>
            </>
          ) : (
            <>
              <span className="inline-block text-teal-400 text-xs font-semibold tracking-widest uppercase mb-3 px-3 py-1 bg-teal-400/8 rounded-full border border-teal-400/20">
                New Patient Welcome
              </span>
              <h1 className="text-2xl font-bold text-white mb-2 leading-tight">
                Welcome to Hallmark Dental
              </h1>
              <p className="text-white/55 text-sm leading-relaxed">
                We'd love to help you get started. Request an appointment below and our team will reach out shortly.
              </p>
            </>
          )}

          {/* CTA buttons */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-white rounded-2xl font-semibold transition-colors text-sm shadow-lg shadow-teal-500/20"
            >
              <Calendar className="w-4 h-4" />
              Request Appointment
            </button>
            <button
              type="button"
              onClick={handleBookOnline}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-white/5 hover:bg-white/10 active:bg-white/8 border border-white/10 text-white rounded-2xl font-semibold transition-colors text-sm"
            >
              <ArrowRight className="w-4 h-4 text-teal-400" />
              Book Online
            </button>
          </div>
        </div>

        {/* ── Office selection ───────────────────────────────────────────── */}
        <div ref={officeSectionRef} className="bg-[#0f2040] border border-white/10 rounded-3xl p-6 shadow-xl">
          <h2 className="text-base font-bold text-white mb-1">Choose your location</h2>
          <p className="text-white/40 text-xs mb-4">Select the office that's most convenient for you.</p>
          <div className="space-y-2">
            {OFFICE_CONFIG.map(office => (
              <OfficeCard
                key={office.key}
                office={office}
                selected={selectedOffice === office.key}
                onClick={() => setSelectedOffice(office.key)}
              />
            ))}
          </div>

          {/* Per-office call buttons */}
          <div className="mt-5 pt-5 border-t border-white/8">
            <p className="text-xs text-white/35 mb-3 font-medium">Call us directly</p>
            <div className="space-y-2">
              {OFFICE_CONFIG.map(office => (
                <a
                  key={office.key}
                  href={phoneHref(office.phone)}
                  className="flex items-center justify-between w-full px-4 py-3 bg-white/3 hover:bg-white/6 active:bg-white/8 border border-white/8 rounded-xl transition-colors"
                >
                  <span className="text-sm text-white/80 font-medium">
                    {office.label}
                  </span>
                  <span className="flex items-center gap-2 text-sm text-teal-400 font-semibold">
                    <Phone className="w-3.5 h-3.5" />
                    {office.phone}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ── Why Hallmark Dental ────────────────────────────────────────── */}
        <div className="bg-[#0f2040] border border-white/10 rounded-3xl p-6 shadow-xl">
          <h2 className="text-base font-bold text-white mb-4">Why patients choose us</h2>
          <div className="grid grid-cols-2 gap-3">
            {TRUST_ITEMS.map(item => (
              <div key={item.title} className="bg-white/3 rounded-2xl p-4 border border-white/5">
                <p className="text-sm font-semibold text-teal-300 mb-1 leading-tight">{item.title}</p>
                <p className="text-xs text-white/45 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Testimonials ──────────────────────────────────────────────── */}
        <div className="space-y-3">
          {TESTIMONIALS.map(t => (
            <div
              key={t.author}
              className="bg-[#0f2040] border border-white/8 rounded-2xl px-5 py-4 shadow-lg"
            >
              <div className="flex gap-0.5 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 text-teal-400 fill-teal-400" />
                ))}
              </div>
              <p className="text-sm text-white/70 leading-relaxed italic mb-2">"{t.quote}"</p>
              <p className="text-xs text-white/35 font-medium">— {t.author}</p>
            </div>
          ))}
        </div>

        {/* ── Appointment request form ───────────────────────────────────── */}
        <div ref={formRef} id="appt-form" className="bg-[#0f2040] border border-white/10 rounded-3xl p-7 shadow-2xl scroll-mt-4">
          <h2 className="text-lg font-bold text-white mb-1">Request an Appointment</h2>
          <p className="text-white/45 text-sm mb-6">Fill in your info and we'll reach out within one business day.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/55 mb-1.5">First Name *</label>
                <input
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Jane"
                  autoComplete="given-name"
                  className="w-full px-4 py-2.5 bg-[#0a1628] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-teal-400/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/55 mb-1.5">Last Name *</label>
                <input
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Doe"
                  autoComplete="family-name"
                  className="w-full px-4 py-2.5 bg-[#0a1628] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-teal-400/50 transition-colors"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-medium text-white/55 mb-1.5">Phone Number *</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(615) 555-0100"
                autoComplete="tel"
                className="w-full px-4 py-2.5 bg-[#0a1628] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-teal-400/50 transition-colors"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-white/55 mb-1.5">Email <span className="text-white/25">(optional)</span></label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jane@example.com"
                autoComplete="email"
                className="w-full px-4 py-2.5 bg-[#0a1628] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-teal-400/50 transition-colors"
              />
            </div>

            {/* Preferred office */}
            <div>
              <label className="block text-xs font-medium text-white/55 mb-1.5">
                <MapPin className="w-3 h-3 inline mr-1 text-teal-400" />
                Preferred Location
              </label>
              <select
                value={selectedOffice}
                onChange={e => setSelectedOffice(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0a1628] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-teal-400/50 transition-colors"
              >
                {OFFICE_CONFIG.map(o => (
                  <option key={o.key} value={o.key}>Hallmark Dental — {o.label}</option>
                ))}
              </select>
            </div>

            {/* Preferred contact method */}
            <div>
              <label className="block text-xs font-medium text-white/55 mb-2">Best way to reach you</label>
              <div className="flex gap-2">
                {[
                  { value: "phone", label: "Phone call" },
                  { value: "text", label: "Text" },
                  { value: "email", label: "Email" },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setContactPref(opt.value)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors",
                      contactPref === opt.value
                        ? "bg-teal-500/15 border-teal-400/40 text-teal-300"
                        : "bg-white/3 border-white/8 text-white/50 hover:border-white/20"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-medium text-white/55 mb-1.5">
                <MessageSquare className="w-3 h-3 inline mr-1 text-teal-400" />
                Anything we should know? <span className="text-white/25">(optional)</span>
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Insurance info, concerns, scheduling needs…"
                rows={3}
                className="w-full px-4 py-2.5 bg-[#0a1628] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-teal-400/50 transition-colors resize-none"
              />
            </div>

            {/* Hidden referral code — always rendered so form data is complete */}
            <input type="hidden" name="referral_code" value={refCode || referrerInfo?.referral_code || ""} />

            {formError && (
              <p className="text-red-400 text-sm">{formError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "w-full py-4 rounded-2xl font-bold text-white text-sm transition-all shadow-lg shadow-teal-500/20",
                submitting
                  ? "bg-teal-500/50 cursor-not-allowed"
                  : "bg-teal-500 hover:bg-teal-400 active:bg-teal-600"
              )}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending…
                </span>
              ) : "Send My Request"}
            </button>

            {/* Alternative CTAs below form */}
            <div className="flex gap-3 pt-1">
              <a
                href={phoneHref(selectedOfficeConfig?.phone || OFFICE_CONFIG[0].phone)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white/4 hover:bg-white/8 border border-white/10 text-white rounded-2xl font-semibold transition-colors text-sm"
              >
                <Phone className="w-4 h-4 text-teal-400" />
                Call Instead
              </a>
              <button
                type="button"
                onClick={handleBookOnline}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white/4 hover:bg-white/8 border border-white/10 text-white rounded-2xl font-semibold transition-colors text-sm"
              >
                <Calendar className="w-4 h-4 text-teal-400" />
                Book Online
              </button>
            </div>
          </form>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <p className="text-center text-xs text-white/20 pt-2">
          © {new Date().getFullYear()} Hallmark Dental · Powered by Rippl
        </p>

      </main>
    </div>
  );
}
