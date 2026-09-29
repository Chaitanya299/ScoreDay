import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRecurrenceInput } from '@/lib/taskValidation'
import type { RecurrenceTask } from '@/lib/recurrence'

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()

    const existing = await prisma.task.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Validation may need the stored dueDate to allow legacy past-dated
    // ONE_TIME tasks to be edited without touching their date.
    const result = validateRecurrenceInput(body, existing as RecurrenceTask)
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const task = await prisma.task.update({
      where: { id },
      data: result.data,
    })

    return NextResponse.json(task)
  } catch {
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const existing = await prisma.task.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Soft delete: keep the row so historical completions stay valid for scoring.
    const task = await prisma.task.update({
      where: { id },
      data: { active: false },
    })

    return NextResponse.json({ success: true, task })
  } catch {
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
