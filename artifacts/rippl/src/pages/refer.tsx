import React, { useState, useEffect, useRef } from "react";
import {
  Droplets, Phone, Calendar, CheckCircle2, Loader2,
  MapPin, MessageSquare, Star, ArrowRight, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  OFFICE_CONFIG,
  getOffice,
  phoneHref,
  buildBookingUrl,
  type OfficeConfig,
} from "@/lib/office-config";
import { useAuth } from "@/contexts/auth-context";
import { DEMO_CODES } from "@/lib/demo-data";
import InsuranceCards from "@/components/insurance-cards";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

function buildApiUrl(path: string) {
  return `${window.location.origin}${BASE}${path}`;
}

// ── Attribution helpers ────────────────────────────────────────────────────────

function saveAttribution(
  code: string,
  referrerId: string | null,
  referrerName: string | null,
) {
  try {
    const payload = JSON.stringify({ code, referrerId, referrerName });
    localStorage.setItem("rippl_referral_code", code);
    localStorage.setItem("rippl_referral_meta", payload);
    sessionStorage.setItem("rippl_referral_code", code);
    sessionStorage.setItem("rippl_referral_meta", payload);
  } catch {}
}

function loadStoredCode(): string | null {
  try {
    return localStorage.getItem("rippl_referral_code");
  } catch {
    return null;
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface ReferrerInfo {
  referrer_id: string;
  referrer_name: string;
  referral_code: string;
  office_name: string;
}

// ── Trust statements ───────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  { title: "Family-friendly care", body: "All ages welcome — from first teeth to full smile makeovers." },
  { title: "Modern & comfortable", body: "State-of-the-art technology designed to keep you at ease." },
  { title: "Transparent pricing", body: "We walk you through every cost before any treatment begins." },
  { title: "3 convenient locations", body: "Brentwood, Lewisburg, and Greenbrier — always close to home." },
];

// ── Testimonials ───────────────────────────────────────────────────────────────

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

// ── Office booking card ────────────────────────────────────────────────────────
// Entire card is clickable → directly opens booking for that office.
// Phone link is nested and stops propagation so tapping the number calls instead.

function OfficeBookingCard({
  office,
  onBook,
}: {
  office: OfficeConfig;
  onBook: (key: string) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onBook(office.key)}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onBook(office.key);
        }
      }}
      className="group relative flex flex-col gap-4 p-5 rounded-2xl border border-white/8 bg-white/3 hover:bg-teal-500/5 hover:border-teal-400/25 active:bg-teal-500/8 active:scale-[0.99] transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40 select-none"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-base leading-snug">
            Hallmark Dental
          </p>
          <p className="text-teal-300 font-semibold text-sm leading-tight mt-0.5">
            {office.label}
          </p>
          <p className="text-white/35 text-xs mt-1 leading-relaxed">{office.address}</p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-400/20 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-500/20 transition-colors mt-0.5">
          <MapPin className="w-4 h-4 text-teal-400" />
        </div>
      </div>

      {/* Book CTA row */}
      <div className="flex items-center justify-between pt-1 border-t border-white/6">
        <span className="flex items-center gap-1.5 text-sm font-bold text-teal-400 group-hover:text-teal-300 group-hover:gap-2.5 transition-all duration-150">
          Book Online
          <ArrowRight className="w-3.5 h-3.5" />
        </span>

        {/* Call link — stops propagation so it doesn't trigger booking */}
        <a
          href={phoneHref(office.phone)}
          onClick={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
          className="flex items-center gap-1.5 text-xs text-white/35 hover:text-teal-400 hover:bg-teal-400/8 active:bg-teal-400/12 px-2.5 py-1.5 rounded-lg transition-colors"
          aria-label={`Call ${office.label} at ${office.phone}`}
        >
          <Phone className="w-3 h-3" />
          {office.phone}
        </a>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function Refer() {
  const formRef = useRef<HTMLDivElement>(null);

  // Auth context — safe on public pages; isDemo is true only for the demo account.
  // Must be called before any early returns (Rules of Hooks).
  const { isDemo } = useAuth();

  // Parse query string once via lazy initializer — stable across renders
  const [refCode] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("ref")?.trim() || "";
    } catch {
      return "";
    }
  });

  // Referrer state
  const [referrerInfo, setReferrerInfo] = useState<ReferrerInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(!!refCode);

  // Office selection (used by the fallback form)
  const [selectedOffice, setSelectedOffice] = useState<string>("");

  // isDemoPage — true when the demo staff account is viewing this page OR when
  // a known demo referral code is in the URL. Drives the "DEMO OFFICE" branding.
  // Real patients never trigger this: their referral codes aren't in DEMO_CODES.
  const isDemoPage = isDemo || DEMO_CODES.has(refCode);

  // Fallback form visibility
  const [showForm, setShowForm] = useState(false);

  // Form fields
  const [firstName, setFirstName]     = useState("");
  const [lastName, setLastName]       = useState("");
  const [phone, setPhone]             = useState("");
  const [email, setEmail]             = useState("");
  const [contactPref, setContactPref] = useState("phone");
  const [message, setMessage]         = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [formError, setFormError]     = useState("");

  // ── On mount: validate referral code, store attribution ─────────────────────
  useEffect(() => {
    let code = refCode;
    if (!code) {
      const stored = loadStoredCode();
      if (stored) code = stored;
    }

    if (!code) {
      setInfoLoading(false);
      return;
    }

    // Persist immediately before fetch resolves
    try {
      localStorage.setItem("rippl_referral_code", code);
      sessionStorage.setItem("rippl_referral_code", code);
    } catch {}

    fetch(buildApiUrl(`/api/referral/${encodeURIComponent(code)}`))
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: ReferrerInfo) => {
        setReferrerInfo(data);
        saveAttribution(code, data.referrer_id, data.referrer_name);
        // Pre-select office from referrer's home location
        const matched = OFFICE_CONFIG.find(o =>
          data.office_name?.toLowerCase().includes(o.key.toLowerCase()),
        );
        if (matched) setSelectedOffice(matched.key);
        setInfoLoading(false);
      })
      .catch(() => setInfoLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Book online handler (called when a tile is clicked) ──────────────────────
  const handleBookOffice = (officeKey: string) => {
    const office = getOffice(officeKey);
    const code = refCode || referrerInfo?.referral_code || undefined;

    // Track selection for the form's location preference
    setSelectedOffice(officeKey);

    // Always persist attribution before leaving the page
    if (code) {
      try {
        localStorage.setItem("rippl_referral_code", code);
        sessionStorage.setItem("rippl_referral_code", code);
      } catch {}
    }

    if (office?.bookingUrl) {
      const finalUrl = code
        ? buildBookingUrl(office.bookingUrl, code)
        : office.bookingUrl;
      window.open(finalUrl, "_blank", "noopener");
    } else {
      // No booking URL configured — reveal the fallback form
      setShowForm(true);
      setTimeout(
        () => formRef.current?.scrollIntoView({ behavior: "smooth" }),
        80,
      );
    }
  };

  // ── Open fallback form ────────────────────────────────────────────────────────
  const openFallbackForm = () => {
    setShowForm(true);
    setTimeout(
      () => formRef.current?.scrollIntoView({ behavior: "smooth" }),
      80,
    );
  };

  // ── Form submit ───────────────────────────────────────────────────────────────
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

  const referrerName = referrerInfo?.referrer_name;
  const selectedOfficeConfig = getOffice(selectedOffice);

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (infoLoading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
      </div>
    );
  }

  // ── Success (form submitted) ───────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0f2040] border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-20 h-20 bg-teal-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-teal-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">You're all set!</h2>
          <p className="text-white/60 mb-4 leading-relaxed">
            Your request has been sent to{" "}
            <span className="text-white font-semibold">
              Hallmark Dental{selectedOffice ? ` — ${selectedOffice}` : ""}
            </span>
            . Our team will reach out shortly to get you scheduled.
          </p>
          {referrerName && (
            <p className="text-sm text-teal-400 font-medium">
              Thanks to {referrerName} for the recommendation!
            </p>
          )}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs text-white/30">
              Questions? Call us at{" "}
              <a
                href={phoneHref(selectedOfficeConfig?.phone || OFFICE_CONFIG[0].phone)}
                className="text-teal-400 underline underline-offset-2"
              >
                {selectedOfficeConfig?.phone || OFFICE_CONFIG[0].phone}
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main page ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col">

      {/* Ambient glows */}
      <div aria-hidden className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[36rem] h-[36rem] bg-teal-500/4 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-80 h-80 bg-teal-500/3 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-teal-500/2 rounded-full blur-3xl" />
      </div>

      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 sm:px-8 pt-10 pb-16">

        {/* ── Logo / Brand ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20 flex-shrink-0">
            <Droplets className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs text-teal-400 font-medium tracking-wider uppercase">
              {isDemoPage ? "Demo Office" : "Hallmark Dental"}
            </p>
            <p className="text-sm text-white/50">Powered by Rippl</p>
          </div>
        </div>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="mb-8 max-w-2xl">
          {referrerName ? (
            <>
              <span className="inline-block text-teal-400 text-xs font-semibold tracking-widest uppercase mb-6 px-3 py-1 bg-teal-400/8 rounded-full border border-teal-400/20">
                Personal Invitation
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-6 leading-tight">
                {referrerName.split(" ")[0]} thinks you'll love us
              </h1>
              <p className="text-white/55 text-base leading-relaxed">
                Pick the location closest to you and book your first visit online — it only takes a minute.
              </p>
            </>
          ) : (
            <>
              <span className="inline-block text-teal-400 text-xs font-semibold tracking-widest uppercase mb-6 px-3 py-1 bg-teal-400/8 rounded-full border border-teal-400/20">
                New Patient Welcome
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-6 leading-tight">
                Book your first visit at Hallmark Dental
              </h1>
              <p className="text-white/55 text-base leading-relaxed">
                Choose your nearest location below and book online in seconds.
              </p>
            </>
          )}
        </div>

        {/* ── Office selection ─────────────────────────────────────────────── */}
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">
            Choose your location
          </h2>

          {/* Cards: single column on mobile, 3-up on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {OFFICE_CONFIG.map(office => (
              <OfficeBookingCard
                key={office.key}
                office={office}
                onBook={handleBookOffice}
              />
            ))}
          </div>
        </div>

        {/* ── Fallback CTA ─────────────────────────────────────────────────── */}
        <div className="mb-10">
          {!showForm ? (
            <button
              type="button"
              onClick={openFallbackForm}
              className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors group pt-4"
            >
              <span>Prefer us to reach out to you instead?</span>
              <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
            </button>
          ) : null}
        </div>

        {/* ── Why Hallmark Dental ──────────────────────────────────────────── */}
        <div className="bg-[#0f2040] border border-white/10 rounded-3xl p-6 shadow-xl mb-5">
          <h2 className="text-base font-bold text-white mb-4">Why patients choose us</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TRUST_ITEMS.map(item => (
              <div key={item.title} className="bg-white/3 rounded-2xl p-4 border border-white/5">
                <p className="text-sm font-semibold text-teal-300 mb-1 leading-tight">{item.title}</p>
                <p className="text-xs text-white/45 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Insurance / Financial ────────────────────────────────────────── */}
        <div className="mb-5">
          <InsuranceCards officeKey={null} />
        </div>

        {/* ── Testimonials ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
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

        {/* ── Fallback appointment request form ────────────────────────────── */}
        {showForm && (
          <div
            ref={formRef}
            id="appt-form"
            className="bg-[#0f2040] border border-white/10 rounded-3xl p-7 shadow-2xl scroll-mt-4 mb-5"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-teal-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">Request an Appointment</h2>
                <p className="text-white/40 text-xs mt-0.5">We'll reach out within one business day.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
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
                <label className="block text-xs font-medium text-white/55 mb-1.5">
                  Email <span className="text-white/25">(optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  autoComplete="email"
                  className="w-full px-4 py-2.5 bg-[#0a1628] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-teal-400/50 transition-colors"
                />
              </div>

              {/* Preferred location */}
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
                  <option value="">No preference</option>
                  {OFFICE_CONFIG.map(o => (
                    <option key={o.key} value={o.key}>
                      Hallmark Dental — {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contact preference */}
              <div>
                <label className="block text-xs font-medium text-white/55 mb-2">
                  Best way to reach you
                </label>
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
                          : "bg-white/3 border-white/8 text-white/50 hover:border-white/20",
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
                  Anything we should know?{" "}
                  <span className="text-white/25">(optional)</span>
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Insurance info, concerns, scheduling needs…"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[#0a1628] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-teal-400/50 transition-colors resize-none"
                />
              </div>

              <input
                type="hidden"
                name="referral_code"
                value={refCode || referrerInfo?.referral_code || ""}
              />

              {formError && <p className="text-red-400 text-sm">{formError}</p>}

              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold text-white text-sm transition-all shadow-lg shadow-teal-500/20",
                  submitting
                    ? "bg-teal-500/50 cursor-not-allowed"
                    : "bg-teal-500 hover:bg-teal-400 active:bg-teal-600",
                )}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending…
                  </span>
                ) : (
                  "Send My Request"
                )}
              </button>

              {/* Secondary call-to-call option below form */}
              <a
                href={phoneHref(
                  selectedOfficeConfig?.phone || OFFICE_CONFIG[0].phone,
                )}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-white/4 hover:bg-white/8 border border-white/10 text-white/70 hover:text-white rounded-2xl font-semibold transition-colors text-sm w-full"
              >
                <Phone className="w-4 h-4 text-teal-400" />
                Call us instead
              </a>
            </form>
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="text-center pt-6 space-y-1">
          {referrerName && (
            <p className="text-xs text-white/30">
              This invitation was shared by a Hallmark Dental patient via Rippl
            </p>
          )}
          <p className="text-xs text-white/15">
            © {new Date().getFullYear()} {isDemoPage ? "Demo Office" : "Hallmark Dental"} · Powered by Rippl
          </p>
        </div>

      </main>
    </div>
  );
}
