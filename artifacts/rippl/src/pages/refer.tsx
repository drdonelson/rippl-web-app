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

interface PracticeInfo {
  id: string;
  display_name: string;
  vertical: string;
  logo_url: string | null;
  primary_color: string;
}

interface ReferrerInfo {
  referrer_id: string;
  referrer_name: string;
  referral_code: string;
  office_name: string;
  practice: PracticeInfo | null;
}

// ── Vertical content ──────────────────────────────────────────────────────────

interface VerticalContent {
  badge: string;
  heroNoRef: string;
  heroWithRef: (name: string, practiceName: string) => string;
  heroSub: string;
  heroSubNoRef: string;
  ctaLabel: string;
  showOfficeCards: boolean;
  trustItems: { title: string; body: string }[];
  testimonials: { quote: string; author: string }[];
  teamLabel: string;
}

const VERTICAL_CONTENT: Record<string, VerticalContent> = {
  dental: {
    badge: "New Patient Welcome",
    heroNoRef: "Book your first visit",
    heroWithRef: (name) => `${name} thinks you'll love us`,
    heroSub: "Pick the location closest to you and book your first visit online — it only takes a minute.",
    heroSubNoRef: "Choose your nearest location below and book online in seconds.",
    ctaLabel: "Book Online",
    showOfficeCards: true,
    trustItems: [
      { title: "Family-friendly care", body: "All ages welcome — from first teeth to full smile makeovers." },
      { title: "Modern & comfortable", body: "State-of-the-art technology designed to keep you at ease." },
      { title: "Transparent pricing", body: "We walk you through every cost before any treatment begins." },
      { title: "Convenient locations", body: "Multiple locations — always close to home." },
    ],
    testimonials: [
      { quote: "Best dental experience I've ever had. The team made me feel completely at home.", author: "Sarah M." },
      { quote: "I'd been putting off a dentist visit for years. They made it so easy to get started.", author: "James T." },
    ],
    teamLabel: "dental team",
  },
  automotive: {
    badge: "You're Invited",
    heroNoRef: "Visit our showroom",
    heroWithRef: (name) => `${name} thinks you'll love it`,
    heroSub: "Stop by, take a test drive, and see for yourself — no pressure, just great vehicles.",
    heroSubNoRef: "Tell us you're coming and we'll have everything ready for you.",
    ctaLabel: "Schedule a Visit",
    showOfficeCards: false,
    trustItems: [
      { title: "No-pressure experience", body: "Browse at your own pace with zero hard selling." },
      { title: "Certified team", body: "Our staff is here to find the right fit for your needs and budget." },
      { title: "Flexible financing", body: "We work with multiple lenders to get you the best rate." },
      { title: "Hassle-free process", body: "From test drive to keys — we make it straightforward." },
    ],
    testimonials: [
      { quote: "Best car buying experience I've had. No games, no pressure — just great service.", author: "Marcus L." },
      { quote: "They found me exactly what I needed and made financing painless.", author: "Jennifer K." },
    ],
    teamLabel: "team",
  },
  salon: {
    badge: "Personal Invitation",
    heroNoRef: "Book your first appointment",
    heroWithRef: (name) => `${name} wants you to experience this`,
    heroSub: "First-time guests get a little extra love. Book your appointment and see what everyone's talking about.",
    heroSubNoRef: "Experience the difference. Book your first appointment today.",
    ctaLabel: "Book an Appointment",
    showOfficeCards: false,
    trustItems: [
      { title: "Expert stylists", body: "Years of training and a passion for making you feel amazing." },
      { title: "Premium products", body: "We use only top-tier products that are kind to your hair." },
      { title: "Relaxing atmosphere", body: "A salon experience designed for your comfort and enjoyment." },
      { title: "New guest welcome", body: "Special attention for first-time guests — you'll love it here." },
    ],
    testimonials: [
      { quote: "I finally found a salon that listens. My hair has never looked better.", author: "Ashley R." },
      { quote: "The atmosphere is amazing and the stylists are so talented. I won't go anywhere else.", author: "Brittany M." },
    ],
    teamLabel: "team",
  },
};

