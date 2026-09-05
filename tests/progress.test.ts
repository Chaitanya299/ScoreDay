import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getMonthRange,
  getWeekRange,
  getCurrentMonthIso,
  getPreviousMonth,
  getNextMonth,
  getPreviousWeek,
  getNextWeek,
  getDailyProgress,
  getWeeklyProgress,
  getMonthlyProgress,
  getScoreHistory,
  getCalendarHeatmap,
  getTaskPerformance,
  getAllTaskPerformance,
  getCategoryPerformance,
  getPointsBreakdown,
  getMissedOccurrences,
  getProgressSummary,
  getTrendComparison,
  getDayDetail,
} from '@/lib/progress'
import { getLocalDateString, getWeekStart, getWeekEnd, addDays, eachDay, getDaysOfWeek } from '@/lib/dates'
import { isTaskDueOnDate, getOccurrenceKey, getOccurrencesForDateRange, type RecurrenceTask } from '@/lib/recurrence'

// Mock Prisma - use vi.hoisted to avoid hoisting issues
const { mockTasks, mockCompletions } = vi.hoisted(() => {
  const tasks: Array<RecurrenceTask & { id: string; title: string; category: string | null; points: number }> = [
    {
      id: 'task-water',
      title: 'Water',
      category: 'Health',
      points: 8,
      recurrenceType: 'DAILY',
      interval: 1,
      startDate: '2026-08-24',
    },
    {
      id: 'task-workout',
      title: 'Workout',
      category: 'Fitness',
      points: 10,
      recurrenceType: 'WEEKLY',
      interval: 1,
      selectedWeekdays: '1,3,5',
      startDate: '2026-08-24',
    },
    {
      id: 'task-work',
      title: 'Work',
      category: 'Work',
      points: 10,
      recurrenceType: 'WEEKLY',
      interval: 1,
      selectedWeekdays: '1,2,3,4,5',
      startDate: '2026-08-24',
    },
    {
      id: 'task-read',
      title: 'Read',
      category: 'Learning',
      points: 5,
      recurrenceType: 'WEEKLY_GOAL',
      interval: 1,
      startDate: '2026-08-24',
    },
    {
      id: 'task-deepclean',
      title: 'Deep Clean',
      category: 'Home',
      points: 7,
      recurrenceType: 'NONE',
      dueDate: '2026-08-29',
    },
  ]

  const completions = [
    // Monday 2026-08-24
    { taskId: 'task-water', occurrenceDate: '2026-08-24', completedOn: '2026-08-24', pointsEarned: 8 },
    { taskId: 'task-workout', occurrenceDate: '2026-08-24', completedOn: '2026-08-24', pointsEarned: 10 },
    { taskId: 'task-work', occurrenceDate: '2026-08-24', completedOn: '2026-08-24', pointsEarned: 10 },
    { taskId: 'task-read', occurrenceDate: '2026-08-24', completedOn: '2026-08-24', pointsEarned: 5 },
    // Tuesday 2026-08-25 (WEEKLY tasks use week start as occurrenceDate)
    { taskId: 'task-water', occurrenceDate: '2026-08-25', completedOn: '2026-08-25', pointsEarned: 8 },
    { taskId: 'task-work', occurrenceDate: '2026-08-24', completedOn: '2026-08-25', pointsEarned: 10 },
    // Wednesday 2026-08-26
    { taskId: 'task-water', occurrenceDate: '2026-08-26', completedOn: '2026-08-26', pointsEarned: 8 },
    { taskId: 'task-workout', occurrenceDate: '2026-08-24', completedOn: '2026-08-26', pointsEarned: 10 },
    { taskId: 'task-work', occurrenceDate: '2026-08-24', completedOn: '2026-08-26', pointsEarned: 10 },
    // Thursday 2026-08-27
    { taskId: 'task-water', occurrenceDate: '2026-08-27', completedOn: '2026-08-27', pointsEarned: 8 },
    { taskId: 'task-work', occurrenceDate: '2026-08-24', completedOn: '2026-08-27', pointsEarned: 10 },
    // Friday 2026-08-28
    { taskId: 'task-water', occurrenceDate: '2026-08-28', completedOn: '2026-08-28', pointsEarned: 8 },
    { taskId: 'task-workout', occurrenceDate: '2026-08-24', completedOn: '2026-08-28', pointsEarned: 10 },
    { taskId: 'task-work', occurrenceDate: '2026-08-24', completedOn: '2026-08-28', pointsEarned: 10 },
    // Saturday 2026-08-29
    { taskId: 'task-water', occurrenceDate: '2026-08-29', completedOn: '2026-08-29', pointsEarned: 8 },
    { taskId: 'task-deepclean', occurrenceDate: '2026-08-29', completedOn: '2026-08-29', pointsEarned: 7 },
    // Sunday 2026-08-30
    { taskId: 'task-water', occurrenceDate: '2026-08-30', completedOn: '2026-08-30', pointsEarned: 8 },
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
      findMany: vi.fn((args: { where?: { completedOn?: string | { gte: string; lte: string }; taskId?: string; occurrenceDate?: string | string[] } }) => {
        if (!args.where) return Promise.resolve(mockCompletions)
        const { completedOn, taskId, occurrenceDate } = args.where
        let result = mockCompletions
        if (completedOn) {
          if (typeof completedOn === 'object' && completedOn.gte && completedOn.lte) {
            result = result.filter(c => c.completedOn >= completedOn.gte && c.completedOn <= completedOn.lte)
          } else if (typeof completedOn === 'string') {
            result = result.filter(c => c.completedOn === completedOn)
          }
        }
        if (taskId) {
          result = result.filter(c => c.taskId === taskId)
        }
        if (occurrenceDate) {
          if (Array.isArray(occurrenceDate)) {
            result = result.filter(c => occurrenceDate.includes(c.occurrenceDate))
          }
        }
        return Promise.resolve(result)
      }),
    },
  },
}))

