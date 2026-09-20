// edit-od-footage.mjs — rebuilds 01-open-dental-workflow-padded.mp4 with freeze frames.
//
// Output timeline (output_t → source_footage_t):
//   0:00–0:26   freeze @ 0:10          (schedule+tooltip static, beats 0–1)
//   0:26–0:34   footage 0:10–0:18      (hover + double-click on appointment)
//   0:34–0:46   freeze @ 0:18          (chart menu static, beats 2–3)
//   0:46–1:13   footage 0:18–0:45      (chart → Edit Info → search → save)
//   1:13–1:14   freeze @ 0:45          (brief transition)
//   1:14–1:26   footage 0:50–1:02      (back on schedule, open appointment review)
//   1:26–1:49   footage 1:05–1:28      (close appt + back to schedule + right-click + Set Complete)
//   1:49+       freeze @ 1:28          (wrap-up beat, trimmed to need)
//
// Usage: node training/edit-od-footage.mjs

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { SCRIPTS, spokenSeconds } from './narration.mjs'

const FF = execFileSync('python3', [
  '-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'
]).toString().trim()

const s   = SCRIPTS.open_dental_workflow
const dir = 'training/output'

let src = null
for (const ext of ['mov', 'mp4']) {
  const p = `${dir}/${s.name}.${ext}`
  if (fs.existsSync(p)) { src = p; break }
}
if (!src) { console.error(`source not found: ${dir}/${s.name}.mov/mp4`); process.exit(1) }

const need = Math.ceil(spokenSeconds(s.beats)) + 6
const out  = `${dir}/${s.name}-padded.mp4`
const CROP = s.cropFilter
const FPS  = '30'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'od-edit-'))
console.log(`tmp: ${tmp}`)

// Segments: { type:'freeze', at:N, dur:D } | { type:'clip', start:S, end:E }
//
// Footage map (after inspecting source frames):
//   ~10s  schedule with hover tooltip (starting state)
//   ~18s  clinical chart loaded + dropdown menu ("motion beginning at :18")
//   ~20s  Edit Patient Information form opens
//   ~30s  Referred From search dialog
//   ~40s  referring patient selected, about to save
//   ~45s  chart view briefly after save
//   ~50s  back on schedule (clean, orange NP block)
//   ~52s  hover tooltip again, appointment being opened for review
//   ~55s  appointment edit dialog (procedure review)
//   ~65s  appointment edit (still reviewing)
//   ~69s  closing dialog, back to schedule
//   ~75s  right-click context menu (Set Complete visible)
//   ~79s  Set Complete being clicked (footage 1:19 as user referenced)
//   ~85s  schedule with updated status
//   ~90s  content ends (Loom "watch again" screen at 95s)
//
// Output timeline → source footage:
//   0:00–0:26  freeze @ 10s   (schedule+tooltip static; beats 0–1)
//   0:26–0:34  clip 10–18s    (hover + double-click; beat 2 motion start)
//   0:34–0:46  freeze @ 18s   (chart menu visible static; beats 2–3)
//   0:46–1:13  clip 18–45s    (chart → Edit Info → search → save; beats 3–4)
//   1:13–1:14  freeze @ 45s   (transition pause)
//   1:14–1:26  clip 50–62s    (back on schedule, open appointment for review; beats 5–6)
//   1:26–1:49  clip 65–88s    (close appt + find block + right-click + Set Complete; beats 7–8)
//   1:49+      freeze @ 88s   (schedule post-Set-Complete; trimmed to need)
//
// Key sync points this achieves:
//   output 0:26 → footage 10s (schedule motion starts)          [user: 0:26 motion starts]
//   output 0:46 → footage 18s (chart loads)                     [user: 0:46 motion at 0:18]
//   output 1:05 → footage 18+(65-46)=37s ≈ footage 0:36        [user: 1:05 → 0:36 ✓]
//   output 1:35–1:40 → footage 65+(95-86)=74s–79s              [user: 1:35–1:40 → 1:19 ✓]
const SEGMENTS = [
  { type: 'freeze', at: 10,  dur: 26 },  // schedule+tooltip
  { type: 'clip',   start: 10, end: 18 },  // hover + double-click (8s)
  { type: 'freeze', at: 18,  dur: 12 },  // chart loaded, static
  { type: 'clip',   start: 18, end: 45 },  // chart → Edit Info → search → save (27s)
  { type: 'freeze', at: 45,  dur:  1 },  // transition pause
  { type: 'clip',   start: 50, end: 62 },  // schedule + appointment review (12s)
  { type: 'clip',   start: 65, end: 88 },  // close + back to schedule + right-click + Set Complete (23s)
  { type: 'freeze', at: 88,  dur: 12 },  // final; trimmed to need by -t
]

const segFiles = []

for (let i = 0; i < SEGMENTS.length; i++) {
  const seg  = SEGMENTS[i]
  const file = path.join(tmp, `seg${i}.mp4`)
  segFiles.push(file)

  if (seg.type === 'freeze') {
    const png = path.join(tmp, `frame${i}.png`)
    // Extract one frame (fast seek, close enough for a freeze)
    execFileSync(FF, [
      '-y', '-ss', String(seg.at), '-i', src,
      '-vf', CROP, '-frames:v', '1', png,
    ], { stdio: 'pipe' })

    execFileSync(FF, [
      '-y', '-loop', '1', '-framerate', FPS, '-t', String(seg.dur), '-i', png,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
      '-pix_fmt', 'yuv420p', '-r', FPS, file,
    ], { stdio: 'pipe' })
    console.log(`  seg${i}: freeze @ ${seg.at}s × ${seg.dur}s`)

  } else {
    const dur = seg.end - seg.start
    execFileSync(FF, [
      '-y', '-i', src,
      '-vf', `${CROP},trim=start=${seg.start}:end=${seg.end},setpts=PTS-STARTPTS`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
      '-pix_fmt', 'yuv420p', '-r', FPS, '-an', file,
    ], { stdio: 'pipe' })
    console.log(`  seg${i}: clip  ${seg.start}s–${seg.end}s (${dur}s)`)
  }
}

// Build concat list and stitch
const concatTxt = path.join(tmp, 'list.txt')
fs.writeFileSync(concatTxt, segFiles.map(f => `file '${f}'`).join('\n'))

console.log(`stitching ${SEGMENTS.length} segments → ${out} (trimmed to ${need}s)`)
execFileSync(FF, [
  '-y', '-f', 'concat', '-safe', '0', '-i', concatTxt,
  '-t', String(need),
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
  '-pix_fmt', 'yuv420p', '-an',
  out,
], { stdio: 'inherit' })

fs.rmSync(tmp, { recursive: true })
const kb = Math.round(fs.statSync(out).size / 1024)
console.log(`saved ${out} (${kb} KB, ${need}s)`)
console.log('Run: node training/render.mjs check open_dental_workflow')
