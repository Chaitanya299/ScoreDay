import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getLocalDateString } from '@/lib/dates'
import { getOccurrenceKey, isTaskDueOnDate, type RecurrenceTask } from '@/lib/recurrence'

/**
 * Complete a task.
 * Body: { taskId, dateStr? }
 *
 * occurrenceDate = canonical occurrence key (calendar date, or the week's
 * Monday for WEEKLY_GOAL tasks). unique(taskId, occurrenceDate) makes duplicate
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

    const recTask: RecurrenceTask = task as RecurrenceTask
    const occurrenceDate = getOccurrenceKey(recTask, completionDate)

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
      offSchedule: !isTaskDueOnDate(recTask, completionDate),
    })
  } catch {
    return NextResponse.json({ error: 'Failed to complete task' }, { status: 500 })
  }
}

/**
 * Undo a completion.
 * Body: { taskId, dateStr? }
 *
 * Removes the TaskCompletion record for the occurrence — the occurrence
 * becomes incomplete again and can be completed anew. Historical points are
 * never mutated: the record is deleted, not edited, and Task.points is
 * untouched. Undoing an already-undone occurrence returns 404 with
 * alreadyUndone: true (not an error state for the UI).
 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { taskId, dateStr } = body

    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
    }

    if (dateStr !== undefined && (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr))) {
      return NextResponse.json({ error: 'dateStr must be YYYY-MM-DD' }, { status: 400 })
    }
    const completionDate = typeof dateStr === 'string' ? dateStr : getLocalDateString()

    const task = await prisma.task.findUnique({ where: { id: taskId } })
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const recTask: RecurrenceTask = task as RecurrenceTask
    const occurrenceDate = getOccurrenceKey(recTask, completionDate)

    const result = await prisma.taskCompletion.deleteMany({
      where: { taskId, occurrenceDate },
    })

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Completion not found', alreadyUndone: true },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, undone: result.count })
  } catch {
    return NextResponse.json({ error: 'Failed to undo completion' }, { status: 500 })
  }
}
