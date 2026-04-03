import { Droplets, Mail, Shield } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      {/* Subtle background texture */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-teal-400/4 rounded-full blur-3xl" />
      </div>

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16">

        {/* Brand */}
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Rippl</p>
            <p className="text-xs text-white/40">Referral rewards for dental practices</p>
          </div>
        </div>

        {/* Page header */}
        <div className="flex items-start gap-4 mb-10">
          <div className="w-10 h-10 rounded-xl bg-teal-400/10 flex items-center justify-center flex-shrink-0 mt-1">
            <Shield className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
            <p className="text-white/50 text-sm mt-1">Effective April 2026</p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-10 text-white/75 leading-relaxed text-[15px]">

          <section>
            <h2 className="text-base font-semibold text-white mb-3">Overview</h2>
            <p>
              Rippl is a patient referral rewards platform used by dental practices. This Privacy Policy describes
              how Rippl collects, uses, and protects information submitted through its referral and rewards programs.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">Information We Collect</h2>
            <p className="mb-3">
              When a patient participates in a dental practice's referral program powered by Rippl, we may collect
              the following personal information:
            </p>
            <ul className="space-y-2 pl-4">
              {[
                { label: "Name", desc: "First and last name of the referring patient or new patient." },
                { label: "Phone number", desc: "Used to send SMS notifications about referral rewards." },
                { label: "Email address", desc: "Used to send reward confirmation and follow-up communications." },
              ].map(({ label, desc }) => (
                <li key={label} className="flex gap-2">
                  <span className="text-teal-400 flex-shrink-0 mt-0.5">·</span>
                  <span><span className="text-white/90 font-medium">{label}</span> — {desc}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">How We Use Your Information</h2>
            <p className="mb-3">
              Information collected through Rippl is used solely to operate the referral rewards program on behalf
              of your dental practice. Specifically:
            </p>
            <ul className="space-y-2 pl-4">
              {[
                "To notify you when a referral reward has been earned or is ready to claim.",
                "To send transactional SMS or email messages related to your referral activity.",
                "To allow dental practice staff to manage the referral program and track reward status.",
              ].map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-teal-400 flex-shrink-0 mt-0.5">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              We do <span className="text-white/90 font-medium">not</span> use your information for marketing,
              advertising, or any purpose beyond operating the referral program.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">Data Sharing</h2>
            <p>
              Rippl does <span className="text-white/90 font-medium">not</span> sell, rent, or share your personal
              information with third parties for their own purposes. Your information may be shared only with:
            </p>
            <ul className="space-y-2 pl-4 mt-3">
              {[
                "Your dental practice, which uses Rippl to manage the referral program.",
                "Service providers who help us deliver SMS and email notifications (subject to confidentiality obligations).",
              ].map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-teal-400 flex-shrink-0 mt-0.5">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">Data Retention</h2>
            <p>
              We retain your personal information only as long as necessary to operate the referral program and
              comply with applicable legal obligations. You may request deletion of your data at any time by
              contacting us at the email address below.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">Your Rights</h2>
            <p>
              You have the right to access, correct, or request deletion of your personal information at any time.
              To exercise these rights, contact us at the email address below.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">Contact</h2>
            <p className="mb-3">
              If you have questions or concerns about this Privacy Policy or how your data is handled, please reach out:
            </p>
            <a
              href="mailto:hello@joinrippl.com"
              className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 transition-colors font-medium"
            >
              <Mail className="w-4 h-4" />
              hello@joinrippl.com
            </a>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-white/8 text-center text-xs text-white/25">
          © {new Date().getFullYear()} Rippl · <a href="/terms" className="hover:text-white/50 transition-colors">Terms & Conditions</a>
        </div>
      </main>
    </div>
  );
}
