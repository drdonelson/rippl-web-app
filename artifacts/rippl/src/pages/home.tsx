import { Droplets, Zap, Search, Gift, ChevronRight } from "lucide-react";

const CALENDLY_URL = "https://calendly.com/david-joinrippl/30min";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: "var(--font-sans)" }}>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-sm">
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
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 bg-[#E0622A] hover:bg-[#C9551E] text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors"
            >
              Book an Intro Call <ChevronRight className="w-3 h-3" />
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
                href={CALENDLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#E0622A] font-bold text-sm px-6 py-3.5 rounded-full transition-all hover:bg-orange-50 shadow-lg shadow-black/10"
              >
                Book an Intro Call <ChevronRight className="w-4 h-4" />
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
              <div key={step}>
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
              <div key={label} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-4">
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
            A 30-minute conversation to see if Rippl is the right fit — no deck, no pressure. We'll look at your setup, see the product live, and figure out what it takes to go live.
          </p>
          <a
            href={CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-[#E0622A] font-bold text-sm px-8 py-4 rounded-full transition-all hover:bg-orange-50 shadow-lg shadow-black/10"
          >
            Book a 30-minute intro call <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} Rippl · hello@joinrippl.com</span>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="hover:text-slate-600 transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-slate-600 transition-colors">SMS Terms</a>
            <a href="/sms-opt-in" className="hover:text-slate-600 transition-colors">SMS Opt-in</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
