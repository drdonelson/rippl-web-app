import { Droplets, Mail, MessageSquare } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Subtle background texture */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-[#E0622A]/4 rounded-full blur-3xl" />
      </div>

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16">

        {/* Brand */}
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-400 to-[#C9551E] flex items-center justify-center shadow-lg shadow-[#E0622A]/20">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Rippl</p>
            <p className="text-xs text-slate-400">Referral rewards for dental practices</p>
          </div>
        </div>

        {/* Page header */}
        <div className="flex items-start gap-4 mb-10">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0 mt-1">
            <MessageSquare className="w-5 h-5 text-[#E0622A]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Terms & Conditions</h1>
            <p className="text-slate-500 text-sm mt-1">SMS Messaging Program · Effective April 2026</p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-10 text-slate-600 leading-relaxed text-[15px]">

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">Program Description</h2>
            <p>
              Rippl operates a dental patient referral rewards program on behalf of participating dental practices
              (including Hallmark Dental). When a patient refers a new patient who completes a qualifying
              appointment, the referring patient may receive an SMS notification confirming that their reward is
              ready to claim.
            </p>
            <p className="mt-3">
              SMS participation is entirely voluntary. Patients who wish to receive text notifications may
              opt in by visiting{" "}
              <a href="/sms-opt-in" className="text-[#E0622A] hover:underline">joinrippl.com/sms-opt-in</a>{" "}
              and providing explicit consent. Opting in to SMS is not required to receive dental services
              or to earn referral rewards.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">Message Types</h2>
            <p>
              Messages sent through the Rippl program may include:
            </p>
            <ul className="space-y-2 pl-4 mt-3">
              {[
                "Invitations to join the referral rewards program.",
                "Your personal referral link and reminders to share it.",
                "Notifications when a referred patient completes their first appointment.",
                "Instructions to claim your earned gift card reward.",
              ].map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-[#E0622A] flex-shrink-0 mt-0.5">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">Message Frequency</h2>
            <p>
              Message frequency varies based on your referral activity. You will receive no more than{" "}
              <span className="text-slate-900 font-medium">4 messages per month</span>. Most participants
              receive fewer.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">Costs</h2>
            <p>
              Rippl does not charge for SMS messages. However,{" "}
              <span className="text-slate-900 font-medium">message and data rates may apply</span> depending on your
              mobile carrier and plan. Please check with your carrier if you are unsure about your messaging rates.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">How to Opt Out</h2>
            <p>
              You may opt out of SMS messages at any time by replying{" "}
              <span className="font-mono text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded text-sm">STOP</span>{" "}
              to any message you receive. After opting out, you will receive a one-time confirmation and no further
              messages will be sent to your number.
            </p>
            <p className="mt-3">
              To re-enroll after opting out, contact your dental practice directly.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">How to Get Help</h2>
            <p>
              For assistance with the SMS program, reply{" "}
              <span className="font-mono text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded text-sm">HELP</span>{" "}
              to any message you receive, or contact us directly at the email address below.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">Eligibility</h2>
            <p>
              The referral rewards program is available to patients of participating dental practices who have
              provided a valid U.S. mobile phone number. Participation in the SMS program is voluntary and
              opting out does not affect your eligibility for referral rewards through other channels.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">Changes to These Terms</h2>
            <p>
              Rippl reserves the right to modify these Terms & Conditions at any time. Any changes will be posted
              at this URL with an updated effective date. Continued participation in the program after changes are
              posted constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">Contact</h2>
            <p className="mb-3">
              For questions about these terms or the SMS program, please contact us:
            </p>
            <a
              href="mailto:hello@joinrippl.com"
              className="inline-flex items-center gap-2 text-[#E0622A] hover:text-orange-300 transition-colors font-medium"
            >
              <Mail className="w-4 h-4" />
              hello@joinrippl.com
            </a>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-white/8 text-center text-xs text-white/25">
          © {new Date().getFullYear()} Rippl · <a href="/privacy" className="hover:text-white/50 transition-colors">Privacy Policy</a>
        </div>
      </main>
    </div>
  );
}
