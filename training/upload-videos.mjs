// Uploads the two final training videos to Supabase storage and prints their public URLs.
// Bucket: training-videos (created as public if it doesn't exist)
//
// Usage:
//   SUPABASE_SERVICE_ROLE=<key> node training/upload-videos.mjs

import fs from 'node:fs'
import path from 'node:path'

const SUPABASE_URL = 'https://mpakerwvdgehxbcuylzq.supabase.co'
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE
if (!SERVICE_ROLE) { console.error('SUPABASE_SERVICE_ROLE not set'); process.exit(1) }

const BUCKET = 'training-videos'
const VIDEOS = [
  { file: 'training/output/01-open-dental-workflow-final.mp4', name: '01-open-dental-workflow.mp4' },
  { file: 'training/output/02-rippl-dashboard-final.mp4',      name: '02-rippl-dashboard.mp4' },
]

const headers = {
  'Authorization': `Bearer ${SERVICE_ROLE}`,
  'apikey': SERVICE_ROLE,
}

// Create bucket if it doesn't exist
async function ensureBucket() {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  })
  const body = await res.json()
  if (res.ok || body.error === 'Duplicate') {
    console.log(`bucket: ${BUCKET} ready`)
  } else {
    console.error('bucket create failed:', body); process.exit(1)
  }
}

async function upload({ file, name }) {
  const data = fs.readFileSync(file)
  const kb = Math.round(data.length / 1024)
  console.log(`uploading ${name} (${kb} KB)...`)
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${name}`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'video/mp4',
      'x-upsert': 'true',
    },
    body: data,
  })
  if (!res.ok) {
    const t = await res.text()
    console.error(`upload failed (${res.status}):`, t); process.exit(1)
  }
  const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${name}`
  console.log(`  → ${url}`)
  return url
}

await ensureBucket()
const urls = []
for (const v of VIDEOS) urls.push(await upload(v))

console.log('\n--- Update help.tsx with these URLs ---')
console.log(`VIDEO_1: ${urls[0]}`)
console.log(`VIDEO_2: ${urls[1]}`)
