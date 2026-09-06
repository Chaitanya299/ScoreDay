import { describe, it, expect, vi } from 'vitest'
import {
  getTaskPerformance,
  getAllTaskPerformance,
  getCategoryPerformance,
  getMissedOccurrences,
} from '@/lib/progress'
import type { RecurrenceTask } from '@/lib/recurrence'

// Self-contained mocks for performance-section coverage: custom intervals,
// monthly recurrence, one-time bounds, inactive tasks, and uncategorized
// tasks — without disturbing the shared mocks in progress.test.ts.
type MockTask = RecurrenceTask & {
  id: string
  title: string
  category: string | null
  points: number
  active: boolean
}

const { mockTasks, mockCompletions } = vi.hoisted(() => {
  const tasks: MockTask[] = [
    {
      id: 't-daily', title: 'Daily Habit', category: 'Health', points: 10,
      recurrenceType: 'DAILY', interval: 1, startDate: '2026-01-01', active: true,
    },
    {
      id: 't-mwf', title: 'Zulu Workout', category: 'Work', points: 10,
      recurrenceType: 'WEEKLY', interval: 1, selectedWeekdays: '1,3,5',
      startDate: '2026-01-01', active: true,
    },
    {
      id: 't-goal', title: 'Weekly Goal', category: 'Learning', points: 5,
      recurrenceType: 'WEEKLY_GOAL', interval: 1, startDate: '2026-01-01', active: true,
    },
    {
      id: 't-custom', title: 'Alpha Custom', category: 'Health', points: 6,
      recurrenceType: 'CUSTOM', interval: 3, unit: 'DAY',
      startDate: '2026-09-01', active: true,
    },
    {
      id: 't-monthly', title: 'Monthly Review', category: 'Personal', points: 12,
      recurrenceType: 'CUSTOM', interval: 1, unit: 'MONTH', dayOfMonth: 15,
      startDate: '2026-01-15', active: true,
    },
    {
      id: 't-once', title: 'Future One-time', category: 'Home', points: 7,
      recurrenceType: 'NONE', interval: 1, dueDate: '2026-09-20', active: true,
    },
    {
      id: 't-inactive', title: 'Old Habit', category: 'Health', points: 10,
      recurrenceType: 'DAILY', interval: 1, startDate: '2026-01-01', active: false,
    },
    {
      id: 't-nocat', title: 'No Category Task', category: null, points: 4,
      recurrenceType: 'DAILY', interval: 1, startDate: '2026-01-01', active: true,
    },
    {
      id: 't-ended', title: 'Ended Task', category: 'Work', points: 10,
      recurrenceType: 'DAILY', interval: 1, startDate: '2026-01-01',
      endDate: '2026-08-31', active: true,
    },
  ]

  const completions = [
    // Daily: 3 of 7 in 09-01..09-07
    { taskId: 't-daily', occurrenceDate: '2026-09-01', completedOn: '2026-09-01', pointsEarned: 10 },
    { taskId: 't-daily', occurrenceDate: '2026-09-02', completedOn: '2026-09-02', pointsEarned: 10 },
    { taskId: 't-daily', occurrenceDate: '2026-09-03', completedOn: '2026-09-03', pointsEarned: 10 },
    // MWF: 1 of 3 (Wed 09-02)
    { taskId: 't-mwf', occurrenceDate: '2026-09-02', completedOn: '2026-09-02', pointsEarned: 10 },
    // Goal: week of 08-31 completed 09-03; week of 09-07 open
    { taskId: 't-goal', occurrenceDate: '2026-08-31', completedOn: '2026-09-03', pointsEarned: 5 },
    // Custom every-3-days from 09-01: completed 09-01 only
    { taskId: 't-custom', occurrenceDate: '2026-09-01', completedOn: '2026-09-01', pointsEarned: 6 },
    // Monthly: completed 09-15
    { taskId: 't-monthly', occurrenceDate: '2026-09-15', completedOn: '2026-09-15', pointsEarned: 12 },
    // No-category daily: all 7 completed
    { taskId: 't-nocat', occurrenceDate: '2026-09-01', completedOn: '2026-09-01', pointsEarned: 4 },
    { taskId: 't-nocat', occurrenceDate: '2026-09-02', completedOn: '2026-09-02', pointsEarned: 4 },
    { taskId: 't-nocat', occurrenceDate: '2026-09-03', completedOn: '2026-09-03', pointsEarned: 4 },
    { taskId: 't-nocat', occurrenceDate: '2026-09-04', completedOn: '2026-09-04', pointsEarned: 4 },
    { taskId: 't-nocat', occurrenceDate: '2026-09-05', completedOn: '2026-09-05', pointsEarned: 4 },
    { taskId: 't-nocat', occurrenceDate: '2026-09-06', completedOn: '2026-09-06', pointsEarned: 4 },
    { taskId: 't-nocat', occurrenceDate: '2026-09-07', completedOn: '2026-09-07', pointsEarned: 4 },
  ]

  return { mockTasks: tasks, mockCompletions: completions }
})