describe('Progress Service - Date Range Helpers', () => {
  describe('getMonthRange', () => {
    it('returns correct range for September 2026', () => {
      const range = getMonthRange('2026-09')
      expect(range.start).toBe('2026-09-01')
      expect(range.end).toBe('2026-09-30')
    })

    it('handles February in leap year', () => {
      const range = getMonthRange('2024-02')
      expect(range.start).toBe('2024-02-01')
      expect(range.end).toBe('2024-02-29')
    })

    it('handles February in non-leap year', () => {
      const range = getMonthRange('2026-02')
      expect(range.start).toBe('2026-02-01')
      expect(range.end).toBe('2026-02-28')
    })
  })

  describe('getWeekRange', () => {
    it('returns Monday-Sunday range', () => {
      const range = getWeekRange('2026-08-24')
      expect(range.start).toBe('2026-08-24')
      expect(range.end).toBe('2026-08-30')
    })

    it('normalizes any day to its week start', () => {
      const range = getWeekRange('2026-08-26')
      expect(range.start).toBe('2026-08-24')
      expect(range.end).toBe('2026-08-30')
    })
  })

  describe('getPreviousMonth / getNextMonth', () => {
    it('navigates months correctly', () => {
      expect(getPreviousMonth('2026-09')).toBe('2026-08')
      expect(getNextMonth('2026-09')).toBe('2026-10')
      expect(getPreviousMonth('2026-01')).toBe('2025-12')
      expect(getNextMonth('2026-12')).toBe('2027-01')
    })
  })

  describe('getPreviousWeek / getNextWeek', () => {
    it('navigates weeks correctly', () => {
      expect(getPreviousWeek('2026-08-24')).toBe('2026-08-17')
      expect(getNextWeek('2026-08-24')).toBe('2026-08-31')
    })
  })
})

