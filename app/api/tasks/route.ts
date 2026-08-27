import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRecurrenceInput } from '@/lib/taskValidation'

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(tasks)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = validateRecurrenceInput(body)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const task = await prisma.task.create({ data: result.data })
    return NextResponse.json(task, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
