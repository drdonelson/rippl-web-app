// HeyGen render pipeline for the two Rippl help videos.
//
// Uses the LOCKED RECIPE from the Cadence batch (2026-07-04/08-22). Every
// setting here was paid for in wasted credits — do not simplify:
//
//   * canvas MUST equal the footage size exactly (1280×720). A different
//     canvas letterboxes or crops the background.
//   * background play_style MUST be "fit_to_scene". The `fit` parameter is
//     silently ignored for video backgrounds.
//   * After uploading an asset you MUST WAIT ~10 minutes before rendering.
//     HeyGen ingests asynchronously — rendering too soon composites the
//     background tiny or cropped, and you pay for the ruined render.
//   * Always run the 3-credit check before the full render.
//
// Usage:
//   node training/render.mjs cost                      # per-module seconds + balance
//   node training/render.mjs check <module>            # ~3 credits, verify framing
//   node training/render.mjs full  <module>            # the real render
//   node training/render.mjs upload-all                # upload all footage at once
//   node training/render.mjs status <video_id>

import fs from 'node:fs'
import path from 'node:path'
import { SCRIPTS, SCRIPT_ORDER, narrationText, spokenSeconds } from './narration.mjs'

const KEY = process.env.HEYGEN_API_KEY ?? readEnvLocal('HEYGEN_API_KEY')
if (!KEY) { console.error('HEYGEN_API_KEY not found (env or .env.local)'); process.exit(1) }

// ── Locked recipe ────────────────────────────────────────────────────────────
const AVATAR_ID   = 'd7b9b0a724d14e6787fa0ea401ce89f4'   // "Man in olive green shirt"
const VOICE_ID    = '8220da7f3bdc4f8c80c750e735e95813'   // "David 2" — full ID verified 2026-08-22
const VOICE_SPEED = 1.08
const CANVAS      = { width: 1280, height: 720 }          // == footage size, exactly

// Avatar placement for landscape desktop footage.
// DEFAULT: small circle, bottom-right corner — keeps the avatar out of the
//   main content area while still clearly visible.
// COMPACT: even smaller, for clips where the bottom-right corner is busy UI.
// Set AVATAR_COMPACT=1 env var to use COMPACT.
// Adjust scale/offset with `check` renders (3 credits each) before going full.
const AVATAR_DEFAULT = { talking_photo_style: 'circle', scale: 0.22, offset: { x: 0.32, y: 0.27 } }
const AVATAR_COMPACT = { talking_photo_style: 'circle', scale: 0.16, offset: { x: 0.36, y: 0.27 } }
const AVATAR_STYLE   = process.env.AVATAR_COMPACT ? AVATAR_COMPACT : AVATAR_DEFAULT

const ASSET_SETTLE_MS = 10 * 60 * 1000   // 10-minute ingest wait
const MANIFEST        = 'training/output/assets.json'

function readEnvLocal(name) {
  try {
    const txt = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    const m = txt.match(new RegExp(`^${name}=(.*)$`, 'm'))
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : null
  } catch { return null }
}

const api = async (url, opts = {}) => {
  const res = await fetch(url, {
    ...opts,
    headers: { 'X-Api-Key': KEY, 'Content-Type': 'application/json', ...(opts.headers ?? {}) },
  })
  const text = await res.text()
  let json; try { json = JSON.parse(text) } catch { json = { raw: text } }
  if (!res.ok) throw new Error(`${res.status} ${url}\n${text.slice(0, 400)}`)
  return json
}

async function uploadFootage(file) {
  const bytes = fs.readFileSync(file)
  const type = file.endsWith('.webm') ? 'video/webm' : 'video/mp4'
  const res = await fetch('https://upload.heygen.com/v1/asset', {
    method: 'POST',
    headers: { 'X-Api-Key': KEY, 'Content-Type': type },
    body: bytes,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`upload failed: ${JSON.stringify(json).slice(0, 400)}`)
  const id = json?.data?.id ?? json?.data?.video_asset_id
  if (!id) throw new Error(`no asset id in response: ${JSON.stringify(json).slice(0, 400)}`)
  return id
}

function payload(assetId, text, title) {
  return {
    title,
    dimension: CANVAS,
    video_inputs: [{
      character: { type: 'talking_photo', talking_photo_id: AVATAR_ID, ...AVATAR_STYLE },
      voice:     { type: 'text', voice_id: VOICE_ID, input_text: text, speed: VOICE_SPEED },
      background: { type: 'video', video_asset_id: assetId, play_style: 'fit_to_scene' },
    }],
  }
}

const generate = (assetId, text, title) =>
  api('https://api.heygen.com/v2/video/generate', {
    method: 'POST', body: JSON.stringify(payload(assetId, text, title)),
  }).then(r => r.data.video_id)

const statusOf = id =>
  api(`https://api.heygen.com/v1/video_status.get?video_id=${id}`).then(r => r.data)

async function waitFor(id, label) {
  process.stdout.write(`${label}: rendering`)
  for (;;) {
    await new Promise(r => setTimeout(r, 15000))
    const s = await statusOf(id)
    if (s.status === 'completed') { console.log(' done'); return s }
    if (s.status === 'failed')   { console.log(' FAILED'); throw new Error(JSON.stringify(s.error ?? s)) }
    process.stdout.write('.')
  }
}

async function download(url, out) {
  const res = await fetch(url)
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()))
  console.log(`saved ${out} (${Math.round(fs.statSync(out).size / 1024)} KB)`)
}

