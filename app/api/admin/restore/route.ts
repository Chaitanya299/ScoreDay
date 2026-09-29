import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/admin/restore  — one-shot, lossless import of `npm run db:export` output
 * into an EMPTY deployment (e.g. a fresh Railway volume, which is only writable from
 * inside the container). Rows are written as-is — original ids, timestamps, occurrence
 * keys and points — because history (inactive tasks, past due dates) must not be
 * re-validated like new input.
 *
 * Guards: only when API_TOKEN is set (middleware then requires it), and refuses if any
 * task already exists, so it can never overwrite live data.
 */
export async function POST(request: Request) {
  if (!process.env.API_TOKEN) {
    return NextResponse.json({ error: 'Restore is disabled when API_TOKEN is not set' }, { status: 403 })
  }

  try {
    const { tasks, completions } = (await request.json()) as {
      tasks: Array<Record<string, unknown>>
      completions: Array<Record<string, unknown>>
    }
    if (!Array.isArray(tasks) || !Array.isArray(completions)) {
      return NextResponse.json({ error: 'Expected { tasks: [], completions: [] }' }, { status: 400 })
    }

    if ((await prisma.task.count()) > 0) {
      return NextResponse.json({ error: 'Database is not empty — restore only runs on a fresh deploy' }, { status: 409 })
    }

    const [t, c] = await prisma.$transaction([
      prisma.task.createMany({ data: tasks as never }),
      prisma.taskCompletion.createMany({ data: completions as never }),
    ])

    return NextResponse.json({ success: true, tasks: t.count, completions: c.count })
  } catch (e) {
    return NextResponse.json({ error: 'Restore failed', detail: String(e) }, { status: 500 })
  }
}