vi.mock('@/lib/prisma', () => ({
  prisma: {
    task: {
      findMany: vi.fn((args?: { where?: { active?: boolean } }) => {
        let tasks = mockTasks
        if (args?.where?.active !== undefined) {
          tasks = tasks.filter(t => t.active === args.where!.active)
        }
        return Promise.resolve(tasks)
      }),
      findUnique: vi.fn((args: { where: { id: string } }) => {
        const task = mockTasks.find(t => t.id === args.where.id)
        return Promise.resolve(task ?? null)
      }),
    },
    taskCompletion: {
      findMany: vi.fn((args?: {
        where?: {
          completedOn?: string | { gte: string; lte: string }
          taskId?: string
          occurrenceDate?: { in: string[] }
        }
      }) => {
        let result = mockCompletions
        const where = args?.where
        if (!where) return Promise.resolve(result)
        const completedOn = where.completedOn
        if (completedOn) {
          if (typeof completedOn === 'string') {
            result = result.filter(c => c.completedOn === completedOn)
          } else {
            const { gte, lte } = completedOn
            result = result.filter(c => c.completedOn >= gte && c.completedOn <= lte)
          }
        }
        if (where.taskId) result = result.filter(c => c.taskId === where.taskId)
        if (where.occurrenceDate) result = result.filter(c => where.occurrenceDate!.in.includes(c.occurrenceDate))
        return Promise.resolve(result)
      }),
    },
  },
}))

const WEEK = { start: '2026-09-01', end: '2026-09-07' }

describe('Task Performance', () => {
  it('counts custom every-3-days occurrences (09-01, 09-04, 09-07)', async () => {
    const result = await getTaskPerformance('t-custom', WEEK)
    expect(result?.scheduledOccurrences).toBe(3)
    expect(result?.completedOccurrences).toBe(1)
    expect(result?.completionRate).toBe(33)
    expect(result?.pointsEarned).toBe(6)
  })

  it('counts monthly occurrence once in September', async () => {
    const result = await getTaskPerformance('t-monthly', { start: '2026-09-01', end: '2026-09-30' })
    expect(result?.scheduledOccurrences).toBe(1)
    expect(result?.completedOccurrences).toBe(1)
    expect(result?.completionRate).toBe(100)
  })

  it('gives a future one-time task zero scheduled occurrences in a past range', async () => {
    const result = await getTaskPerformance('t-once', WEEK)
    expect(result?.scheduledOccurrences).toBe(0)
    expect(result?.completedOccurrences).toBe(0)
  })

  it('respects endDate bounds', async () => {
    const result = await getTaskPerformance('t-ended', WEEK)
    expect(result?.scheduledOccurrences).toBe(0)
  })

  it('excludes inactive, unscheduled, and out-of-range tasks from the list', async () => {
    const results = await getAllTaskPerformance(WEEK)
    const ids = results.map(r => r.taskId)
    expect(ids).not.toContain('t-inactive')
    expect(ids).not.toContain('t-monthly')
    expect(ids).not.toContain('t-once')
    expect(ids).not.toContain('t-ended')
    expect(results.length).toBe(5)
  })

  it('sorts weakest first with alphabetical tiebreak', async () => {
    const results = await getAllTaskPerformance(WEEK)
    const rates = results.map(r => `${r.completionRate}:${r.title}`)
    expect(rates).toEqual([
      '33:Alpha Custom',
      '33:Zulu Workout',
      '43:Daily Habit',
      '50:Weekly Goal',
      '100:No Category Task',
    ])
  })
})

describe('Category Performance', () => {
  it('aggregates weakest first with name tiebreak', async () => {
    const results = await getCategoryPerformance(WEEK)
    expect(results.map(c => `${c.completionRate}:${c.category}`)).toEqual([
      '33:Work',
      '40:Health',
      '50:Learning',
      '100:Uncategorized',
    ])
  })

  it('labels null categories as Uncategorized (never null)', async () => {
    const results = await getCategoryPerformance(WEEK)
    for (const c of results) {
      expect(typeof c.category).toBe('string')
      expect(c.category.length).toBeGreaterThan(0)
    }
    const uncategorized = results.find(c => c.category === 'Uncategorized')
    expect(uncategorized?.scheduledOccurrences).toBe(7)
    expect(uncategorized?.pointsEarned).toBe(28)
  })

  it('returns empty for a range with no scheduled tasks', async () => {
    const results = await getCategoryPerformance({ start: '2020-01-01', end: '2020-01-07' })
    expect(results).toEqual([])
  })
})

describe('Missed Occurrences', () => {
  it('lists past incomplete occurrences only (today and future excluded)', async () => {
    const missed = await getMissedOccurrences(WEEK, '2026-09-05')
    // Daily missed 09-04; MWF missed 09-04; custom missed 09-04.
    // 09-05..09-07 excluded (today/future), goal week open, nocat complete.
    expect(missed.length).toBe(3)
    for (const m of missed) {
      expect(m.occurrenceDate).toBe('2026-09-04')
    }
    expect(missed.map(m => m.taskId).sort()).toEqual(['t-custom', 't-daily', 't-mwf'])
  })

  it('never lists inactive tasks', async () => {
    const missed = await getMissedOccurrences(WEEK, '2026-09-08')
    expect(missed.find(m => m.taskId === 't-inactive')).toBeUndefined()
  })

  it('lists a past-due one-time task', async () => {
    const missed = await getMissedOccurrences({ start: '2026-09-20', end: '2026-09-21' }, '2026-09-22')
    const once = missed.find(m => m.taskId === 't-once')
    expect(once?.occurrenceDate).toBe('2026-09-20')
    expect(once?.points).toBe(7)
  })

  it('lists an uncompleted goal only after its week ends', async () => {
    const midWeek = await getMissedOccurrences({ start: '2026-09-07', end: '2026-09-09' }, '2026-09-10')
    expect(midWeek.find(m => m.taskId === 't-goal')).toBeUndefined()
    const afterWeek = await getMissedOccurrences({ start: '2026-09-07', end: '2026-09-14' }, '2026-09-15')
    const goal = afterWeek.find(m => m.taskId === 't-goal')
    expect(goal?.occurrenceDate).toBe('2026-09-07')
  })
})
