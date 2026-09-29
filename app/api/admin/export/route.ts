import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/export — full dump of tasks + completions, in exactly the shape
 * POST /api/admin/restore accepts, so data can leave a deployment (e.g. before a
 * Railway trial ends) as easily as it arrived. `npm run db:export` with
 * API_BASE_URL set calls this.
 *
 * Only when API_TOKEN is set (middleware then requires it), mirroring restore.
 */
export async function GET() {
  if (!process.env.API_TOKEN) {
    return NextResponse.json({ error: 'Export is disabled when API_TOKEN is not set' }, { status: 403 })
  }

  try {
    const [tasks, completions] = await Promise.all([
      prisma.task.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.taskCompletion.findMany({ orderBy: { completedOn: 'asc' } }),
    ])
    return NextResponse.json({ tasks, completions })
  } catch {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
