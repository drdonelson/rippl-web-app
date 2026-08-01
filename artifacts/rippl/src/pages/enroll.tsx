import React, { useState, useEffect } from "react";
import { Droplets, ChevronRight, CheckCircle2, Gift, MessageSquare, Shield, Loader2, AlertCircle } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

interface PracticeInfo {
  id: string;
  name: string;
  vertical: string;
  logo_url: string | null;
  primary_color: string;
  white_label_name: string | null;
  reward_value: number;
}

interface FormState {
  first_name: string;
  last_name: string;
  phone: string;
  consent: boolean;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function Enroll({ slug }: { slug: string }) {

  const [practice, setPractice] = useState<PracticeInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<FormState>({ first_name: "", last_name: "", phone: "", consent: false });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false);
  const [enrolledName, setEnrolledName] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`${BASE}/api/enroll/${slug}`)
      .then(r => r.ok ? r.json() : r.json().then((d: { error?: string }) => Promise.reject(d.error ?? "Not found")))
      .then((data: PracticeInfo) => setPractice(data))
      .catch((e: unknown) => setLoadError(typeof e === "string" ? e : "This enrollment link is not valid."))
      .finally(() => setLoading(false));
  }, [slug]);

  const primaryColor = practice ? `#${practice.primary_color}` : "#1e3a5f";
  const displayName = practice?.white_label_name ?? practice?.name ?? "";
  const rewardValue = practice?.reward_value ?? 35;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, phone: formatPhone(e.target.value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.consent) return;
    setSubmitError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`${BASE}/api/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          first_name: form.first_name.trim(),
          last_name:  form.last_name.trim(),
          phone:      form.phone,
        }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string; name?: string; already_enrolled?: boolean };
      if (!res.ok) {
        setSubmitError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setEnrolledName(data.name ?? `${form.first_name} ${form.last_name}`);
      setAlreadyEnrolled(data.already_enrolled ?? false);
      setSubmitted(true);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading / error states ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-white text-lg font-semibold">Enrollment link not found</p>
        <p className="text-white/50 text-sm max-w-xs">{loadError}</p>
      </div>
    );
  }

  // ── Success state ───────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)" }}>
        <header className="px-6 pt-8 pb-6 flex items-center justify-between max-w-lg mx-auto w-full">
          <LogoLockup displayName={displayName} logoUrl={practice?.logo_url ?? null} />
          <PoweredByRippl />
        </header>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md text-center shadow-2xl">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ backgroundColor: `${primaryColor}15`, border: `2px solid ${primaryColor}30` }}
            >
              <CheckCircle2 className="w-10 h-10" style={{ color: primaryColor }} />
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
              {alreadyEnrolled ? "You're already enrolled!" : "You're in!"}
            </h1>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              {alreadyEnrolled
                ? `We already have you in the program, ${enrolledName.split(" ")[0]}. Nothing else needed.`
                : `Welcome to the ${displayName} referral program, ${enrolledName.split(" ")[0]}.`
              }
            </p>

            <div className="bg-slate-50 rounded-2xl p-5 mb-6 text-left space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${primaryColor}15` }}>
                  <MessageSquare className="w-4 h-4" style={{ color: primaryColor }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Tell friends to mention your name</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    When they visit {displayName}, they just say <strong className="text-slate-700">"{enrolledName}"</strong> sent them.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${primaryColor}15` }}>
                  <Gift className="w-4 h-4" style={{ color: primaryColor }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Get rewarded automatically</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    When they take delivery, we'll text you a <strong className="text-slate-700">${rewardValue} gift card</strong>. No forms, no follow-up needed.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Questions? Contact {displayName} or email <a href="mailto:hello@joinrippl.com" className="underline">hello@joinrippl.com</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Enrollment form ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)" }}>

      {/* Header */}
      <header className="px-6 pt-8 pb-6 flex items-center justify-between max-w-lg mx-auto w-full">
        <LogoLockup displayName={displayName} logoUrl={practice?.logo_url ?? null} />
        <PoweredByRippl />
      </header>

      {/* Hero */}
      <div className="max-w-lg mx-auto w-full px-6 pb-8">
        <div
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-5 border"
          style={{ backgroundColor: `${primaryColor}15`, borderColor: `${primaryColor}30` }}
        >
          <Gift className="w-3.5 h-3.5" style={{ color: primaryColor }} />
          <span className="text-xs font-semibold" style={{ color: primaryColor }}>Referral Rewards Program</span>
        </div>

        <h1 className="text-white text-4xl leading-tight mb-3" style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700 }}>
          Share the experience.{" "}
          <span style={{ color: primaryColor, fontStyle: "italic", fontWeight: 300 }}>Earn rewards.</span>
        </h1>
        <p className="text-white/60 text-sm leading-relaxed mb-8 max-w-sm">
          When a friend you refer takes delivery of their new vehicle at {displayName}, we'll automatically send you a <strong className="text-white/80">${rewardValue} gift card</strong> — no forms, no follow-up.
        </p>

        {/* How it works — 3 steps */}
        <div className="flex gap-6 mb-10">
          {[
            { n: "01", label: "Sign up below" },
            { n: "02", label: "Tell friends to mention your name" },
            { n: "03", label: `Get a $${rewardValue} gift card when they take delivery` },
          ].map(({ n, label }) => (
            <div key={n} className="flex-1">
              <p className="text-xs font-bold text-white/30 mb-1" style={{ fontFamily: "var(--font-mono)" }}>{n}</p>
              <p className="text-white/70 text-xs leading-relaxed">{label}</p>
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="bg-white rounded-3xl p-7 shadow-2xl">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Join the program</h2>
          <p className="text-slate-400 text-xs mb-6">Takes 30 seconds. No account needed.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">First Name</label>
                <input
                  required
                  value={form.first_name}
                  onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                  placeholder="Jane"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                  style={{ ["--tw-ring-color" as string]: `${primaryColor}40` }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Last Name</label>
                <input
                  required
                  value={form.last_name}
                  onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                  placeholder="Smith"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                  style={{ ["--tw-ring-color" as string]: `${primaryColor}40` }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mobile Phone</label>
              <input
                required
                type="tel"
                value={form.phone}
                onChange={handlePhoneChange}
                placeholder="(615) 555-0100"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                style={{ ["--tw-ring-color" as string]: `${primaryColor}40` }}
              />
              <p className="text-xs text-slate-400 mt-1.5">We'll text you when you earn a reward.</p>
            </div>

            {/* Consent */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={e => setForm(f => ({ ...f, consent: e.target.checked }))}
                  className="sr-only"
                />
                <div
                  className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
                  style={{
                    borderColor: form.consent ? primaryColor : "#cbd5e1",
                    backgroundColor: form.consent ? primaryColor : "transparent",
                  }}
                >
                  {form.consent && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-xs text-slate-500 leading-relaxed">
                I agree to receive SMS notifications from Rippl when my referrals earn a reward. Message &amp; data rates may apply. Reply STOP to opt out at any time.
              </span>
            </label>

            {submitError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">{submitError}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !form.consent}
              className="w-full py-3.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 mt-1 disabled:opacity-50"
              style={{ backgroundColor: primaryColor, color: "#ffffff" }}
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Enrolling…</>
                : <>Join the Program <ChevronRight className="w-4 h-4" /></>
              }
            </button>
          </form>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-5 mt-6">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-white/30" />
            <span className="text-white/30 text-xs">No account needed</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-1.5">
            <Gift className="w-3.5 h-3.5 text-white/30" />
            <span className="text-white/30 text-xs">Rewards sent automatically</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-auto">
        <div className="max-w-lg mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/20">
          <span>© {new Date().getFullYear()} Rippl · hello@joinrippl.com</span>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="hover:text-white/40 transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-white/40 transition-colors">SMS Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LogoLockup({ displayName, logoUrl }: { displayName: string; logoUrl: string | null }) {
  return (
    <div className="flex items-center gap-2.5">
      {logoUrl ? (
        <img src={logoUrl} alt={displayName} className="h-8 w-auto object-contain" />
      ) : (
        <span className="text-white font-bold text-base tracking-tight">{displayName}</span>
      )}
    </div>
  );
}

function PoweredByRippl() {
  return (
    <div className="flex items-center gap-1.5 bg-white/10 border border-white/10 rounded-full px-2.5 py-1">
      <Droplets className="w-3 h-3 text-white/60" />
      <span className="text-white/50 text-xs font-medium">
        Powered by rip<span className="text-[#E0622A]">pl</span>
      </span>
    </div>
  );
}
