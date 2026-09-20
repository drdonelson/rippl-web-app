// Opens a real browser, lets you log in, then saves the session to a file.
// Usage: node training/get-session.mjs
// Output: /tmp/rippl-session.txt

import { chromium } from 'playwright'
import fs from 'node:fs'

const OUT = process.env.REC_COOKIE_FILE ?? '/tmp/rippl-session.txt'

const browser = await chromium.launch({ headless: false })
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
const page = await context.newPage()

await page.goto('https://www.joinrippl.com/login')
console.log('Log in to Rippl in the browser window that just opened.')
console.log('Waiting for dashboard...')

await page.waitForURL('**/dashboard', { timeout: 120_000 })
await page.waitForTimeout(2000)

const session = await page.evaluate(() => localStorage.getItem('rippl_session'))
if (!session) { console.error('No rippl_session in localStorage — try refreshing the page after login.'); process.exit(1) }

fs.writeFileSync(OUT, session)
console.log(`Saved session to ${OUT} (${session.length} bytes)`)
await browser.close()
