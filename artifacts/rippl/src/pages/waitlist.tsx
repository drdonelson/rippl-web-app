import { useState } from "react";
import { Droplets, CheckCircle2, ArrowRight, Zap, Users, Gift } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export default function Waitlist() {
  const [form, setForm] = useState({ name: "", practice: "", email: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/public/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Something went wrong");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-10 md:py-16">

        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-12">
          <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-600/20">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <span className="text-slate-900 font-bold text-xl">Rippl</span>
        </div>

        {!submitted ? (
          <>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
              <span className="text-teal-700 text-xs font-semibold tracking-wider uppercase">Beta Partner Program</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-4">
              Turn referrals into<br />
              <span className="text-teal-600">automatic rewards.</span>
            </h1>
            <p className="text-slate-500 text-lg leading-relaxed mb-10">
              Rippl detects when a referred patient completes their first appointment and automatically sends a gift card reward — no staff effort required.
            </p>

            {/* Value props */}
            <div className="grid grid-cols-3 gap-3 mb-10">
              {[
                { icon: Zap,   label: "Fully automatic",    desc: "Detects completions in real time" },
                { icon: Users, label: "Per-referral pricing", desc: "$20 per completed referral" },
                { icon: Gift,  label: "Gift card rewards",   desc: "$35–$100 sent instantly" },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center mb-3">
                    <Icon className="w-4 h-4 text-teal-600" />
                  </div>
                  <p className="text-slate-800 font-semibold text-sm mb-0.5">{label}</p>
                  <p className="text-slate-400 text-xs leading-snug">{desc}</p>
                </div>
              ))}
            </div>

            {/* Form */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Join the beta waitlist</h2>
              <p className="text-slate-500 text-sm mb-6">
                We're onboarding a small group of founding practices. No monthly fees during beta.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {[
                  { key: "name",     label: "Your name",     placeholder: "Dr. Jane Smith",         type: "text"  },
                  { key: "practice", label: "Practice name", placeholder: "Smile Dental Group",      type: "text"  },
                  { key: "email",    label: "Email",         placeholder: "jane@smiledental.com",    type: "email" },
                  { key: "phone",    label: "Mobile number", placeholder: "(615) 555-0100",          type: "tel"   },
                ].map(({ key, label, placeholder, type }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
                    <input
                      type={type}
                      placeholder={placeholder}
                      required
                      value={form[key as keyof typeof form]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                    />
                  </div>
                ))}

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition-colors mt-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Request early access
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            <p className="text-center text-xs text-slate-400 mt-6">
              Built by a dentist, for dental practices.
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <div className="w-20 h-20 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-teal-600" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-3">You're on the list.</h2>
            <p className="text-slate-500 text-lg mb-2">We'll be in touch within 48 hours.</p>
            <p className="text-sm text-slate-400">
              Questions? Email{" "}
              <a href="mailto:hello@joinrippl.com" className="text-teal-600 hover:underline">hello@joinrippl.com</a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
