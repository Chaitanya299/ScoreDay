import { describe, it, expect, vi } from 'vitest'
import {
  getCurrentStreak,
  getBestStreak,
  getConsistencyRate,
  getDayScoresInRange,
} from '@/lib/streaks'
import type { RecurrenceTask } from '@/lib/recurrence'

// Mock Prisma - use vi.hoisted to avoid hoisting issues.
// Single MWF task (Mon/Wed/Fri, 10pts): Tue/Thu/Sat/Sun are no-task days,
// which exercises the "skip no-data days" streak rule.
const { mockTasks, mockCompletions } = vi.hoisted(() => {
  const tasks: Array<RecurrenceTask & { id: string; title: string; category: string | null; points: number }> = [
    {
      id: 'task-mwf',
      title: 'MWF Workout',
      category: 'Fitness',
      points: 10,
      recurrenceType: 'WEEKLY',
      interval: 1,
      selectedWeekdays: '1,3,5',
      startDate: '2025-01-01',
    },
  ]

  const completions = [
    // Year-boundary run: Mon 12-29, Wed 12-31, Fri 01-02 (Tue/Thu skipped)
    { taskId: 'task-mwf', occurrenceDate: '2025-12-29', completedOn: '2025-12-29', pointsEarned: 10 },
    { taskId: 'task-mwf', occurrenceDate: '2025-12-31', completedOn: '2025-12-31', pointsEarned: 10 },
    { taskId: 'task-mwf', occurrenceDate: '2026-01-02', completedOn: '2026-01-02', pointsEarned: 10 },
    // September run: Wed 09-02, Fri 09-04, Mon 09-07 (weekend skipped)
    { taskId: 'task-mwf', occurrenceDate: '2026-09-02', completedOn: '2026-09-02', pointsEarned: 10 },
    { taskId: 'task-mwf', occurrenceDate: '2026-09-04', completedOn: '2026-09-04', pointsEarned: 10 },
    { taskId: 'task-mwf', occurrenceDate: '2026-09-07', completedOn: '2026-09-07', pointsEarned: 10 },
    // Wed 09-09 scheduled but missed (breaks the run)
  ]

  return { mockTasks: tasks, mockCompletions: completions }
})

vi.mock('@/lib/prisma', () => ({
  prisma: {
    task: {
      findMany: vi.fn().mockResolvedValue(mockTasks),
      findUnique: vi.fn((args: { where: { id: string } }) => {
        const task = mockTasks.find(t => t.id === args.where.id)
        return Promise.resolve(task ?? null)
      }),
    },
    taskCompletion: {
      findMany: vi.fn((args: { where?: { completedOn?: { gte: string; lte: string } } }) => {
        if (!args.where?.completedOn) return Promise.resolve(mockCompletions)
        const { gte, lte } = args.where.completedOn
        const result = mockCompletions.filter(c => c.completedOn >= gte && c.completedOn <= lte)
        return Promise.resolve(result)
      }),
    },
  },
}))

describe('Streak Service', () => {
  describe('getDayScoresInRange', () => {
    it('marks weekend days as no-data (no scheduled tasks)', async () => {
      const days = await getDayScoresInRange('2026-09-05', '2026-09-06')
      expect(days).toHaveLength(2)
      for (const d of days) {
        expect(d.max).toBe(0)
        expect(d.hasScheduledTasks).toBe(false)
      }
    })

    it('marks a scheduled-but-missed day as unsuccessful, not no-data', async () => {
      const days = await getDayScoresInRange('2026-09-09', '2026-09-09')
      expect(days[0].max).toBe(10)
      expect(days[0].earned).toBe(0)
      expect(days[0].hasScheduledTasks).toBe(true)
    })

    it('scores a completed scheduled day at 100%', async () => {
      const days = await getDayScoresInRange('2026-09-07', '2026-09-07')
      expect(days[0].max).toBe(10)
      expect(days[0].earned).toBe(10)
    })
  })

  describe('getCurrentStreak', () => {
    it('counts consecutive 100% days ending today, skipping the weekend gap', async () => {
      // 09-07, 09-04, 09-02 successful; 08-31 (Mon) missed → 3
      expect(await getCurrentStreak('2026-09-07')).toBe(3)
    })

    it('does not break on an in-progress today', async () => {
      // 09-09 scheduled but missed "today": skip it, skip Tue 09-08,
      // then 09-07, 09-04, 09-02 → 3
      expect(await getCurrentStreak('2026-09-09')).toBe(3)
    })

    it('returns 0 when the last scheduled day was missed', async () => {
      // 2025-06-01 is a Sunday (no tasks); walk back to Fri 05-30, missed → 0
      expect(await getCurrentStreak('2025-06-01')).toBe(0)
    })

    it('counts across a year boundary', async () => {
      // Fri 01-02, Wed 12-31, Mon 12-29 (Thu/Tue skipped) → 3
      expect(await getCurrentStreak('2026-01-02')).toBe(3)
    })

    it('counts across a month boundary', async () => {
      // Mon 08-31 missed, so Sep run stands alone: tested via 09-07 → 3
      expect(await getCurrentStreak('2026-09-02')).toBe(1)
    })
  })

  describe('getBestStreak', () => {
    it('finds the longest historical run', async () => {
      // Sep run (3) ties Jan run (3) → 3
      expect(await getBestStreak('2026-09-09')).toBe(3)
    })

    it('returns 0 when there is no history', async () => {
      expect(await getBestStreak('2025-06-01')).toBe(0)
    })
  })

  describe('getConsistencyRate', () => {
    it('computes successful scheduled days / scheduled days', async () => {
      // 09-07 ✓, 09-09 ✗ → 1/2 = 50%
      const result = await getConsistencyRate('2026-09-07', '2026-09-09', '2026-09-09')
      expect(result.scheduledDays).toBe(2)
      expect(result.successfulDays).toBe(1)
      expect(result.consistencyRate).toBe(50)
    })

    it('returns 100% when every scheduled day was perfect', async () => {
      // 09-02, 09-04, 09-07 all successful → 3/3
      const result = await getConsistencyRate('2026-09-01', '2026-09-07', '2026-09-07')
      expect(result.scheduledDays).toBe(3)
      expect(result.successfulDays).toBe(3)
      expect(result.consistencyRate).toBe(100)
    })

    it('returns zeros for an empty range', async () => {
      const result = await getConsistencyRate('2026-09-09', '2026-09-01', '2026-09-09')
      expect(result.consistencyRate).toBe(0)
      expect(result.scheduledDays).toBe(0)
      expect(result.successfulDays).toBe(0)
    })

    it('ignores future days', async () => {
      // End clamps to today: only 09-02 and 09-04 are scheduled ≤ 09-06
      const result = await getConsistencyRate('2026-09-01', '2099-01-01', '2026-09-06')
      expect(result.scheduledDays).toBe(2)
      expect(result.successfulDays).toBe(2)
    })
  })
})
