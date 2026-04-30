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
    <div className="min-h-screen bg-[#0f1e3a] text-white" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Subtle glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-10%", right: "20%", width: 500, height: 500, background: "radial-gradient(circle, rgba(45,212,191,0.08), transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "20%", left: "10%", width: 400, height: 400, background: "radial-gradient(circle, rgba(45,212,191,0.05), transparent 70%)" }} />
      </div>

      <div className="relative max-w-2xl mx-auto px-6 py-16">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-16">
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #2dd4bf, #0d9488)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Rippl</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Referral rewards · Dental practices</p>
          </div>
        </div>

        {!submitted ? (
          <>
            {/* Headline */}
            <div className="mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6" style={{ background: "rgba(45,212,191,0.1)", border: "1px solid rgba(45,212,191,0.2)" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span className="text-teal-300 text-xs font-semibold tracking-wider uppercase">Beta Partner Program</span>
              </div>
              <h1 className="text-5xl font-black text-white leading-tight mb-4">
                Turn referrals into<br />
                <span className="text-teal-400 italic">automatic rewards.</span>
              </h1>
              <p className="text-lg" style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>
                Rippl detects when a referred patient completes their first appointment and automatically sends a gift card reward — no staff effort required.
              </p>
            </div>

            {/* Value props */}
            <div className="grid grid-cols-3 gap-4 mb-12">
              {[
                { icon: Zap, label: "Fully automatic", desc: "Detects completions in real time" },
                { icon: Users, label: "Per-referral pricing", desc: "$20 per completed referral" },
                { icon: Gift, label: "Gift card rewards", desc: "$35–$100 sent instantly" },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(45,212,191,0.15)" }}>
                    <Icon className="w-4 h-4 text-teal-400" />
                  </div>
                  <p className="text-white font-semibold text-sm mb-0.5">{label}</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{desc}</p>
                </div>
              ))}
            </div>

            {/* Form */}
            <div className="rounded-3xl p-8" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <h2 className="text-xl font-bold text-white mb-1">Join the beta waitlist</h2>
              <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>
                We're onboarding a small group of founding practices. No monthly fees during beta.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {[
                  { key: "name", label: "Your name", placeholder: "Dr. Jane Smith", type: "text" },
                  { key: "practice", label: "Practice name", placeholder: "Smile Dental Group", type: "text" },
                  { key: "email", label: "Email", placeholder: "jane@smiledental.com", type: "email" },
                  { key: "phone", label: "Mobile number", placeholder: "(615) 555-0100", type: "tel" },
                ].map(({ key, label, placeholder, type }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.7)" }}>{label}</label>
                    <input
                      type={type}
                      placeholder={placeholder}
                      required
                      value={form[key as keyof typeof form]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-teal-400"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                    />
                  </div>
                ))}

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-[#0f1e3a] transition-opacity disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #2dd4bf, #0d9488)", marginTop: 8 }}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-[#0f1e3a]/30 border-t-[#0f1e3a] rounded-full animate-spin" />
                  ) : (
                    <>
                      Request early access
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            <p className="text-center text-xs mt-6" style={{ color: "rgba(255,255,255,0.25)" }}>
              Built by a dentist, for dental practices. Currently live at Hallmark Dental, Brentwood TN.
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: "rgba(45,212,191,0.15)", border: "1px solid rgba(45,212,191,0.3)" }}>
              <CheckCircle2 className="w-10 h-10 text-teal-400" />
            </div>
            <h2 className="text-3xl font-black text-white mb-3">You're on the list.</h2>
            <p className="text-lg mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
              We'll be in touch within 48 hours.
            </p>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
              Questions? Email <a href="mailto:hello@joinrippl.com" className="text-teal-400 hover:underline">hello@joinrippl.com</a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