describe('Progress Service - Core Calculations', () => {
  describe('getDailyProgress', () => {
    it('calculates Monday correctly (Water + Workout + Work + Read = 33/33 = 100%)', async () => {
      const result = await getDailyProgress('2026-08-24')
      expect(result.earned).toBe(33)
      expect(result.max).toBe(33)
      expect(result.percentage).toBe(100)
      expect(result.hasScheduledTasks).toBe(true)
    })

    it('calculates Tuesday correctly (Water + Work = 18/18 = 100%)', async () => {
      const result = await getDailyProgress('2026-08-25')
      expect(result.earned).toBe(18)
      expect(result.max).toBe(18)
      expect(result.percentage).toBe(100)
    })

    it('calculates Saturday correctly (Water + Deep Clean = 15/15 = 100%)', async () => {
      const result = await getDailyProgress('2026-08-29')
      expect(result.earned).toBe(15)
      expect(result.max).toBe(15)
      expect(result.percentage).toBe(100)
    })

    it('returns 0% for days with no scheduled tasks', async () => {
      const result = await getDailyProgress('2026-08-20')
      expect(result.hasScheduledTasks).toBe(false)
      expect(result.percentage).toBe(0)
    })
  })

  describe('getWeeklyProgress', () => {
    it('calculates weekly progress for week of 2026-08-24', async () => {
      const result = await getWeeklyProgress('2026-08-24')
      
      expect(result.weekStart).toBe('2026-08-24')
      expect(result.weekEnd).toBe('2026-08-30')
      expect(result.max).toBe(148)
      expect(result.earned).toBe(148)
      expect(result.percentage).toBe(100)
      expect(result.dailyBreakdown).toHaveLength(7)
    })

    it('daily breakdown matches individual daily progress', async () => {
      const weekly = await getWeeklyProgress('2026-08-24')
      for (const day of weekly.dailyBreakdown) {
        const daily = await getDailyProgress(day.date)
        expect(day.earned).toBe(daily.earned)
        expect(day.max).toBe(daily.max)
        expect(day.percentage).toBe(daily.percentage)
      }
    })
  })

  describe('getMonthlyProgress', () => {
    it('calculates monthly progress for August 2026', async () => {
      const result = await getMonthlyProgress('2026-08')
      
      expect(result.month).toBe('2026-08')
      expect(result.dailyScores).toHaveLength(31)
      expect(result.totalPoints).toBeGreaterThan(0)
      expect(result.averageScore).toBeGreaterThanOrEqual(0)
      expect(result.averageScore).toBeLessThanOrEqual(100)
      expect(result.completionRate).toBeGreaterThanOrEqual(0)
      expect(result.completionRate).toBeLessThanOrEqual(100)
    })

    it('best day is correctly identified', async () => {
      const result = await getMonthlyProgress('2026-08')
      if (result.bestDay) {
        expect(result.bestDay.percentage).toBeGreaterThanOrEqual(0)
        expect(result.bestDay.percentage).toBeLessThanOrEqual(100)
      }
    })

    it('excludes days with no scheduled tasks from average', async () => {
      const result = await getMonthlyProgress('2026-08')
      const earlyDays = result.dailyScores.filter(d => d.date < '2026-08-24')
      for (const day of earlyDays) {
        expect(day.hasScheduledTasks).toBe(false)
        expect(day.percentage).toBe(0)
      }
    })
  })

  describe('getScoreHistory', () => {
    it('returns daily scores for the month', async () => {
      const scores = await getScoreHistory('2026-08')
      expect(scores.length).toBe(31)
      for (const s of scores) {
        expect(s.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(typeof s.earned).toBe('number')
        expect(typeof s.max).toBe('number')
        expect(typeof s.percentage).toBe('number')
        expect(typeof s.hasScheduledTasks).toBe('boolean')
      }
    })
  })

  describe('getCalendarHeatmap', () => {
    it('returns 42 days (6 weeks)', async () => {
      const calendar = await getCalendarHeatmap('2026-08')
      expect(calendar.length).toBe(42)
    })

    it('marks current month days correctly', async () => {
      const calendar = await getCalendarHeatmap('2026-08')
      const currentMonthDays = calendar.filter(d => d.isCurrentMonth)
      expect(currentMonthDays.length).toBe(31)
    })

    it('includes percentage for days with scheduled tasks', async () => {
      const calendar = await getCalendarHeatmap('2026-08')
      const aug24 = calendar.find(d => d.date === '2026-08-24')
      expect(aug24?.hasScheduledTasks).toBe(true)
      expect(aug24?.percentage).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getTaskPerformance', () => {
    it('calculates Water performance for August 2026', async () => {
      const result = await getTaskPerformance('task-water', { start: '2026-08-24', end: '2026-08-30' })
      expect(result?.taskId).toBe('task-water')
      expect(result?.title).toBe('Water')
      expect(result?.scheduledOccurrences).toBe(7)
      expect(result?.completedOccurrences).toBe(7)
      expect(result?.completionRate).toBe(100)
      expect(result?.pointsEarned).toBe(56)
    })

    it('calculates Workout performance (Mon/Wed/Fri)', async () => {
      const result = await getTaskPerformance('task-workout', { start: '2026-08-24', end: '2026-08-30' })
      expect(result?.scheduledOccurrences).toBe(3)
      expect(result?.completedOccurrences).toBe(3)
      expect(result?.completionRate).toBe(100)
    })

    it('calculates Work performance (Mon-Fri)', async () => {
      const result = await getTaskPerformance('task-work', { start: '2026-08-24', end: '2026-08-30' })
      expect(result?.scheduledOccurrences).toBe(5)
      expect(result?.completedOccurrences).toBe(5)
      expect(result?.completionRate).toBe(100)
    })

    it('calculates Read (WEEKLY_GOAL) as 1 occurrence per week', async () => {
      const result = await getTaskPerformance('task-read', { start: '2026-08-24', end: '2026-08-30' })
      expect(result?.scheduledOccurrences).toBe(1)
      expect(result?.completedOccurrences).toBe(1)
      expect(result?.completionRate).toBe(100)
    })

    it('calculates Deep Clean (ONE_TIME) only on due date', async () => {
      const result = await getTaskPerformance('task-deepclean', { start: '2026-08-24', end: '2026-08-30' })
      expect(result?.scheduledOccurrences).toBe(1)
      expect(result?.completedOccurrences).toBe(1)
      expect(result?.completionRate).toBe(100)
    })

    it('returns null for non-existent task', async () => {
      const result = await getTaskPerformance('non-existent', { start: '2026-08-24', end: '2026-08-30' })
      expect(result).toBeNull()
    })
  })

  describe('getAllTaskPerformance', () => {
    it('returns all tasks with scheduled occurrences', async () => {
      const results = await getAllTaskPerformance({ start: '2026-08-24', end: '2026-08-30' })
      expect(results.length).toBe(5)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].completionRate).toBeGreaterThanOrEqual(results[i].completionRate)
      }
    })

    it('excludes tasks with 0 scheduled occurrences', async () => {
      const results = await getAllTaskPerformance({ start: '2026-08-01', end: '2026-08-23' })
      expect(results.length).toBe(0)
    })
  })

  describe('getCategoryPerformance', () => {
    it('aggregates by category', async () => {
      const results = await getCategoryPerformance({ start: '2026-08-24', end: '2026-08-30' })
      
      const health = results.find(c => c.category === 'Health')
      expect(health?.scheduledOccurrences).toBe(7)
      expect(health?.completedOccurrences).toBe(7)
      expect(health?.completionRate).toBe(100)

      const fitness = results.find(c => c.category === 'Fitness')
      expect(fitness?.scheduledOccurrences).toBe(3)
    })

    it('excludes categories with 0 scheduled occurrences', async () => {
      const results = await getCategoryPerformance({ start: '2026-08-01', end: '2026-08-23' })
      expect(results.length).toBe(0)
    })
  })

  describe('getPointsBreakdown', () => {
    it('returns points by category sorted descending', async () => {
      const results = await getPointsBreakdown({ start: '2026-08-24', end: '2026-08-30' })
      expect(results.length).toBeGreaterThan(0)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].points).toBeGreaterThanOrEqual(results[i].points)
      }
    })
  })

  describe('getMissedOccurrences', () => {
    it('returns empty when all tasks completed', async () => {
      const missed = await getMissedOccurrences({ start: '2026-08-24', end: '2026-08-30' })
      expect(missed.length).toBe(0)
    })

    it('does not mark WEEKLY_GOAL as missed before week ends', async () => {
      const missed = await getMissedOccurrences({ start: '2026-08-24', end: '2026-08-26' })
      const weeklyGoalMissed = missed.find(m => m.taskId === 'task-read')
      expect(weeklyGoalMissed).toBeUndefined()
    })
  })

  describe('getProgressSummary', () => {
    it('calculates summary for a week', async () => {
      const summary = await getProgressSummary({ start: '2026-08-24', end: '2026-08-30' })
      expect(summary.averageScore).toBe(100)
      expect(summary.totalPoints).toBe(148)
      expect(summary.completionRate).toBe(100)
      expect(summary.bestDay).not.toBeNull()
    })
  })

  describe('getTrendComparison', () => {
    it('returns null previous when no historical data', async () => {
      const trend = await getTrendComparison({ start: '2020-01-01', end: '2020-01-31' })
      expect(trend.previous).toBeNull()
      expect(trend.averageScoreChange).toBeNull()
    })
  })

  describe('getDayDetail', () => {
    it('returns detailed breakdown for a day', async () => {
      const detail = await getDayDetail('2026-08-24')
      expect(detail.date).toBe('2026-08-24')
      expect(detail.percentage).toBe(100)
      expect(detail.earned).toBe(33)
      expect(detail.max).toBe(33)
      expect(detail.completedTasks.length).toBe(4)
      expect(detail.missedTasks.length).toBe(0)
    })

    it('includes missed tasks array', async () => {
      const detail = await getDayDetail('2026-08-24')
      expect(Array.isArray(detail.completedTasks)).toBe(true)
      expect(Array.isArray(detail.missedTasks)).toBe(true)
    })
  })
})

describe('Progress Service - Edge Cases', () => {
  it('handles leap year February correctly', async () => {
    const range = getMonthRange('2024-02')
    expect(range.end).toBe('2024-02-29')
    const days = eachDay(range.start, range.end)
    expect(days.length).toBe(29)
  })

  it('handles year boundary in month navigation', () => {
    expect(getPreviousMonth('2026-01')).toBe('2025-12')
    expect(getNextMonth('2025-12')).toBe('2026-01')
  })

  it('handles week boundary correctly', () => {
    const range = getWeekRange('2025-12-29')
    expect(range.start).toBe('2025-12-29')
    expect(range.end).toBe('2026-01-04')
  })
})