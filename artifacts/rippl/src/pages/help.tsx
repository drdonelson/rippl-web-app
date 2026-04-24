import { BookOpen, CheckCircle2, AlertTriangle, PlayCircle } from "lucide-react";

const LOOM_VIDEO_1 = "https://www.loom.com/embed/d054cba4b20f4a5187c96cf05a4eb47a";
const LOOM_VIDEO_2 = "https://www.loom.com/embed/84aad24c5ea34363acc8735b344ed046";

const STEPS = [
  {
    number: "01",
    title: "New patient mentions a referral at intake",
    who: "Front Desk",
    items: [
      'Ask the patient: "Who referred you?" — get the full name of the referring patient.',
      "Look up the referring patient in Open Dental to confirm they are an active patient.",
      "Create the new patient record as normal.",
    ],
    warning: null,
  },
  {
    number: "02",
    title: "Attach the referral in Open Dental",
    who: "Front Desk",
    items: [
      "Open the NEW patient's chart in Open Dental.",
      "Go to the Referrals tab (Edit menu → Referrals, or the Referrals button in the chart toolbar).",
      "Click Add and select type: Internal referral.",
      "Search for and select the referring patient by name — this links the two patients.",
      "Save the referral record.",
    ],
    warning: "This step is critical. Without the referral attachment, Rippl cannot identify who referred the new patient and no reward will fire.",
  },
  {
    number: "03",
    title: "Schedule the first exam and attach the R0150 code",
    who: "Front Desk",
    items: [
      "Create or open the new patient's first exam appointment.",
      "In the appointment edit window, click Add Procedure (or the procedure list).",
      "Search for and add procedure code R0150 (abbreviation: REF_COMP).",
      "Save the appointment.",
    ],
    warning: "R0150 must be on the appointment before it is completed. Adding it after the fact will not trigger Rippl.",
  },
  {
    number: "04",
    title: "Patient comes in — complete the appointment",
    who: "Front Desk / Clinician",
    items: [
      "Complete the appointment as normal in Open Dental.",
      "When marking the appointment complete, ensure R0150 shows as a completed procedure.",
      "That's it — nothing else is required from staff.",
    ],
    warning: null,
  },
  {
    number: "05",
    title: "Rippl detects the completed visit automatically",
    who: "Rippl (automated)",
    items: [
      "Within 5 minutes, Rippl's poller detects the completed R0150 procedure.",
      "Rippl identifies the referring patient via the referral attachment from Step 2.",
      "An SMS and email are sent to the referring patient with their reward claim link.",
      "The event appears on the Referral Events page in your Rippl dashboard.",
    ],
    warning: null,
  },
  {
    number: "06",
    title: "Monitor in the Rippl dashboard",
    who: "Front Desk / Admin",
    items: [
      "Go to Referral Events to see all detected completions and their status.",
      "\"Exam Completed\" = reward email sent, patient has not yet claimed.",
      "\"Reward Sent\" = patient chose and received their reward.",
      "Check Admin Tasks for any manual items (e.g. dental credit to apply).",
    ],
    warning: null,
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Staff Training</h1>
        <p className="text-muted-foreground mt-1">
          How to correctly enter referrals in Open Dental so Rippl rewards fire automatically.
        </p>
      </div>

      {/* Video section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Video 1 */}
        <div className="rounded-2xl border border-border bg-card/30 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-sm font-semibold text-foreground">Part 1 — Open Dental Workflow</p>
            <p className="text-xs text-muted-foreground mt-0.5">How to enter referrals and attach R0150</p>
          </div>
          <div style={{ position: "relative", paddingBottom: "64.98194945848375%", height: 0 }}>
            <iframe
              src={LOOM_VIDEO_1}
              frameBorder="0"
              // @ts-ignore
              webkitallowfullscreen="true"
              mozallowfullscreen="true"
              allowFullScreen
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
              title="Open Dental workflow walkthrough"
            />
          </div>
        </div>

        {/* Video 2 */}
        <div className="rounded-2xl border border-border bg-card/30 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-sm font-semibold text-foreground">Part 2 — Rippl Dashboard</p>
            <p className="text-xs text-muted-foreground mt-0.5">Reading referral events and admin tasks</p>
          </div>
          {LOOM_VIDEO_2 ? (
            <div style={{ position: "relative", paddingBottom: "64.98194945848375%", height: 0 }}>
              <iframe
                src={LOOM_VIDEO_2}
                frameBorder="0"
                // @ts-ignore
                webkitallowfullscreen="true"
                mozallowfullscreen="true"
                allowFullScreen
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                title="Rippl dashboard walkthrough"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
              <PlayCircle className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </div>
          )}
        </div>
      </div>

      {/* Critical callout */}
      <div className="flex items-start gap-3 px-4 py-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">Two steps that must happen for a reward to fire</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            1. The referral must be attached in the new patient's Open Dental chart (Step 2 below).
            <br />
            2. Procedure code R0150 must be added to the appointment and marked complete (Steps 3–4).
            Missing either one means no reward goes out.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {STEPS.map((step) => (
          <div key={step.number} className="rounded-2xl border border-border bg-card/30 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-primary font-black text-sm">{step.number}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <h3 className="font-semibold text-foreground">{step.title}</h3>
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {step.who}
                  </span>
                </div>
                <ul className="space-y-2">
                  {step.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary/50 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
                {step.warning && (
                  <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">{step.warning}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick reference card */}
      <div className="rounded-2xl border border-border bg-card/30 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-primary/60" />
          <p className="font-semibold text-foreground">Quick Reference — print and post at the front desk</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            { label: "Trigger code", value: "R0150  (abbrev: REF_COMP)" },
            { label: "When to add it", value: "At appointment scheduling" },
            { label: "Referral attachment", value: "New patient chart → Referrals tab → Internal" },
            { label: "Rippl detection time", value: "Within 5 minutes of completion" },
            { label: "What fires automatically", value: "SMS + email to the referring patient" },
            { label: "Nothing else required", value: "Staff do not send rewards manually" },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5 px-3 py-2.5 rounded-xl bg-muted/30 border border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
              <span className="text-foreground font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Questions? Contact Rippl support at{" "}
        <a href="mailto:hello@joinrippl.com" className="text-primary hover:underline">hello@joinrippl.com</a>
      </p>
    </div>
  );
}
