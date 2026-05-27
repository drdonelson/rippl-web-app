/**
 * Public landing page at joinrippl.com — visible to Twilio reviewers and
 * anyone who visits the root URL without being logged in.
 * Staff login is at /login.
 */
import { Droplets, MessageSquare, Shield, FileText } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Nav */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-[#C9551E] flex items-center justify-center">
              <Droplets className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">
              rip<span style={{ color: "#E0622A" }}>pl</span>
            </span>
          </div>
          <a
            href="/login"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Staff Login →
          </a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-16 space-y-10">

        {/* Hero */}
        <div>
          <p className="text-xs font-bold text-[#E0622A] uppercase tracking-widest mb-3">
            Hallmark Dental · Referral Rewards
          </p>
          <h1 className="text-3xl font-bold text-slate-900 mb-4 leading-tight">
            Refer a friend. Earn a reward.
          </h1>
          <p className="text-slate-500 text-[16px] leading-relaxed">
            Rippl powers Hallmark Dental's patient referral rewards program.
            Existing patients can share a personal referral link and earn a
            gift card reward when the person they refer completes their first
            appointment.
          </p>
        </div>

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
            Hallmark Dental patients can voluntarily opt in to receive their
            personal referral link and reward notifications by text message.{" "}
            <strong>SMS consent is entirely optional</strong> — patients are
            already eligible for referral rewards and can access their link in
            person or by email without signing up for texts.
          </p>
          <a
            href="/sms-opt-in"
            className="inline-flex items-center gap-2 bg-[#E0622A] hover:bg-[#C9551E] text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            Sign Up for Text Notifications
          </a>
        </div>

        {/* How consent works — for reviewers */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">How Opt-in Works</p>
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
            {[
              { n: "1", text: "Patient visits joinrippl.com/sms-opt-in" },
              { n: "2", text: "Enters their name and mobile number" },
              { n: "3", text: "Checks an explicit, unchecked consent checkbox" },
              { n: "4", text: "Receives their referral link via SMS" },
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
            Consent is not required to receive dental services or to earn referral rewards.
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

      <footer className="border-t border-slate-200 mt-16">
        <div className="max-w-2xl mx-auto px-6 py-6 text-xs text-slate-400 text-center">
          © {new Date().getFullYear()} Rippl · Powered by Hallmark Dental ·{" "}
          <a href="/privacy" className="hover:text-slate-600 transition-colors">Privacy Policy</a>
          {" · "}
          <a href="/terms" className="hover:text-slate-600 transition-colors">SMS Terms</a>
        </div>
      </footer>
    </div>
  );
}
