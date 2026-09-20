// Narration scripts and timing model for the two Rippl help videos.
//
// Timing: same calibrated model used for the Cadence batch (2026-07-04),
// measured against the real "David 2" voice at speed 1.08:
//
//     t(seconds) = 0.04975 × (characters spoken before this beat) + 1.086
//
// A beat's action fires LEAD seconds AFTER its sentence begins, so the
// presenter introduces a step, then the screen demonstrates it.
//
// Module 01 (open_dental_workflow): MANUAL FOOTAGE — no Playwright recorder.
//   Drop your screen recording into training/output/ as one of:
//     01-open-dental-workflow.mp4
//     01-open-dental-workflow.webm
//   Then run convert.mjs → render.mjs as normal.
//
// Module 02 (rippl_dashboard): Playwright-automated via record-02-rippl-dashboard.mjs.

export const CHARS_PER_SEC_MODEL = { slope: 0.04975, intercept: 1.086 }

export const LEAD = 1.4   // seconds after a beat starts before the screen action fires

/** Absolute start time of each beat, derived from cumulative characters. */
export function withTiming(beats) {
  let chars = 0
  return beats.map(b => {
    const at = CHARS_PER_SEC_MODEL.slope * chars + CHARS_PER_SEC_MODEL.intercept
    chars += b.say.length
    return { ...b, at: Math.round(at * 10) / 10 }
  })
}

/** Everything spoken as one string — this is what HeyGen renders. */
export const narrationText = beats => beats.map(b => b.say).join(' ')

/** Total spoken length in seconds (add ~6s padding for the render). */
export const spokenSeconds = beats => {
  const chars = beats.reduce((n, b) => n + b.say.length, 0)
  return Math.round((CHARS_PER_SEC_MODEL.slope * chars + CHARS_PER_SEC_MODEL.intercept) * 10) / 10
}

/** Beat start time + LEAD = when the on-screen action should fire. */
export const timed = (id, beatIndex) => {
  const s = SCRIPTS[id]
  if (!s) throw new Error(`unknown module: ${id}`)
  const timed = withTiming(s.beats)
  if (beatIndex < 0 || beatIndex >= timed.length) throw new Error(`beat ${beatIndex} out of range for ${id}`)
  return Math.round((timed[beatIndex].at + LEAD) * 10) / 10
}

// ─────────────────────────────────────────────────────────────────────────────
// Scripts. `cue` describes what should be on screen at that beat (for manual
// verification). `say` is the exact narration sent to HeyGen. Keys match the
// module ids in the help page video config.
// ─────────────────────────────────────────────────────────────────────────────

export const SCRIPTS = {

  open_dental_workflow: {
    module: 'open_dental_workflow',
    name:   '01-open-dental-workflow',
    title:  'Open Dental Integration',
    manualFootage: true,   // no Playwright recorder — drop footage in training/output/
    // Crop bottom 300px from source (removes Loom player chrome + OD taskbar),
    // then scale to exact 16:9 at 1280×720.
    cropFilter: 'crop=3420:1924:0:0,scale=1280:720',
    beats: [
      { cue: 'OD schedule — new patient appointment block at 3pm, tooltip visible',
        say: "When a new patient referred by one of your existing patients comes in for their visit, here is exactly what your front desk does in Open Dental to close the loop with Rippl. Nothing about their normal workflow changes." },
      { cue: 'Hover tooltip showing patient name NP-Test_Rippl5, Thursday 3pm',
        say: "On the schedule, find the new patient's appointment block. It is flagged as a New Patient visit — your team knows immediately this is someone who came in through a referral. Hover over the appointment to confirm the patient name and time, or double-click to open the full account." },
      { cue: 'Clinical chart loads — tooth chart, procedures list, insurance on screen',
        say: "Inside the patient account, the clinical chart loads automatically. You can see the tooth chart, the procedures planned for today, and insurance information already on file. This is the same view your front desk uses for any patient — nothing extra is required here." },
      { cue: 'Edit Patient Information dialog opens — Referred From field visible at bottom',
        say: "Now open the patient's Edit Information screen. Scroll down toward the bottom of the form until you see the Referred From field. This field is how you tell Open Dental which of your existing patients sent this new person in." },
      { cue: 'Search button clicked, referring patient selected, name populates the field',
        say: "Click the small search button next to the Referred From field, look up the referring patient by name, and select them from the list. The field now shows the patient's full name. Click Save." },
      { cue: 'Referral chain confirmed — Rippl links the two patients',
        say: "Open Dental now has the complete referral chain on record, and Rippl can connect the two patients." },
      { cue: 'Appointment edit dialog open — procedures, insurance, provider details visible',
        say: "Now open the appointment to review the visit details one more time — the procedures completed today, the patient's insurance, the provider, and the appointment time. This is the standard review your team already does at the end of every visit. Nothing new to learn." },
      { cue: 'Close appointment dialog, back on main schedule — cursor finding the appointment block',
        say: "Once the review is done, go back to the main schedule and find the appointment block for this patient. You are about to change its status to mark the visit as complete — this is the step that triggers Rippl." },
      { cue: 'Right-click on appointment — context menu open with Set Complete highlighted',
        say: "Right-click the appointment block and you will see a list of status options. Choose Set Complete. That single click is the trigger — the moment Open Dental marks this appointment complete, it sends the update automatically to Rippl." },
      { cue: 'Appointment status updated, schedule reflects the change',
        say: "Rippl picks up the change, moves the referral to Exam Completed, and queues the reward for the patient who made the referral. No separate login, no form to fill out — your front desk is already done." },
    ],
  },

  rippl_dashboard: {
    module: 'rippl_dashboard',
    name:   '02-rippl-dashboard',
    title:  'Your Rippl Dashboard',
    beats: [
      { cue: 'Dashboard on load — "Welcome back" heading, stat cards visible',
        say: "Let's walk through your Rippl dashboard so you know where everything lives and what to check each day." },
      { cue: 'Cursor moves across the four stat cards',
        say: "The four cards at the top are your program at a glance. Total Referrals is everyone who has used a referral link to register. Exams Completed shows how many of those new patients have actually come in for their appointment." },
      { cue: 'Cursor highlights Rewards Sent and Active Referrers cards',
        say: "Rewards Sent tells you how many referral rewards have gone out to your patients. And Active Referrers shows how many of your patients have shared their personal link at least once." },
      { cue: 'Scroll down to Recent Events feed',
        say: "Below the stats is the Recent Events feed — the last ten referrals to come through, shown in real time. You can see the new patient, who referred them, and what office they belong to." },
      { cue: 'Click "Referral Events" in sidebar',
        say: "Click Referral Events in the sidebar to see your full history." },
      { cue: 'Events page loaded — table of referrals with status tabs',
        say: "Every referral your practice has ever received is listed here. Use the search bar or the status tabs across the top to find exactly what you are looking for." },
      { cue: 'Click "Patients" in sidebar',
        say: "The Patients page shows everyone enrolled in your referral program." },
      { cue: 'Patients list — rows with names, referral counts visible',
        say: "Each patient has their own unique referral link. You can see how many referrals they have sent, copy their link, or send it to them again by text message right from this page." },
      { cue: 'Click the Add Patient button',
        say: "To add a new patient, click Add Patient, fill in their name and phone number, and save. Rippl generates their referral link automatically." },
      { cue: 'Close modal — hold on patients list',
        say: "That is your Rippl dashboard — everything your team needs to run and grow your referral program, all in one place." },
    ],
  },

}

export const SCRIPT_ORDER = ['open_dental_workflow', 'rippl_dashboard']