// Prefer padded MP4 from convert.mjs; fall back to raw webm/mp4.
// Refuses if the padded file is OLDER than the source footage — the clip was
// re-recorded but not re-converted, which would render the wrong take.
function footageFor(script) {
  const dir = 'training/output'
  const padded = path.join(dir, `${script.name}-padded.mp4`)

  // Check all raw source formats
  let rawSrc = null
  for (const ext of ['webm', 'mov', 'mp4']) {
    const p = path.join(dir, `${script.name}.${ext}`)
    if (fs.existsSync(p)) { rawSrc = p; break }
  }

  if (fs.existsSync(padded) && rawSrc &&
      fs.statSync(padded).mtimeMs < fs.statSync(rawSrc).mtimeMs) {
    throw new Error(
      `${script.name}-padded.mp4 is OLDER than the source footage.\n` +
      `  The clip was re-recorded but not re-converted. Rendering now\n` +
      `  would spend credits on the previous take.\n` +
      `  Run: node training/convert.mjs`)
  }

  if (fs.existsSync(padded)) return padded
  if (rawSrc) return rawSrc
  return null
}

const [, , cmd, arg] = process.argv

if (cmd === 'cost') {
  let total = 0
  console.log('module                    spoken   +pad   footage')
  for (const k of SCRIPT_ORDER) {
    const s = SCRIPTS[k]
    const secs = spokenSeconds(s.beats)
    const withPad = Math.ceil(secs) + 6
    total += withPad
    const tag = s.manualFootage ? '(manual)' : ''
    console.log(`${s.name.padEnd(26)} ${String(Math.round(secs)).padStart(5)}s ${String(withPad).padStart(6)}s   ${footageFor(s) ?? 'MISSING'} ${tag}`)
  }
  const quota = await api('https://api.heygen.com/v2/user/remaining_quota').catch(() => null)
  console.log(`\ntotal ≈ ${total} credits (~1 credit per second of output)`)
  if (quota) console.log(`api credits available: ${quota.data.remaining_quota}`)
  process.exit(0)
}

if (cmd === 'upload-all') {
  const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {}
  for (const k of SCRIPT_ORDER) {
    const s2 = SCRIPTS[k]
    if (manifest[k]?.assetId) { console.log(`${s2.name}: already uploaded`); continue }
    const f = footageFor(s2)
    if (!f) { console.log(`${s2.name}: NO FOOTAGE, skipped`); continue }
    const id = await uploadFootage(f)
    manifest[k] = { assetId: id, footage: f, uploadedAt: new Date().toISOString() }
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2))
    console.log(`${s2.name}: ${id}`)
  }
  console.log(`\nmanifest: ${MANIFEST}`)
  console.log(`Now WAIT ~10 minutes before rendering, then run check on one video.`)
  process.exit(0)
}

if (cmd === 'status') {
  console.log(JSON.stringify(await statusOf(arg), null, 2))
  process.exit(0)
}

if (!['check', 'full'].includes(cmd) || !arg) {
  console.log('usage: node training/render.mjs <check|full|cost|upload-all|status> [module|video_id]')
  console.log('modules:', SCRIPT_ORDER.join(', '))
  process.exit(1)
}

const script = SCRIPTS[arg]
if (!script) { console.error(`unknown module: ${arg}`); process.exit(1) }
const footage = footageFor(script)
if (!footage) { console.error(`no footage found for ${script.name} — provide it first`); process.exit(1) }

console.log(`module:  ${script.module}`)
console.log(`footage: ${footage}`)

// Reuse a cached asset if it's newer than the footage on disk.
const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {}
let assetId = manifest[arg]?.assetId
const footageMtime = fs.statSync(footage).mtimeMs
const cachedAt = manifest[arg]?.uploadedAt ? new Date(manifest[arg].uploadedAt).getTime() : 0

if (assetId && cachedAt > footageMtime) {
  console.log(`asset: reusing ${assetId} (uploaded ${manifest[arg].uploadedAt})`)
} else {
  if (assetId) console.log(`asset: footage is newer than cached asset — re-uploading`)
  process.stdout.write(`uploading ${path.basename(footage)} (${Math.round(fs.statSync(footage).size / 1024 / 1024)}MB)...`)
  assetId = await uploadFootage(footage)
  manifest[arg] = { assetId, footage, uploadedAt: new Date().toISOString() }
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2))
  console.log(` ${assetId}`)

  // MANDATORY 10-minute ingest wait. Skipping this produced broken renders in
  // the Cadence batch (2026-07-04). The wait is served once per asset upload.
  console.log(`waiting 10 minutes for HeyGen to ingest the asset...`)
  await new Promise(r => setTimeout(r, ASSET_SETTLE_MS))
  console.log(`ingest wait complete`)
}

const isCheck = cmd === 'check'
const text = isCheck
  ? script.beats[0].say   // one sentence — costs ~3 credits, verifies framing
  : narrationText(script.beats)

console.log(`rendering (${isCheck ? 'CHECK' : 'FULL'}) ...`)
const videoId = await generate(assetId, text, `${script.title}${isCheck ? ' [CHECK]' : ''}`)
console.log(`video_id: ${videoId}`)

const result = await waitFor(videoId, script.name)
const suffix = isCheck ? '-check' : '-final'
const outPath = `training/output/${script.name}${suffix}.mp4`
await download(result.video_url, outPath)
console.log(`\nDone. ${isCheck ? 'Inspect framing before running `full`.' : 'Ready to upload.'}`)
