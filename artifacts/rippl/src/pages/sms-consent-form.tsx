export default function SmsConsentForm() {
  return (
    <div className="bg-white min-h-screen flex flex-col items-center py-12 px-8">
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
        }
        @page { size: letter portrait; margin: 0.75in; }
      `}</style>

      <p className="no-print text-slate-500 text-sm text-center mb-8">
        Print this page (Cmd+P / Ctrl+P) and keep physical copies as records of consent.
      </p>

      <div className="w-full max-w-[680px] border border-slate-300 rounded-lg p-10 font-sans text-slate-900">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-6 mb-6">
          <div>
            <p className="text-2xl font-bold tracking-tight">
              rip<span style={{ color: "#E0622A" }}>pl</span>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Powered by Hallmark Dental</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">joinrippl.com/sms-opt-in</p>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-slate-900 mb-1">SMS Text Message Consent Form</h1>
        <p className="text-sm text-slate-500 mb-8">
          Complete this form to receive referral reward notifications by text. SMS sign-up is entirely
          optional — it is not required to earn or claim referral rewards.
        </p>

        {/* Patient info fields */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Patient Name</p>
            <div className="border-b border-slate-400 pb-1 min-h-[28px]" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Mobile Phone Number</p>
            <div className="border-b border-slate-400 pb-1 min-h-[28px]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Date</p>
            <div className="border-b border-slate-400 pb-1 min-h-[28px]" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Office Location</p>
            <div className="border-b border-slate-400 pb-1 min-h-[28px]" />
          </div>
        </div>

        {/* Description of service */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-semibold text-slate-800 mb-2">What you're signing up for:</p>
          <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
            <li>Your personal referral link sent by text</li>
            <li>A reward notification when someone you referred completes their first visit</li>
            <li>Occasional practice updates and referral reminders</li>
          </ul>
          <p className="text-xs text-slate-500 mt-3">
            <strong>Message frequency:</strong> Up to 4 messages per month.&nbsp;
            <strong>Message and data rates may apply.</strong>
          </p>
        </div>

        {/* Consent checkbox + text */}
        <div className="border border-slate-300 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 border-2 border-slate-400 rounded mt-0.5 flex-shrink-0" />
            <p className="text-sm text-slate-700 leading-relaxed">
              I voluntarily consent to receive recurring SMS text messages from{" "}
              <strong>Hallmark Dental</strong> (powered by Rippl) at the mobile number provided above.
              Messages may include my referral link, reward notifications, and practice updates.
              Consent is <strong>not</strong> required to receive dental services or to earn referral
              rewards. Reply <strong>STOP</strong> to unsubscribe at any time. Reply <strong>HELP</strong> for
              assistance. Message and data rates may apply.
            </p>
          </div>
        </div>

        {/* Signature line */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Patient Signature</p>
          <div className="border-b border-slate-400 pb-1 min-h-[40px]" />
        </div>

        {/* Legal footer */}
        <div className="border-t border-slate-200 pt-5">
          <p className="text-xs text-slate-500 leading-relaxed">
            By signing above, you authorize Hallmark Dental and Rippl to send SMS messages to the number
            provided. You may opt out at any time by replying <strong>STOP</strong> to any message.
            For help, reply <strong>HELP</strong> or visit{" "}
            <strong>joinrippl.com/sms-opt-in</strong>.
          </p>
          <div className="flex gap-6 mt-3">
            <p className="text-xs text-slate-500">
              Privacy Policy: <strong>joinrippl.com/privacy</strong>
            </p>
            <p className="text-xs text-slate-500">
              SMS Terms: <strong>joinrippl.com/terms</strong>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
