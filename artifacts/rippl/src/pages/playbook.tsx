import React, { useState } from "react";
import {
  BookOpen, ChevronDown, ChevronUp, CheckCircle2, MessageSquare,
  Users, Gift, HelpCircle, ClipboardList, Star, Stethoscope,
  Monitor, Smile, ArrowRight, Copy, Check, MousePointerClick,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Reusable copy button ───────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
      title="Copy script"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ── Script card ───────────────────────────────────────────────────────────────

function ScriptCard({
  role, icon: Icon, color, script, tips,
}: {
  role: string;
  icon: React.ElementType;
  color: string;
  script: string;
  tips?: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50/50 transition-colors"
      >
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">{role}</p>
          <p className="text-xs text-slate-400 truncate">{script.slice(0, 60)}…</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
          <div className="relative bg-slate-50 rounded-xl border border-slate-200 px-4 py-3">
            <div className="absolute top-2 right-2">
              <CopyBtn text={script} />
            </div>
            <p className="text-sm text-slate-700 leading-relaxed pr-16 italic">"{script}"</p>
          </div>
          {tips && tips.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pro tips</p>
              <ul className="space-y-1">
                {tips.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <Star className="w-3 h-3 text-[#E0622A] shrink-0 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Accordion FAQ ─────────────────────────────────────────────────────────────

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start gap-3 py-4 text-left group"
      >
        <HelpCircle className="w-4 h-4 text-[#E0622A] shrink-0 mt-0.5" />
        <span className="flex-1 text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="pl-7 pb-4">
          <p className="text-sm text-slate-500 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

// ── Step card ─────────────────────────────────────────────────────────────────

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-7 h-7 rounded-full bg-[#E0622A] text-white flex items-center justify-center text-xs font-bold shrink-0">
          {n}
        </div>
        <div className="w-px flex-1 bg-slate-100 mt-2" />
      </div>
      <div className="pb-6 min-w-0">
        <p className="text-sm font-semibold text-slate-800 mb-1">{title}</p>
        <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

// ── Checklist ─────────────────────────────────────────────────────────────────

function ChecklistItem({ label, sub }: { label: string; sub?: string }) {
  const [checked, setChecked] = useState(false);
  return (
    <label className="flex items-start gap-3 cursor-pointer group py-2.5 border-b border-slate-100 last:border-0">
      <button
        type="button"
        onClick={() => setChecked(v => !v)}
        className={cn(
          "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all",
          checked ? "bg-[#E0622A] border-[#E0622A]" : "border-slate-300 hover:border-[#E0622A]/60",
        )}
      >
        {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
      </button>
      <div>
        <p className={cn("text-sm font-medium transition-colors", checked ? "line-through text-slate-400" : "text-slate-700")}>{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </label>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const SCRIPTS = [
  {
    role: "Front Desk — Patient Check-In",
    icon: Monitor,
    color: "bg-blue-50 text-blue-600",
    script:
      "Hi [Name], before we get you back — did you know we have a rewards program? If you refer a friend or family member and they come in for an appointment, you'll get a reward automatically. There's no form to fill out — just tell them to mention your name when they call.",
    tips: [
      "Say it while pulling up their chart — feels natural, not salesy.",
      "If they already referred someone, mention you'll let them know when the reward lands.",
      "Keep a referral card at the desk to hand over.",
    ],
  },
  {
    role: "Hygienist — Mid-Appointment",
    icon: Stethoscope,
    color: "bg-emerald-50 text-emerald-600",
    script:
      "We actually have a referral rewards program I wanted to mention — you can earn a reward any time someone you send our way comes in. A lot of our patients have done it for their spouse, coworkers, neighbors. It's pretty easy — they just mention your name when they book.",
    tips: [
      "Bring it up naturally, not at the start — wait until you're in a rhythm.",
      "Mentioning a specific relationship (spouse, coworker) makes it feel real, not generic.",
      "If the patient seems hesitant, just move on — no pressure.",
    ],
  },
  {
    role: "Hygienist — Patients with Kids",
    icon: Users,
    color: "bg-violet-50 text-violet-600",
    script:
      "Are their friends looking for a dentist? We have a rewards program — you'd get a gift card once they come in for their first appointment. It's a nice little bonus for just spreading the word.",
    tips: [
      "Parents in the same school or neighborhood are the highest-converting group.",
      "Mentioning 'gift card' is more tangible than 'rewards program'.",
    ],
  },
  {
    role: "Front Desk — Checkout",
    icon: Gift,
    color: "bg-amber-50 text-amber-600",
    script:
      "Before you go — do you know anyone who needs a new dentist? If they mention your name when they call, you'll get a reward after their first appointment. We'll text you when it's ready. No hoops to jump through.",
    tips: [
      "Checkout is the highest-conversion moment — patient just had a good experience.",
      "The phrase 'no hoops to jump through' preemptively removes objections.",
      "Hand them a referral card so they have something physical to give.",
    ],
  },
  {
    role: "Phone — New Patient Booking",
    icon: MessageSquare,
    color: "bg-rose-50 text-rose-600",
    script:
      "And just so you know — whoever referred you to us will get a reward once your appointment is complete. We want to make sure they get credit. Did someone mention they were a patient here?",
    tips: [
      "Always ask at booking — this is when the referral is freshest in the new patient's mind.",
      "Enter the referrer name in the system immediately, even if you're not sure of spelling.",
    ],
  },
];

const FAQS = [
  {
    q: "How does Rippl know who referred who?",
    a: "When a new patient books and mentions a referrer's name, we log it. After their first completed appointment, our system confirms the visit through your practice management software and automatically triggers the reward — no spreadsheet needed.",
  },
  {
    q: "What if the patient doesn't remember who referred them?",
    a: "That's okay — the referral can still be logged manually. Ask the patient when they arrive if they recall a name. Our front desk can also enter it after the fact in the referral events log.",
  },
  {
    q: "When does the referrer get paid?",
    a: "After the referred patient's first appointment is confirmed as complete in Open Dental. It typically triggers within 24–48 hours of the appointment. The referrer gets a text notification and can redeem their gift card immediately.",
  },
  {
    q: "What gift cards are available?",
    a: "Referrers can choose from hundreds of brands — Amazon, Visa, restaurants, spa, and more — through the Tango Card platform. They pick what they want after the reward is confirmed.",
  },
  {
    q: "What if a patient refers multiple people?",
    a: "They get a separate reward for each successful referral. There's no cap — they earn a new reward for every person they send our way.",
  },
  {
    q: "Do we have to do anything to process the reward?",
    a: "No. Once the referral is logged and the appointment is confirmed in Open Dental, Rippl handles everything automatically — the reward email, the gift card, and the text notification.",
  },
  {
    q: "What if a patient asks me what gift cards they can get?",
    a: "Tell them they get to choose from a large catalog of popular brands — everything from Amazon to Visa to restaurants. The link comes via text when their reward is ready.",
  },
  {
    q: "Is there a referral card we can give patients?",
    a: "Yes — your practice admin can print referral cards from the Dashboard. Keep a stack at the front desk and give one to any patient who seems interested.",
  },
  {
    q: "What does 'Lead' mean in the Referral Events list?",
    a: "A Lead is someone who submitted their info through the referral link but hasn't booked an appointment yet. They're a warm prospect — worth a follow-up call. Once booked, click the status badge to advance them to Booked.",
  },
  {
    q: "Why hasn't the status changed to Exam Completed yet?",
    a: "The system polls Open Dental every 5 minutes. If you just finished the appointment, give it up to 5–10 minutes. If it still hasn't updated, you can manually advance the status by clicking the badge in Referral Events.",
  },
];

export default function Playbook() {
  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-12">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-[#E0622A]/10 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-[#E0622A]" />
          </div>
          <span className="text-xs font-bold text-[#E0622A] uppercase tracking-widest">Staff Playbook</span>
        </div>
        <h1 className="text-2xl font-display font-bold text-slate-900 mb-2">
          Referral Program — Team Guide
        </h1>
        <p className="text-slate-500 leading-relaxed max-w-xl">
          Everything your front desk and hygienists need to run the referral program confidently.
          Scripts, process steps, and answers to the questions patients actually ask.
        </p>
      </div>

      {/* Program snapshot */}
      <section className="bg-gradient-to-br from-[#E0622A]/8 to-[#E0622A]/3 border border-[#E0622A]/20 rounded-2xl p-6 space-y-4">
        <p className="text-xs font-bold text-[#E0622A] uppercase tracking-widest">How It Works — The Short Version</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: Smile, label: "Patient refers a friend", body: "They mention the referrer's name when booking or at their appointment." },
            { icon: CheckCircle2, label: "Visit is confirmed", body: "Rippl detects the completed appointment automatically through Open Dental." },
            { icon: Gift, label: "Referrer gets a reward", body: "A text goes out with a gift card link. They pick from hundreds of brands." },
          ].map(({ icon: Icon, label, body }) => (
            <div key={label} className="flex flex-col gap-2">
              <div className="w-8 h-8 rounded-xl bg-white border border-[#E0622A]/20 flex items-center justify-center">
                <Icon className="w-4 h-4 text-[#E0622A]" />
              </div>
              <p className="text-sm font-semibold text-slate-800">{label}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-[#E0622A]/15">
          <ArrowRight className="w-3.5 h-3.5 text-[#E0622A]" />
          <p className="text-xs text-slate-600">
            Your job: <span className="font-semibold text-slate-800">mention the program and log the referrer's name.</span> Rippl handles everything else.
          </p>
        </div>
      </section>

      {/* Scripts */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Scripts</p>
          <h2 className="text-lg font-bold text-slate-900">What to Say — by Role</h2>
          <p className="text-sm text-slate-500 mt-1">Click any card to expand the script. Use these word-for-word or adapt to your style.</p>
        </div>
        <div className="space-y-3">
          {SCRIPTS.map(s => (
            <ScriptCard key={s.role} {...s} />
          ))}
        </div>
      </section>

      {/* Process steps */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Process</p>
          <h2 className="text-lg font-bold text-slate-900">Logging a Referral — Step by Step</h2>
          <p className="text-sm text-slate-500 mt-1">What to do when a new patient says someone referred them.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <Step n={1} title="Ask at booking or check-in"
            body='When a new patient calls or arrives, ask: "Did someone refer you to us?" Even if the referral was informal, the patient usually knows the name.' />
          <Step n={2} title="Write down the referrer's name"
            body="Get the full name if possible. Spelling matters — we match it against existing patients. If they're unsure, a first name and rough description is enough to work from." />
          <Step n={3} title="Log it in the referral system"
            body="Go to Dashboard → Referral Events and click 'Add Manual Referral'. Enter the new patient's name and the referrer's name. This ensures the reward triggers correctly." />
          <Step n={4} title="Tell the referrer it's coming"
            body="If the referrer is in the office that day, let them know their reward will arrive by text once the new patient's appointment is confirmed. This closes the loop and reinforces trust." />
          <div className="flex gap-4 last:pb-0">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 mb-1">Done — Rippl takes it from here</p>
              <p className="text-sm text-slate-500 leading-relaxed">Once the new patient's appointment completes, the reward goes out automatically. No follow-up needed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Status pipeline */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Dashboard</p>
          <h2 className="text-lg font-bold text-slate-900">Reading the Referral Status Pipeline</h2>
          <p className="text-sm text-slate-500 mt-1">Every referral moves through four stages. Here's what each one means and what you need to do.</p>
        </div>

        {/* Visual pipeline */}
        <div className="grid grid-cols-4 gap-1 items-center">
          {[
            { label: "Lead",           color: "bg-slate-500/15 text-slate-500 border-slate-400/30" },
            { label: "Booked",         color: "bg-blue-500/15 text-blue-500 border-blue-400/30" },
            { label: "Exam Completed", color: "bg-green-500/15 text-green-600 border-green-400/30" },
            { label: "Reward Sent",    color: "bg-[#E0622A]/15 text-[#E0622A] border-[#E0622A]/30" },
          ].map((s, i, arr) => (
            <div key={s.label} className="flex items-center gap-1">
              <div className={`flex-1 text-center px-2 py-1.5 rounded-full text-xs font-bold border ${s.color}`}>
                {s.label}
              </div>
              {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />}
            </div>
          ))}
        </div>

        {/* Per-status cards */}
        <div className="space-y-3">
          {[
            {
              badge: "Lead",
              badgeColor: "bg-slate-500/10 text-slate-500 border-slate-400/30",
              heading: "New patient submitted interest — hasn't booked yet",
              body: "This appears automatically when a patient fills out the referral form at joinrippl.com/refer. They've expressed interest but don't have an appointment yet. This is your signal to follow up by phone if you'd like to get them booked.",
              action: null,
            },
            {
              badge: "Booked",
              badgeColor: "bg-blue-500/10 text-blue-500 border-blue-400/30",
              heading: "Appointment is scheduled — patient hasn't been seen yet",
              body: "Once you've called and booked the lead, click the status badge in Referral Events to advance it from Lead → Booked. This keeps the pipeline accurate so you know exactly where every referral stands.",
              action: "Click the status badge to advance from Lead → Booked",
            },
            {
              badge: "Exam Completed",
              badgeColor: "bg-green-500/10 text-green-600 border-green-400/30",
              heading: "Patient was seen — reward notification sent",
              body: "This triggers automatically when Open Dental records the completed appointment (usually within 5 minutes). The referrer immediately receives a text and email with their reward claim link. If the system hasn't updated yet, you can manually advance from Booked → Exam Completed to send the notification early.",
              action: "Usually automatic — click the badge only if Open Dental hasn't synced yet",
            },
            {
              badge: "Reward Sent",
              badgeColor: "bg-[#E0622A]/10 text-[#E0622A] border-[#E0622A]/30",
              heading: "Referrer redeemed their reward — done",
              body: "The referrer clicked their claim link, chose a gift card (or in-house credit / donation), and the reward was delivered. No action needed. The event is complete.",
              action: null,
            },
          ].map(item => (
            <div key={item.badge} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${item.badgeColor}`}>
                  {item.badge}
                </span>
                <p className="text-sm font-semibold text-slate-800">{item.heading}</p>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">{item.body}</p>
              {item.action && (
                <div className="flex items-start gap-2 pt-1 border-t border-slate-100 mt-2">
                  <MousePointerClick className="w-3.5 h-3.5 text-[#E0622A] shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-slate-700">{item.action}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-700">Tip:</span> The status badge in the Referral Events table is clickable. Each click advances the referral one step forward. It stops at <span className="font-semibold">Exam Completed</span> — the final step to <span className="font-semibold">Reward Sent</span> only happens when the patient redeems their reward.
          </p>
        </div>
      </section>

      {/* FAQs */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">FAQ</p>
          <h2 className="text-lg font-bold text-slate-900">Questions Patients Ask</h2>
          <p className="text-sm text-slate-500 mt-1">Have these answers ready so you never get caught off guard.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl px-5 shadow-sm">
          {FAQS.map(faq => (
            <Faq key={faq.q} {...faq} />
          ))}
        </div>
      </section>

      {/* Onboarding checklist */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Checklist</p>
          <h2 className="text-lg font-bold text-slate-900">New Team Member Onboarding</h2>
          <p className="text-sm text-slate-500 mt-1">Run through this with any new front desk hire or hygienist. Check each item as you go.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl px-5 shadow-sm">
          <ChecklistItem
            label="Read the 'How It Works' section above"
            sub="Understand what triggers a reward and what doesn't"
          />
          <ChecklistItem
            label="Practice the check-in script out loud"
            sub="Say it 3× until it sounds natural, not robotic"
          />
          <ChecklistItem
            label="Know how to log a referral manually"
            sub="Dashboard → Referral Events → Add Manual Referral"
          />
          <ChecklistItem
            label="Understand the four referral statuses"
            sub="Lead → Booked → Exam Completed → Reward Sent — see the Dashboard section above"
          />
          <ChecklistItem
            label="Know where the referral cards are"
            sub="Keep a stack at the front desk — hand one to anyone who asks"
          />
          <ChecklistItem
            label="Know what gift cards are available"
            sub="Hundreds of brands — patient picks from a link sent by text"
          />
          <ChecklistItem
            label="Know who to ask if something looks wrong"
            sub="Check the Referral Events log first; escalate to your practice admin"
          />
          <ChecklistItem
            label="Watch for the first referral event"
            sub="Seeing one process end-to-end makes the system click into place"
          />
        </div>
      </section>

      {/* Staff pool callout */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <ClipboardList className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Team Referral Pool</p>
            <p className="text-xs text-slate-400">Optional — configured by your practice admin</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          Your practice may have a staff referral pool enabled. When it is, a portion of each referral reward goes into a shared pool for the team — distributed at your practice's discretion (team lunch, bonus, etc.). Check with your practice admin to see if it's active.
        </p>
        <p className="text-sm text-slate-500">
          The current pool balance is visible on your dashboard when you're logged in.
        </p>
      </section>

    </div>
  );
}
