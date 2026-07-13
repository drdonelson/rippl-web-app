import { Droplets, MessageSquare, Shield, FileText, Zap, Search, Gift, ChevronRight } from "lucide-react";

const DEMO_EMAIL = "mailto:hello@joinrippl.com?subject=Rippl%20Demo%20Request";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: "var(--font-sans)" }}>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-white/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-[#C9551E] flex items-center justify-center">
              <Droplets className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm">
              rip<span style={{ color: "#E0622A" }}>pl</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={DEMO_EMAIL}
              className="hidden sm:inline-flex items-center gap-1.5 bg-[#E0622A] hover:bg-[#C9551E] text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors"
            >
              Request a Demo <ChevronRight className="w-3 h-3" />
            </a>
            <a href="/login" className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors">
              Staff Login →
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #F5A623 0%, #E0622A 100%)" }}
      >
        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-black/10 rounded-full blur-2xl" />
          <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 py-24 sm:py-32">
          <div className="max-w-2xl">
            <p className="text-white/70 text-sm font-semibold uppercase tracking-widest mb-6">
              Referral Rewards · Automated
            </p>
            <h1
              className="text-white text-5xl sm:text-6xl leading-[1.05] mb-6"
              style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700 }}
            >
              Word of mouth,{" "}
              <span style={{ fontStyle: "italic", fontWeight: 300 }}>automated.</span>
            </h1>
            <p className="text-white/80 text-lg leading-relaxed mb-10 max-w-xl">
              Rippl detects when a referred patient, customer, or client walks through the door — then automatically rewards the person who sent them. No staff work. No manual tracking. Just happy advocates and new business.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={DEMO_EMAIL}
                className="inline-flex items-center justify-center gap-2 bg-white text-[#E0622A] font-bold text-sm px-6 py-3.5 rounded-full transition-all hover:bg-orange-50 shadow-lg shadow-black/10"
              >
                Request a Demo <ChevronRight className="w-4 h-4" />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white font-semibold text-sm px-6 py-3.5 rounded-full transition-all"
              >
                See how it works
              </a>
            </div>
          </div>
        </div>

        {/* Vertical badges */}
        <div className="relative border-t border-white/20">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-2 text-white/60 text-sm">
            <span className="font-medium text-white/80">Works with:</span>
            <span className="text-white/40 mx-1">·</span>
            {["Open Dental", "DriveCentric", "Vagaro"].map((s, i) => (
              <span key={s} className="flex items-center gap-2">
                {i > 0 && <span className="text-white/30">·</span>}
                <span className="font-medium text-white/70">{s}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs font-bold text-[#E0622A] uppercase tracking-widest mb-3">How it works</p>
          <h2
            className="text-3xl text-slate-900 mb-16"
            style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700 }}
          >
            Three steps. Zero staff effort.
          </h2>
          <div className="grid sm:grid-cols-3 gap-10">
            {[
              {
                Icon: Gift,
                step: "01",
                title: "Customer refers someone",
                body: "Your customer shares their personal referral link — by text, email, or word of mouth. Rippl handles the delivery automatically.",
              },
              {
                Icon: Search,
                step: "02",
                title: "Rippl detects the visit",
                body: "When the referred person shows up and completes their first appointment, purchase, or service, Rippl sees it instantly via your existing software.",
              },
              {
                Icon: Zap,
                step: "03",
                title: "Reward sent automatically",
                body: "The referring customer gets an SMS and email with a gift card reward — no one on your staff has to do a thing.",
              },
            ].map(({ Icon, step, title, body }) => (
              <div key={step} className="relative">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mb-5">
                  <Icon className="w-5 h-5 text-[#E0622A]" />
                </div>
                <p className="text-xs font-bold text-slate-300 mb-2" style={{ fontFamily: "var(--font-mono)" }}>{step}</p>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Verticals ────────────────────────────────────────────────── */}
      <section className="py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs font-bold text-[#E0622A] uppercase tracking-widest mb-3">Built for your industry</p>
          <h2
            className="text-3xl text-slate-900 mb-12"
            style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700 }}
          >
            One platform. Three verticals.
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                label: "Dental",
                integration: "Open Dental",
                description: "Rippl connects to your Open Dental eConnector. When a referred patient completes their first appointment, we see it in real time.",
                tag: "Live",
              },
              {
                label: "Automotive",
                integration: "DriveCentric",
                description: "DriveCentric pushes customer data to Rippl's secure SFTP server. Referrals are matched and rewards fire when the deal closes.",
                tag: "Live",
              },
              {
                label: "Salon",
                integration: "Vagaro",
                description: "Rippl listens for Vagaro appointment webhooks. When a referred client completes their first service, the reward goes out automatically.",
                tag: "Coming soon",
              },
            ].map(({ label, integration, description, tag }) => (
              <div
                key={label}
                className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-slate-900 text-base">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">via {integration}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      tag === "Live"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {tag}
                  </span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA strip ────────────────────────────────────────────────── */}
      <section
        className="py-20 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #F5A623 0%, #E0622A 100%)" }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-black/10 rounded-full blur-2xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <h2
            className="text-white text-4xl mb-4"
            style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700 }}
          >
            Ready to turn your best customers into your marketing team?
          </h2>
          <p className="text-white/70 text-base mb-8 max-w-xl mx-auto">
            We'll walk you through the integration, show you a live referral firing, and get you up in days — not months.
          </p>
          <a
            href={DEMO_EMAIL}
            className="inline-flex items-center gap-2 bg-white text-[#E0622A] font-bold text-sm px-8 py-4 rounded-full transition-all hover:bg-orange-50 shadow-lg shadow-black/10"
          >
            Book a 15-minute demo <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* ══ COMPLIANCE SECTION (required by Twilio) ══════════════════ */}
      <div className="border-t-4 border-slate-100" />

      <main className="max-w-2xl mx-auto px-6 py-16 space-y-10">

        {/* SMS opt-in CTA */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4 text-[#E0622A]" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Text Notifications (Optional)</p>
              <p className="text-xs text-slate-500">Patients who want SMS alerts can sign up here</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Rippl customers can voluntarily opt in to receive their personal referral link and reward notifications by text message.{" "}
            <strong>SMS consent is entirely optional</strong> — customers are already eligible for referral rewards and can access their link in person or by email without signing up for texts.
          </p>
          <a
            href="/sms-opt-in"
            className="inline-flex items-center gap-2 bg-[#E0622A] hover:bg-[#C9551E] text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            Sign Up for Text Notifications
          </a>
        </div>

        {/* How consent works */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">How Opt-in Works</p>
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
            {[
              { n: "1", text: "Customer visits joinrippl.com/sms-opt-in" },
              { n: "2", text: "Enters their name and mobile number" },
              { n: "3", text: "Checks an explicit, unchecked consent checkbox" },
              { n: "4", text: "Receives reward notifications via SMS (referral link also available in-person or by email)" },
            ].map(({ n, text }) => (
              <div key={n} className="flex items-center gap-4 px-5 py-3.5">
                <span className="w-6 h-6 rounded-full bg-[#E0622A] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {n}
                </span>
                <p className="text-sm text-slate-700">{text}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 px-1">
            Consent is not required to receive services or to earn referral rewards.
            Message frequency varies — up to 4 messages per month. Reply STOP to opt out at any time.
          </p>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6 pt-2">
          <a href="/privacy" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
            <Shield className="w-3.5 h-3.5" /> Privacy Policy
          </a>
          <a href="/terms" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
            <FileText className="w-3.5 h-3.5" /> SMS Terms
          </a>
          <a href="/sms-opt-in" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
            <MessageSquare className="w-3.5 h-3.5" /> SMS Opt-in Form
          </a>
        </div>
      </main>

      {/* Business info — required for carrier/Twilio review */}
      <section className="border-t border-slate-200 bg-white">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">About</p>
          <div className="grid sm:grid-cols-2 gap-6 text-sm text-slate-600">
            <div>
              <p className="font-semibold text-slate-800 mb-1">Hallmark Dental</p>
              <p>1585 Mallory Lane, Suite 101</p>
              <p>Brentwood, TN 37027</p>
              <a href="tel:+16152217771" className="text-[#E0622A] hover:underline mt-1 block">(615) 221-7771</a>
              <a href="mailto:hello@joinrippl.com" className="text-[#E0622A] hover:underline block">hello@joinrippl.com</a>
            </div>
            <div>
              <p className="font-semibold text-slate-800 mb-1">About Rippl</p>
              <p className="leading-relaxed text-slate-500">
                Rippl is an automated referral rewards platform. Dental practices, automotive dealers, and salons use Rippl to reward customers who refer new business — automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200">
        <div className="max-w-2xl mx-auto px-6 py-5 text-xs text-slate-400 text-center">
          © {new Date().getFullYear()} Rippl ·{" "}
          <a href="/privacy" className="hover:text-slate-600 transition-colors">Privacy Policy</a>
          {" · "}
          <a href="/terms" className="hover:text-slate-600 transition-colors">SMS Terms</a>
        </div>
      </footer>
    </div>
  );
}
