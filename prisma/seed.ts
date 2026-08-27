import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function iso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function saturdayThisWeek(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = 6 - day
  const off = diff < 0 ? diff + 7 : diff === 0 ? 0 : diff
  d.setDate(d.getDate() + off)
  return iso(d)
}

async function main() {
  await prisma.taskCompletion.deleteMany()
  await prisma.task.deleteMany()

  const tasks = [
    {
      title: 'Drink 4L Water',
      description: 'Stay hydrated throughout the day',
      category: 'Health',
      points: 8,
      recurrenceType: 'DAILY',
    },
    {
      title: 'Workout',
      description: 'Build strength and maintain consistency.',
      category: 'Fitness',
      points: 10,
      recurrenceType: 'SPECIFIC_DAYS',
      daysOfWeek: '1,3,5', // Mon, Wed, Fri
    },
    {
      title: 'Read',
      description: 'Complete anytime this week.',
      category: 'Learning',
      points: 5,
      recurrenceType: 'WEEKLY',
    },
    {
      title: 'Walk 10,000 Steps',
      description: 'Daily movement goal.',
      category: 'Fitness',
      points: 10,
      recurrenceType: 'DAILY',
    },
    {
      title: 'Complete Work',
      description: 'Finish primary deliverables.',
      category: 'Work',
      points: 10,
      recurrenceType: 'SPECIFIC_DAYS',
      daysOfWeek: '1,2,3,4,5', // Weekdays
    },
    {
      title: 'Finish Project Report',
      description: `One-time deliverable, due ${saturdayThisWeek()}.`,
      category: 'Work',
      points: 9,
      recurrenceType: 'ONE_TIME',
      dueDate: saturdayThisWeek(),
    },
  ]

  for (const t of tasks) {
    await prisma.task.create({ data: t })
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
