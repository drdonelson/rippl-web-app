import { cn } from "@/lib/utils";

const OFFICE_EMAILS: Record<string, string> = {
  brentwood:  "frontdesk@hallmarkdds.com",
  lewisburg:  "frontdesklb@hallmarkdds.com",
  greenbrier: "frontdeskgb@hallmarkdds.com",
};

function officeEmail(officeKey: string | null | undefined): string {
  return OFFICE_EMAILS[officeKey ?? ""] ?? OFFICE_EMAILS.brentwood;
}

const BENEFITS_SUBJECT = encodeURIComponent("Free Benefits Check Request");
const BENEFITS_BODY = encodeURIComponent(
  "Hi,\n\nI was referred to Hallmark Dental and would like a complimentary benefits check.\n\nMy insurance provider is: [please fill in]\nMy name is: [please fill in]\nBest time to reach me: [please fill in]\n\nThank you!"
);

const HALLMARK_CARE_URL =
  "https://www.hallmarkdds.com/financial/hallmark-dental-care-program/";

interface InsuranceCardsProps {
  officeKey?: string | null;
  className?: string;
}

export default function InsuranceCards({ officeKey, className }: InsuranceCardsProps) {
  const email = officeEmail(officeKey);
  const mailtoHref = `mailto:${email}?subject=${BENEFITS_SUBJECT}&body=${BENEFITS_BODY}`;

  return (
    <section className={cn("mb-10", className)}>
      <h2 className="text-lg font-bold text-white mb-1 text-center">Ready to become a patient?</h2>
      <p className="text-slate-500 text-sm text-center mb-4">We make it easy to get started — with or without insurance</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* ── Insurance card ── */}
        <div className="bg-slate-800/50 border border-teal-700/30 rounded-2xl p-5 flex flex-col">
          <div className="text-3xl mb-3">🏥</div>
          <p className="text-white font-bold text-sm mb-2 leading-snug">We Accept Most PPO Insurance</p>
          <p className="text-slate-400 text-xs leading-relaxed flex-1 mb-4">
            Not sure if we accept your plan? We'll check your benefits for free — no obligation.
          </p>
          <a
            href={mailtoHref}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-teal-500/50 text-teal-400 text-xs font-semibold hover:bg-teal-500/10 transition-colors"
          >
            Request a Free Benefits Check →
          </a>
        </div>

        {/* ── No insurance card ── */}
        <div className="bg-slate-800/50 border border-teal-700/30 rounded-2xl p-5 flex flex-col">
          <div className="text-3xl mb-3">💳</div>
          <p className="text-white font-bold text-sm mb-2 leading-snug">No Insurance? No Problem.</p>
          <p className="text-slate-400 text-xs leading-relaxed flex-1 mb-4">
            We offer the Hallmark Care in-house membership plan — affordable dental coverage designed specifically for our patients.
          </p>
          <a
            href={HALLMARK_CARE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-teal-500/50 text-teal-400 text-xs font-semibold hover:bg-teal-500/10 transition-colors"
          >
            Learn About Hallmark Care →
          </a>
        </div>
      </div>
    </section>
  );
}
