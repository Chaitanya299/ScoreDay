import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getLocalDateString } from '@/lib/dates'
import { getOccurrenceKey, isTaskDueOnDate } from '@/lib/recurrence'

/**
 * Complete a task.
 * Body: { taskId, dateStr? }
 *
 * occurrenceDate = canonical occurrence key (calendar date, or the week's
 * Monday for WEEKLY tasks). unique(taskId, occurrenceDate) makes duplicate
 * completion of the same occurrence impossible at the database layer; this
 * handler also responds idempotently instead of erroring on a double-tap.
 * pointsEarned is snapshotted from the task's current points and never
 * recalculated later (historical accuracy).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { taskId, dateStr } = body

    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
    }

    const completionDate =
      typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
        ? dateStr
        : getLocalDateString()

    const task = await prisma.task.findUnique({ where: { id: taskId } })
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    if (!task.active) {
      return NextResponse.json({ error: 'Task is inactive' }, { status: 400 })
    }

    const occurrenceDate = getOccurrenceKey(task, completionDate)

    const existing = await prisma.taskCompletion.findUnique({
      where: { taskId_occurrenceDate: { taskId, occurrenceDate } },
    })
    if (existing) {
      // Idempotent: same occurrence tapped twice awards nothing extra.
      return NextResponse.json({
        message: 'Occurrence already completed',
        completion: existing,
        duplicate: true,
      })
    }

    const completion = await prisma.taskCompletion.create({
      data: {
        taskId,
        occurrenceDate,
        completedOn: completionDate,
        pointsEarned: task.points,
      },
    })

    return NextResponse.json({
      success: true,
      completion,
      offSchedule: !isTaskDueOnDate(task, completionDate),
    })
  } catch {
    return NextResponse.json({ error: 'Failed to complete task' }, { status: 500 })
  }
}
