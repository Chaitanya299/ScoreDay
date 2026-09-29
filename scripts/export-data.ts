/**
 * Dump the local SQLite tasks + completions to scripts/scoreday-export.json.
 * Run against your dev DB:  npm run db:export
 * Then load them into the deployed server with:  npm run db:import
 */
import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

async function main() {
  const tasks = await prisma.task.findMany({ orderBy: { createdAt: 'asc' } })
  const completions = await prisma.taskCompletion.findMany({ orderBy: { completedOn: 'asc' } })

  const out = join(__dirname, 'scoreday-export.json')
  writeFileSync(out, JSON.stringify({ tasks, completions }, null, 2))
  console.log(`Exported ${tasks.length} tasks, ${completions.length} completions -> ${out}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
