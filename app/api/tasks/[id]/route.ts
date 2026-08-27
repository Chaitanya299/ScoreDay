import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRecurrenceInput } from '@/lib/taskValidation'

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
    const result = validateRecurrenceInput(body, existing)
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
