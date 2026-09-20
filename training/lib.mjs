// Shared Playwright plumbing for Rippl training-video recorders.
// Drives the live app at www.joinrippl.com at 1280×720 (desktop HD),
// overlays a visible cursor with click ripples, and paces actions to the
// narration timing model in narration.mjs.
// Output: training/output/*.webm

import { chromium } from 'playwright'
import fs from 'node:fs'

const COOKIE_FILE = process.env.REC_COOKIE_FILE
// Set REC_BASE=https://staging.joinrippl.com to record against a non-prod env.
export const BASE = process.env.REC_BASE ?? 'https://www.joinrippl.com'
// Rippl uses createClient with storageKey:"rippl_session" → auth lives in localStorage
const STORAGE_KEY = 'rippl_session'

export async function startRecording(name) {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport:         { width: 1280, height: 720 },
    deviceScaleFactor: 2,
    recordVideo: { dir: 'training/output/', size: { width: 1280, height: 720 } },
  })

  if (!process.env.REC_NO_AUTH) {
    if (!COOKIE_FILE) throw new Error('REC_COOKIE_FILE not set — pass the path to your session file')
    const sessionValue = fs.readFileSync(COOKIE_FILE, 'utf8').trim()
    await context.addInitScript(({ key, value }) => {
      localStorage.setItem(key, value)
    }, { key: STORAGE_KEY, value: sessionValue })
  }

  // Visible cursor: a soft dot that follows the virtual mouse with a ripple
  // on click — Playwright's pointer is invisible by default.
  await context.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      const dot = document.createElement('div')
      dot.style.cssText =
        'position:fixed;z-index:99999;width:26px;height:26px;border-radius:50%;' +
        'background:rgba(37,99,235,.35);border:2.5px solid rgba(37,99,235,.9);' +
        'pointer-events:none;transform:translate(-50%,-50%);' +
        'transition:left .05s linear,top .05s linear;left:-50px;top:-50px'
      document.body.appendChild(dot)
      document.addEventListener('mousemove', e => {
        dot.style.left = e.clientX + 'px'
        dot.style.top  = e.clientY + 'px'
      }, true)
      document.addEventListener('mousedown', e => {
        const r = document.createElement('div')
        r.style.cssText =
          `position:fixed;z-index:99998;width:26px;height:26px;border-radius:50%;` +
          `border:3px solid rgba(37,99,235,.8);pointer-events:none;` +
          `transform:translate(-50%,-50%);left:${e.clientX}px;top:${e.clientY}px;` +
          `animation:trainingRipple .5s ease-out forwards`
        document.body.appendChild(r)
        setTimeout(() => r.remove(), 550)
      }, true)
      const style = document.createElement('style')
      style.textContent = '@keyframes trainingRipple{to{width:70px;height:70px;opacity:0}}'
      document.head.appendChild(style)
    })
  })

  const page = await context.newPage()

  // Warm-up before t0: navigate once so the Supabase client can refresh an
  // expired access token, verify we're actually signed in, and write the
  // rotated session back. Doing it here means a run that later throws still
  // leaves a usable cookie — the same pattern that saved the Cadence batch.
  if (!process.env.REC_NO_AUTH) {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(4000)
    await assertSignedIn(page)
    await persistSession({ context })
  }

  return { browser, context, page, name, t0: Date.now() }
}

// Supabase refresh tokens ROTATE and are single-use. Write the updated token
// back so every subsequent run uses the freshest value.
export async function persistSession(rec) {
  if (process.env.REC_NO_AUTH || !COOKIE_FILE) return
  try {
    const sessionValue = await rec.page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
    if (!sessionValue) return
    const current = fs.readFileSync(COOKIE_FILE, 'utf8').trim()
    if (sessionValue === current) return
    fs.writeFileSync(COOKIE_FILE + '.tmp', sessionValue)
    fs.renameSync(COOKIE_FILE + '.tmp', COOKIE_FILE)
    console.log('session: refreshed token written back')
  } catch (e) {
    console.warn('session: could not persist refreshed session —', e.message)
  }
}

// A dead session redirects to /login. Catch it before the recorder wastes
// 60 seconds on element-not-found errors.
export async function assertSignedIn(page) {
  if (process.env.REC_NO_AUTH) return
  if (/\/login\b/.test(page.url())) {
    throw new Error(
      'RECORDER: session expired — app redirected to /login.\n' +
      '  Sign in at www.joinrippl.com, open DevTools → Console, run:\n' +
      '    localStorage.getItem("rippl_session")\n' +
      `  Paste the output into ${COOKIE_FILE}`)
  }
}

/** Wait until `sec` seconds after t0 (no-op if already past). */
export async function until(rec, sec) {
  const wait = rec.t0 + sec * 1000 - Date.now()
  if (wait > 0) await rec.page.waitForTimeout(wait)
}

export async function finishRecording({ browser, context, page, name }) {
  const video = page.video()
  await persistSession({ context })
  await context.close()
  const path = await video.path()
  const out = `training/output/${name}.webm`
  fs.renameSync(path, out)
  await browser.close()
  const kb = Math.round(fs.statSync(out).size / 1024)
  console.log(`saved ${out} (${kb} KB)`)
  return out
}

export const pause = (page, ms) => page.waitForTimeout(ms)

/** Glide the cursor to an element and click. */
export async function glideClick(page, locator, ms = 700) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('glideClick: element not visible')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 24 })
  await pause(page, ms)
  await locator.click()
}

/** Type into a field with human-like key delay. */
export async function humanType(page, locator, text, delay = 110) {
  await glideClick(page, locator, 500)
  for (const ch of text) {
    await page.keyboard.type(ch, { delay })
  }
}

/** Smooth-scroll the page to toY pixels. */
export async function smoothScroll(page, toY, step = 18) {
  await page.evaluate(async ({ toY, step }) => {
    const start = window.scrollY
    const dir = toY > start ? 1 : -1
    for (let y = start; dir > 0 ? y < toY : y > toY; y += dir * step) {
      window.scrollTo(0, y)
      await new Promise(r => setTimeout(r, 14))
    }
    window.scrollTo(0, toY)
  }, { toY, step })
}

/**
 * Click something that MUST be on screen. A recorder that swallows a missing
 * element produces footage where the narration describes something the screen
 * never does — the same failure mode that ruined two Cadence takes.
 */
export async function must(page, locator, label, ms = 700) {
  const n = await locator.count()
  if (n === 0) throw new Error(`RECORDER: "${label}" not found — footage would be static`)
  await glideClick(page, locator.first(), ms)
}

/** Move cursor over an element without clicking — for pointing demos. */
export async function hover(page, locator, ms = 800) {
  const box = await locator.boundingBox()
  if (!box) return
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 24 })
  await pause(page, ms)
}
