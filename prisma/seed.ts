import { PrismaClient } from '@prisma/client'
import { getLocalDateString, addDays, getWeekStart } from '../lib/dates'
import { isTaskDueOnDate, getOccurrenceKey, type RecurrenceTask } from '../lib/recurrence'

const prisma = new PrismaClient()

function saturdayThisWeek(todayIso: string): string {
  const d = new Date(todayIso + 'T00:00:00')
  const diff = (6 - d.getDay() + 7) % 7
  d.setDate(d.getDate() + diff)
  return getLocalDateString(d)
}

/**
 * Deterministic dev/CI seed. DESTRUCTIVE: wipes tasks and completions first —
 * only run against fresh local or CI databases, never production.
 *
 * Uses canonical recurrence types and dates relative to today so the seed
 * stays valid whenever it runs: two weeks of completion history (frozen
 * pointsEarned snapshots) plus scheduled-but-missed days, with today left
 * incomplete for manual/E2E completion flows.
 */
async function main() {
  await prisma.taskCompletion.deleteMany()
  await prisma.task.deleteMany()

  const today = getLocalDateString()
  const startDate = addDays(today, -30)

  const defs = [
    {
      title: 'Drink 4L Water',
      description: 'Stay hydrated throughout the day',
      category: 'Health',
      points: 8,
      recurrenceType: 'DAILY',
      startDate,
    },
    {
      title: 'Workout',
      description: 'Build strength and maintain consistency.',
      category: 'Fitness',
      points: 10,
      recurrenceType: 'WEEKLY',
      selectedWeekdays: '1,3,5', // Mon, Wed, Fri
      startDate,
    },
    {
      title: 'Read',
      description: 'Complete anytime this week.',
      category: 'Learning',
      points: 5,
      recurrenceType: 'WEEKLY_GOAL',
      startDate,
    },
    {
      title: 'Walk 10,000 Steps',
      description: 'Daily movement goal.',
      category: 'Fitness',
      points: 10,
      recurrenceType: 'DAILY',
      startDate,
    },
    {
      title: 'Complete Work',
      description: 'Finish primary deliverables.',
      category: 'Work',
      points: 10,
      recurrenceType: 'WEEKLY',
      selectedWeekdays: '1,2,3,4,5', // Weekdays
      startDate,
    },
    {
      title: 'Finish Project Report',
      description: `One-time deliverable, due ${saturdayThisWeek(today)}.`,
      category: 'Work',
      points: 9,
      recurrenceType: 'NONE',
      dueDate: saturdayThisWeek(today),
    },
  ]

  const tasks = []
  for (const t of defs) {
    tasks.push(await prisma.task.create({ data: t }))
  }

  // History: past 14 days (today excluded — left incomplete on purpose).
  // Skip each task's two most recent due days so missed sections render.
  const HISTORY_DAYS = 14
  for (const task of tasks) {
    if (task.recurrenceType === 'NONE') continue
    const rec = task as unknown as RecurrenceTask
    if (task.recurrenceType === 'WEEKLY_GOAL') {
      // One completion per ended week (week's Monday key); the most recent
      // ended week stays open so it renders as missed.
      const weeks = new Set<string>()
      for (let off = HISTORY_DAYS; off >= 1; off--) {
        const date = addDays(today, -off)
        if (isTaskDueOnDate(rec, date)) weeks.add(getWeekStart(date))
      }
      const ended = [...weeks]
        .filter(w => addDays(w, 6) < today)
        .sort()
      for (const week of ended.slice(0, -1)) {
        const completedOn = addDays(week, 2) // Wednesday of that week
        await prisma.taskCompletion.create({
          data: {
            taskId: task.id,
            occurrenceDate: week,
            completedOn,
            pointsEarned: task.points,
          },
        })
      }
      continue
    }
    const dueDays: string[] = []
    for (let off = HISTORY_DAYS; off >= 1; off--) {
      const date = addDays(today, -off)
      if (isTaskDueOnDate(rec, date)) dueDays.push(date)
    }
    const skip = new Set(dueDays.slice(-2))
    for (const date of dueDays) {
      if (skip.has(date)) continue
      await prisma.taskCompletion.create({
        data: {
          taskId: task.id,
          occurrenceDate: getOccurrenceKey(rec, date),
          completedOn: date,
          pointsEarned: task.points,
        },
      })
    }
  }

  console.log('Seed data successfully inserted.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
