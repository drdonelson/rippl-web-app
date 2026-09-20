# Rippl Training Video Pipeline

Two help-page videos built with HeyGen + Playwright. Same architecture as
the Cadence pipeline; same locked recipe; same timing model.

READ THIS BEFORE TOUCHING ANYTHING.

---

## Pipeline

```
[manual recording]   record-02-*.mjs       convert.mjs     render.mjs     (upload to Supabase)
  module 01               module 02         .webm/.mov      HeyGen         private bucket
  (Open Dental)         (Rippl dashboard) → padded .mp4   → final .mp4
```

## Modules

| # | id | name | recorder |
|---|---|---|---|
| 01 | `open_dental_workflow` | Open Dental Integration | **manual** — drop footage in `training/output/` |
| 02 | `rippl_dashboard` | Your Rippl Dashboard | `record-02-rippl-dashboard.mjs` |

## The timing model (do not change)

Narration length is predicted from character count:

```
t = 0.04975 × cumulative_chars + 1.086
```

Actions fire `LEAD = 1.4s` AFTER their beat sentence begins, so the presenter
introduces a step and then the screen acts — which makes it look directed.

Never hardcode seconds in a recorder. Always use `timed(moduleId, beatIndex)`.

---

## Money — read before rendering

HeyGen charges ~1 credit per second of output, ~60 credits per dollar.
Both videos are ~64s each → ~70 credits each with padding → ~140 credits total.

**Always:**
```
node training/render.mjs cost
```

Then for any module where framing may have changed:
```
node training/render.mjs check <module>   # ~3 credits, verify framing
node training/render.mjs full  <module>   # the real render
```

**Never go straight to `full` after changing framing.**

---

## The locked HeyGen recipe

- **Avatar ID**: `d7b9b0a724d14e6787fa0ea401ce89f4` (Man in olive green shirt)
- **Voice ID**: `8220da7f3bdc4f8c80c750e735e95813` ("David 2") — store in full; a truncated ID cost a failed batch in the Cadence work
- **Voice speed**: `1.08`
- **Canvas**: `{ width: 1280, height: 720 }` — MUST equal footage size exactly
- **play_style**: `fit_to_scene`
- **Avatar placement** (landscape):
  - DEFAULT: `scale 0.22, offset {x: 0.32, y: 0.27}` — bottom-right corner
  - COMPACT: `scale 0.16, offset {x: 0.36, y: 0.27}` — set `AVATAR_COMPACT=1`
- **10-minute ingest wait** after uploading an asset is MANDATORY. Skipping
  it produced broken renders in the Cadence batch. `render.mjs` serves the
  wait once per upload and caches the asset ID in `output/assets.json`.

---

## Staleness guards (both paid for in credits)

- `render.mjs` refuses if `*-padded.mp4` is older than the source footage.
  Always run `convert.mjs` after any re-record before rendering.
- `render.mjs` re-uploads if the cached HeyGen asset is older than the footage.

---

## Module 01 — Open Dental (manual footage)

OD is a Windows desktop app and cannot be driven by Playwright. Record your
screen at the office showing:

1. Rippl Events page — a referral in "New Referral" status
2. Open Dental — appointment schedule for the new patient
3. Completing the appointment in OD (same as always)
4. Switching back to Rippl — status now shows "Exam Completed"
5. Rippl dashboard with updated stats

Save the recording as one of:
```
training/output/01-open-dental-workflow.mov
training/output/01-open-dental-workflow.mp4
training/output/01-open-dental-workflow.webm
```

Then run `convert.mjs` to pad and scale it to 1280×720.

**The OD recording copied from Photos library is already in training/output/
as `01-open-dental-workflow.mov` — run convert.mjs before rendering.**

---

## Typical task: re-record module 02 after a UI change

1. Read this file and `record-02-rippl-dashboard.mjs`.
2. Set `REC_COOKIE_FILE` to a file containing your live Supabase auth cookie.
3. `node training/record-02-rippl-dashboard.mjs`
4. Extract frames at each beat time from `narration.mjs` and inspect them:
   `ffmpeg -ss <sec> -i training/output/02-rippl-dashboard.webm -frames:v 1 out.jpg`
5. `node training/convert.mjs`
6. `node training/render.mjs cost`
7. `node training/render.mjs check rippl_dashboard`
8. `node training/render.mjs full  rippl_dashboard`
9. Update the video URL in `artifacts/rippl/src/pages/help.tsx`.

---

## Environment variables

| Var | Required | Default |
|---|---|---|
| `HEYGEN_API_KEY` | yes | read from `.env.local` |
| `REC_COOKIE_FILE` | yes (recorders) | — |
| `REC_BASE` | no | `https://www.joinrippl.com` |
| `REC_NO_AUTH` | no | — (set=1 to skip auth) |
| `AVATAR_COMPACT` | no | — (set=1 for compact placement) |

---

## DO NOT

- Render without running `cost` first.
- Skip the 10-minute ingest wait.
- Go straight to `full` after changing avatar framing.
- Commit `training/output/` — gitignored, regenerable.
- Change `.say` text in `narration.mjs` without also updating the recorder
  cues and re-checking beat times (the timing shifts).

---

## Known open items

- Module 01 beat timing assumes ~65s of footage with OD and Rippl interleaved.
  If your recording is a different length, adjust the narration beats to fit.
- Avatar placement for desktop footage (`scale 0.22`) is an initial estimate —
  verify with a `check` render before the full batch.
