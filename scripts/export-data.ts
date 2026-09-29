/**
 * Write all tasks + completions to scripts/scoreday-export.json.
 *
 * From your local DB:            npm run db:export
 * From a deployed server:        API_BASE_URL=https://your-app.up.railway.app \
 *                                API_TOKEN=<token> npm run db:export
 *
 * Load the file into an empty deployment with:  npm run db:import
 * The file contains your personal data — it is git-ignored; delete it when done.
 */
import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'
import { join } from 'path'

const BASE = (process.env.API_BASE_URL || '').replace(/\/$/, '')
const TOKEN = process.env.API_TOKEN || ''

async function fromServer(): Promise<{ tasks: unknown[]; completions: unknown[] }> {
  const res = await fetch(`${BASE}/api/admin/export`, { headers: { Authorization: `Bearer ${TOKEN}` } })
  if (!res.ok) throw new Error(`Export failed: ${res.status} ${await res.text()}`)
  return res.json()
}

async function fromLocalDb() {
  const prisma = new PrismaClient()
  try {
    const tasks = await prisma.task.findMany({ orderBy: { createdAt: 'asc' } })
    const completions = await prisma.taskCompletion.findMany({ orderBy: { completedOn: 'asc' } })
    return { tasks, completions }
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  if (BASE && !TOKEN) throw new Error('API_BASE_URL is set but API_TOKEN is not.')
  const data = BASE ? await fromServer() : await fromLocalDb()
  const out = join(__dirname, 'scoreday-export.json')
  writeFileSync(out, JSON.stringify(data, null, 2))
  console.log(`Exported ${data.tasks.length} tasks, ${data.completions.length} completions from ${BASE || 'local DB'} -> ${out}`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
