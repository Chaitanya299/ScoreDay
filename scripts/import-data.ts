/**
 * Losslessly restore scripts/scoreday-export.json (from `npm run db:export`) into a
 * FRESH deployment via its one-shot POST /api/admin/restore endpoint — works against
 * a Railway volume with no direct file access.
 *
 *   API_BASE_URL=https://your-app.up.railway.app \
 *   API_TOKEN=<the same token you set on the server> \
 *   npm run db:import
 *
 * The server refuses if it already has any tasks, so this can't overwrite live data.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const BASE = (process.env.API_BASE_URL || '').replace(/\/$/, '')
const TOKEN = process.env.API_TOKEN || ''

async function main() {
  if (!BASE || !TOKEN) {
    console.error('Set API_BASE_URL and API_TOKEN (see header of this file).')
    process.exit(1)
  }
  const body = readFileSync(join(__dirname, 'scoreday-export.json'), 'utf8')
  const res = await fetch(`${BASE}/api/admin/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body,
  })
  const text = await res.text()
  if (!res.ok) {
    console.error(`Restore failed: ${res.status} ${text}`)
    process.exit(1)
  }
  console.log(`Restored into ${BASE}: ${text}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
