// webm / mov → H.264 MP4, padded so footage always outlasts the voice track.
// tpad clones the last frame rather than looping, so HeyGen sees a clean end.
//
// Handles both .webm (from Playwright) and .mov/.mp4 (from manual screen
// recording — e.g. the Open Dental module).
//
// Usage: node training/convert.mjs
// Output: training/output/<name>-padded.mp4

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { SCRIPTS, SCRIPT_ORDER, spokenSeconds } from './narration.mjs'

// Resolve ffmpeg via imageio_ffmpeg (same approach as the Cadence pipeline).
const FF = execFileSync('python3', [
  '-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'
]).toString().trim()

const CANVAS = '1280:720'

for (const k of SCRIPT_ORDER) {
  const s = SCRIPTS[k]
  const dir = 'training/output'
  const out = `${dir}/${s.name}-padded.mp4`
  const need = Math.ceil(spokenSeconds(s.beats)) + 6

  // Find source footage — prefer existing webm/mov/mp4 in that order
  let src = null
  for (const ext of ['webm', 'mov', 'mp4']) {
    const p = `${dir}/${s.name}.${ext}`
    if (fs.existsSync(p)) { src = p; break }
  }
  if (!src) { console.log(`skip ${s.name} (no footage)`); continue }

  // Per-module crop override (e.g. to strip Loom player chrome from manual recordings)
  // falls back to simple tpad+scale for Playwright-recorded webms
  const vf = s.cropFilter
    ? `${s.cropFilter},tpad=stop_mode=clone:stop_duration=8`
    : `tpad=stop_mode=clone:stop_duration=8,scale=${CANVAS}`

  console.log(`${s.name}: ${src} → ${out} (${need}s)`)
  execFileSync(FF, [
    '-y', '-i', src,
    '-vf', vf,
    '-t', String(need),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
    '-pix_fmt', 'yuv420p', '-an',
    out,
  ], { stdio: 'inherit' })
  const kb = Math.round(fs.statSync(out).size / 1024)
  console.log(`  saved ${out} (${kb} KB)`)
}