const DEFAULT_CONTENT = VERTICAL_CONTENT.dental;

function getContent(vertical: string | null | undefined): VerticalContent {
  return VERTICAL_CONTENT[vertical ?? "dental"] ?? DEFAULT_CONTENT;
}

// ── Office booking card ────────────────────────────────────────────────────────

function OfficeBookingCard({
  office,
  onBook,
  practiceName,
}: {
  office: OfficeConfig;
  onBook: (key: string) => void;
  practiceName: string;
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
      className="group relative flex flex-col gap-4 p-5 rounded-2xl border border-slate-200 bg-white hover:bg-orange-50/60 hover:border-orange-300 active:bg-orange-50 active:scale-[0.99] transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E0622A]/50 select-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-base leading-snug">
            {practiceName}
          </p>
          <p className="text-[#E0622A] font-semibold text-sm leading-tight mt-0.5">
            {office.label}
          </p>
          <p className="text-slate-400 text-xs mt-1 leading-relaxed">{office.address}</p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-100 transition-colors mt-0.5">
          <MapPin className="w-4 h-4 text-[#E0622A]" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <span className="flex items-center gap-1.5 text-sm font-bold text-[#E0622A] group-hover:gap-2.5 transition-all duration-150">
          Book Online
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
        <a
          href={phoneHref(office.phone)}
          onClick={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#E0622A] hover:bg-orange-50 px-2.5 py-1.5 rounded-lg transition-colors"
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
  const { isDemo } = useAuth();

  const [refCode] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("ref")?.trim() || "";
    } catch {
      return "";
    }
  });

  const [referrerInfo, setReferrerInfo] = useState<ReferrerInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(!!refCode);
  const [selectedOffice, setSelectedOffice] = useState<string>("");
  const isDemoPage = isDemo || DEMO_CODES.has(refCode);
  const [showForm, setShowForm] = useState(false);

  const [firstName, setFirstName]     = useState("");
  const [lastName, setLastName]       = useState("");
  const [phone, setPhone]             = useState("");
  const [email, setEmail]             = useState("");
  const [contactPref, setContactPref] = useState("phone");
  const [message, setMessage]         = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [formError, setFormError]     = useState("");

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

    try {
      localStorage.setItem("rippl_referral_code", code);
      sessionStorage.setItem("rippl_referral_code", code);
    } catch {}

    fetch(buildApiUrl(`/api/referral/${encodeURIComponent(code)}`))
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: ReferrerInfo) => {
        setReferrerInfo(data);
        saveAttribution(code, data.referrer_id, data.referrer_name);
        const matched = OFFICE_CONFIG.find(o =>
          data.office_name?.toLowerCase().includes(o.key.toLowerCase()),
        );
        if (matched) setSelectedOffice(matched.key);
        setInfoLoading(false);
      })
      .catch(() => setInfoLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBookOffice = (officeKey: string) => {
    const office = getOffice(officeKey);
    const code = refCode || referrerInfo?.referral_code || undefined;
    setSelectedOffice(officeKey);
    if (code) {
      try {
        localStorage.setItem("rippl_referral_code", code);
        sessionStorage.setItem("rippl_referral_code", code);
      } catch {}
    }
    if (office?.bookingUrl) {
      const finalUrl = code ? buildBookingUrl(office.bookingUrl, code) : office.bookingUrl;
      window.open(finalUrl, "_blank", "noopener");
    } else {
      setShowForm(true);
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  };

  const openFallbackForm = () => {
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  };

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

  const referrerName    = referrerInfo?.referrer_name;
  const practice        = referrerInfo?.practice ?? null;
  const vertical        = practice?.vertical ?? "dental";
  const practiceName    = isDemoPage ? "Hallmark Dental" : (practice?.display_name ?? "our practice");
  const content         = getContent(vertical);
  const selectedOfficeConfig = getOffice(selectedOffice);

  if (infoLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#E0622A] animate-spin" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-md">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-[#E0622A]" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">You're all set!</h2>
          <p className="text-slate-500 mb-4 leading-relaxed">
            Your request has been sent to{" "}
            <span className="text-slate-900 font-semibold">
              {practiceName}{selectedOffice && vertical === "dental" ? ` — ${selectedOffice}` : ""}
            </span>
            . Our {content.teamLabel} will reach out shortly to get you scheduled.
          </p>
          {referrerName && (
            <p className="text-sm text-[#E0622A] font-medium">
              Thanks to {referrerName} for the recommendation!
            </p>
          )}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Questions? Call us at{" "}
              <a
                href={phoneHref(selectedOfficeConfig?.phone || OFFICE_CONFIG[0].phone)}
                className="text-[#E0622A] underline underline-offset-2"
              >
                {selectedOfficeConfig?.phone || OFFICE_CONFIG[0].phone}
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div aria-hidden className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[36rem] h-[36rem] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 sm:px-8 pt-10 pb-16">

        {/* ── Brand ──────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-8">
          {practice?.logo_url ? (
            <img src={practice.logo_url} alt={practiceName} className="w-11 h-11 rounded-2xl object-cover" />
          ) : (
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-400 to-[#C9551E] flex items-center justify-center shadow-lg shadow-[#E0622A]/20 flex-shrink-0">
              <Droplets className="w-6 h-6 text-white" />
            </div>
          )}
          <div>
            <p className="text-xs text-[#E0622A] font-medium tracking-wider uppercase">
              {isDemoPage ? "Demo Office" : practiceName}
            </p>
            <p className="text-sm text-slate-400">Powered by Rippl</p>
          </div>
        </div>

        {/* ── Hero ───────────────────────────────────────────────────────────── */}
        <div className="mb-8 max-w-2xl">
          {referrerName ? (
            <>
              <span className="inline-block text-orange-700 text-xs font-semibold tracking-widest uppercase mb-6 px-3 py-1 bg-orange-50 rounded-full border border-orange-200">
                {content.badge}
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6 leading-tight">
                {content.heroWithRef(referrerName, practiceName)}
              </h1>
              <p className="text-slate-500 text-base leading-relaxed">{content.heroSub}</p>
            </>
          ) : (
            <>
              <span className="inline-block text-orange-700 text-xs font-semibold tracking-widest uppercase mb-6 px-3 py-1 bg-orange-50 rounded-full border border-orange-200">
                {content.badge}
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6 leading-tight">
                {content.heroNoRef} at {practiceName}
              </h1>
              <p className="text-slate-500 text-base leading-relaxed">{content.heroSubNoRef}</p>
            </>
          )}
        </div>

        {/* ── Office cards (dental) or single CTA (other verticals) ──────── */}
        {content.showOfficeCards ? (
          <>
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Choose your location
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {OFFICE_CONFIG.map(office => (
                  <OfficeBookingCard key={office.key} office={office} onBook={handleBookOffice} practiceName={practiceName} />
                ))}
              </div>
            </div>
            <div className="mb-10">
              {!showForm && (
                <button
                  type="button"
                  onClick={openFallbackForm}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 transition-colors group pt-4"
                >
                  <span>Prefer us to reach out to you instead?</span>
                  <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="mb-10">
            {!showForm && (
              <button
                type="button"
                onClick={openFallbackForm}
                className="inline-flex items-center gap-2 bg-[#E0622A] hover:bg-[#C9551E] text-white font-bold px-8 py-4 rounded-2xl text-sm shadow-md shadow-[#E0622A]/20 transition-colors"
              >
                {content.ctaLabel}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* ── Why us ─────────────────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-5">
          <h2 className="text-base font-bold text-slate-900 mb-4">Why patients choose us</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {content.trustItems.map(item => (
              <div key={item.title} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-sm font-semibold text-orange-700 mb-1 leading-tight">{item.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Insurance (dental only) ─────────────────────────────────────── */}
        {vertical === "dental" && (
          <div className="mb-5">
            <InsuranceCards officeKey={null} />
          </div>
        )}

        {/* ── Testimonials ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {content.testimonials.map(t => (
            <div
              key={t.author}
              className="bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm"
            >
              <div className="flex gap-0.5 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 text-[#E0622A] fill-[#E0622A]" />
                ))}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed italic mb-2">"{t.quote}"</p>
              <p className="text-xs text-slate-400 font-medium">— {t.author}</p>
            </div>
          ))}
        </div>

        {/* ── Appointment request form ──────────────────────────────────────── */}
        {showForm && (
          <div
            ref={formRef}
            id="appt-form"
            className="bg-white border border-slate-200 rounded-3xl p-7 shadow-md scroll-mt-4 mb-5"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-[#E0622A]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">Request an Appointment</h2>
                <p className="text-slate-400 text-xs mt-0.5">We'll reach out within one business day.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">First Name *</label>
                  <input
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Jane"
                    autoComplete="given-name"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#E0622A] focus:ring-1 focus:ring-[#E0622A]/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Last Name *</label>
                  <input
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Doe"
                    autoComplete="family-name"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#E0622A] focus:ring-1 focus:ring-[#E0622A]/30 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Phone Number *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="(615) 555-0100"
                  autoComplete="tel"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#E0622A] focus:ring-1 focus:ring-[#E0622A]/30 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Email <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  autoComplete="email"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#E0622A] focus:ring-1 focus:ring-[#E0622A]/30 transition-colors"
                />
              </div>

              {/* Location selector — dental only (multiple offices) */}
              {vertical === "dental" && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    <MapPin className="w-3 h-3 inline mr-1 text-[#E0622A]" />
                    Preferred Location
                  </label>
                  <select
                    value={selectedOffice}
                    onChange={e => setSelectedOffice(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-[#E0622A] focus:ring-1 focus:ring-[#E0622A]/30 transition-colors"
                  >
                    <option value="">No preference</option>
                    {OFFICE_CONFIG.map(o => (
                      <option key={o.key} value={o.key}>
                        {practiceName} — {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">
                  Best way to reach you
                </label>
                <div className="flex gap-2">
                  {[
                    { value: "phone", label: "Phone call" },
                    { value: "text",  label: "Text" },
                    { value: "email", label: "Email" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setContactPref(opt.value)}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors",
                        contactPref === opt.value
                          ? "bg-orange-50 border-[#E0622A] text-orange-700"
                          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  <MessageSquare className="w-3 h-3 inline mr-1 text-[#E0622A]" />
                  Anything we should know?{" "}
                  <span className="text-slate-400">(optional)</span>
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Insurance info, concerns, scheduling needs…"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#E0622A] focus:ring-1 focus:ring-[#E0622A]/30 transition-colors resize-none"
                />
              </div>

              <input type="hidden" name="referral_code" value={refCode || referrerInfo?.referral_code || ""} />

              {formError && <p className="text-red-600 text-sm">{formError}</p>}

              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold text-white text-sm transition-all shadow-md shadow-[#E0622A]/15",
                  submitting ? "bg-primary/50 cursor-not-allowed" : "bg-[#E0622A] hover:bg-[#E0622A] active:bg-[#C9551E]",
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

              {vertical === "dental" && (
                <a
                  href={phoneHref(selectedOfficeConfig?.phone || OFFICE_CONFIG[0].phone)}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-2xl font-semibold transition-colors text-sm w-full"
                >
                  <Phone className="w-4 h-4 text-[#E0622A]" />
                  Call us instead
                </a>
              )}
            </form>
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="text-center pt-6 space-y-1">
          {referrerName && (
            <p className="text-xs text-slate-400">
              This invitation was shared by a {practiceName} {vertical === "dental" ? "patient" : "customer"} via Rippl
            </p>
          )}
          <p className="text-xs text-slate-300">
            © {new Date().getFullYear()} {isDemoPage ? "Demo Office" : practiceName} · Powered by Rippl
          </p>
        </div>

      </main>
    </div>
  );
}
