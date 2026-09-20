// Recorder for module 02 — "Your Rippl Dashboard"
// Drives the live app at www.joinrippl.com/dashboard and records a .webm.
//
// Prerequisites:
//   REC_COOKIE_FILE=<path>   — file containing your sb-mpakerwvdgehxbcuylzq-auth-token cookie value
//   REC_BASE=<url>           — optional; defaults to https://www.joinrippl.com
//
// Usage:
//   node training/record-02-rippl-dashboard.mjs
//
// Output: training/output/02-rippl-dashboard.webm
// Next:   node training/convert.mjs
//         node training/render.mjs cost
//         node training/render.mjs check rippl_dashboard
//         node training/render.mjs full  rippl_dashboard

import { startRecording, finishRecording, until, pause, must, hover, glideClick, BASE } from './lib.mjs'
import { timed, SCRIPTS } from './narration.mjs'

const ID = 'rippl_dashboard'
const rec = await startRecording(SCRIPTS[ID].name)
const { page } = rec

// t(sec) = narration beat start + LEAD
// Beat 0: dashboard loads — cursor idles
// Beat 1 (t≈7.3s):  hover stat cards
// Beat 2 (t≈17.8s): hover Rewards/Active cards
// Beat 3 (t≈26.5s): scroll down to Recent Events
// Beat 4 (t≈34.8s): click Referral Events nav
// Beat 5 (t≈38.3s): scroll/interact with events list
// Beat 6 (t≈44.0s): click Patients nav
// Beat 7 (t≈46.7s): scroll patients list
// Beat 8 (t≈54.3s): click Add Patient button
// Beat 9 (t≈60.2s): close modal, hold

// ── Navigate to dashboard and wait for data ───────────────────────────────
await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
// Wait for the stat cards to render (they animate in once data loads)
await page.waitForSelector('h1:has-text("Welcome back")', { timeout: 15000 })
await pause(page, 2000)   // let the page settle visually

// ── Beat 1: Hover across the four stat cards ──────────────────────────────
await until(rec, timed(ID, 1))
// Stat cards are the first grid after the header — each is a Link to /events
const statCards = page.locator('.grid a[href="/events"], .grid a[href^="/events"], .grid a[href="/patients"]')
// If the exact selector is hard to target, fall back to the grid container
const cardGrid = page.locator('.grid').first()
const gridBox = await cardGrid.boundingBox()
if (gridBox) {
  // Glide cursor slowly across the cards left to right
  await page.mouse.move(gridBox.x + 80,  gridBox.y + gridBox.height / 2, { steps: 20 })
  await pause(page, 300)
  await page.mouse.move(gridBox.x + gridBox.width * 0.35, gridBox.y + gridBox.height / 2, { steps: 20 })
  await pause(page, 300)
  await page.mouse.move(gridBox.x + gridBox.width * 0.65, gridBox.y + gridBox.height / 2, { steps: 20 })
  await pause(page, 300)
}

// ── Beat 2: Hover Rewards Sent and Active Referrers (3rd and 4th cards) ──
await until(rec, timed(ID, 2))
if (gridBox) {
  await page.mouse.move(gridBox.x + gridBox.width * 0.65, gridBox.y + gridBox.height / 2, { steps: 20 })
  await pause(page, 400)
  await page.mouse.move(gridBox.x + gridBox.width * 0.9,  gridBox.y + gridBox.height / 2, { steps: 20 })
  await pause(page, 600)
}

// ── Beat 3: Scroll down to Recent Events ─────────────────────────────────
await until(rec, timed(ID, 3))
await page.evaluate(() => {
  // Scroll the main content area (it has overflow-y-auto)
  const main = document.querySelector('.overflow-y-auto')
  if (main) {
    main.scrollTo({ top: 600, behavior: 'smooth' })
  } else {
    window.scrollTo({ top: 600, behavior: 'smooth' })
  }
})
await pause(page, 1500)

// ── Beat 4: Click Referral Events in sidebar ─────────────────────────────
await until(rec, timed(ID, 4))
await must(page, page.locator('aside a[href="/events"]').first(), 'Referral Events nav link')
await page.waitForSelector('table, [data-testid="events-table"], h1', { timeout: 8000 }).catch(() => {})
await pause(page, 1200)

// ── Beat 5: Interact with events list ────────────────────────────────────
await until(rec, timed(ID, 5))
// Scroll slowly through the table rows to show content
await page.evaluate(() => {
  const main = document.querySelector('.overflow-y-auto')
  if (main) main.scrollTo({ top: 200, behavior: 'smooth' })
})
await pause(page, 800)
// Hover over the search bar or first row to show interactivity
const searchBar = page.locator('input[placeholder*="Search"], input[type="search"]').first()
if (await searchBar.count() > 0) {
  const box = await searchBar.boundingBox()
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 16 })
}
await pause(page, 800)

// ── Beat 6: Click Patients nav ────────────────────────────────────────────
await until(rec, timed(ID, 6))
await must(page, page.locator('aside a[href="/patients"]').first(), 'Patients nav link')
await page.waitForSelector('h1, [data-testid="patients-table"]', { timeout: 8000 }).catch(() => {})
await pause(page, 1200)

// ── Beat 7: Scroll patients list ─────────────────────────────────────────
await until(rec, timed(ID, 7))
await page.evaluate(() => {
  const main = document.querySelector('.overflow-y-auto')
  if (main) main.scrollTo({ top: 200, behavior: 'smooth' })
})
await pause(page, 700)
// Hover over first patient row to highlight it
const firstRow = page.locator('tbody tr, [data-patient-row]').first()
if (await firstRow.count() > 0) {
  await hover(page, firstRow, 600)
}

// ── Beat 8: Click Add Patient button ─────────────────────────────────────
await until(rec, timed(ID, 8))
// Button text is "Add Patient" for dental vertical
const addBtn = page.locator('button:has-text("Add Patient"), button:has-text("Add Client")').first()
await must(page, addBtn, 'Add Patient button')
// Modal opens — wait a beat for it to animate in
await page.waitForSelector('[role="dialog"], .modal, [data-modal]', { timeout: 5000 }).catch(() => {})
await pause(page, 1200)

// ── Beat 9: Close modal, hold on patients list ───────────────────────────
await until(rec, timed(ID, 9))
// Close button — Rippl modals use an X button or clicking the backdrop
const closeBtn = page.locator('[role="dialog"] button[aria-label="Close"], [role="dialog"] button:has(svg)').first()
if (await closeBtn.count() > 0) {
  await glideClick(page, closeBtn, 400)
} else {
  // Fall back to Escape
  await page.keyboard.press('Escape')
}
await pause(page, 2500)   // hold so the last sentence finishes

await finishRecording(rec)
