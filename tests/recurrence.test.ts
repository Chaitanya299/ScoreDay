import { describe, it, expect } from 'vitest'
import {
  isTaskDueOnDate,
  getOccurrenceKey,
  getTaskStatus,
  getOccurrencesForDateRange,
  getNextOccurrence,
  formatRecurrence,
  type RecurrenceTask,
} from '@/lib/recurrence'
import { getWeekStart, getWeekEnd } from '@/lib/dates'

// Fixed reference dates so tests are fully deterministic.
// 2026-08-24 is a Monday.
const D = (iso: string) => iso

describe('DAILY', () => {
  const task: RecurrenceTask = { recurrenceType: 'DAILY' }

  it('is due every day', () => {
    for (const day of ['2026-08-24', '2026-08-25', '2026-08-30', '2026-09-01']) {
      expect(isTaskDueOnDate(task, D(day))).toBe(true)
    }
  })

  it('formats as "Every day"', () => {
    expect(formatRecurrence(task)).toBe('Every day')
  })
})

describe('SPECIFIC_DAYS (Mon/Wed/Fri)', () => {
  const task: RecurrenceTask = { recurrenceType: 'SPECIFIC_DAYS', daysOfWeek: '1,3,5' }

  it('Monday -> due, Tuesday -> not due, Wednesday -> due, Thursday -> not due, Friday -> due', () => {
    expect(isTaskDueOnDate(task, D('2026-08-24'))).toBe(true) // Mon
    expect(isTaskDueOnDate(task, D('2026-08-25'))).toBe(false) // Tue
    expect(isTaskDueOnDate(task, D('2026-08-26'))).toBe(true) // Wed
    expect(isTaskDueOnDate(task, D('2026-08-27'))).toBe(false) // Thu
    expect(isTaskDueOnDate(task, D('2026-08-28'))).toBe(true) // Fri
    expect(isTaskDueOnDate(task, D('2026-08-29'))).toBe(false) // Sat
    expect(isTaskDueOnDate(task, D('2026-08-30'))).toBe(false) // Sun
  })

  it('allows any combination of selected days (Sun + Sat)', () => {
    const weekend: RecurrenceTask = { recurrenceType: 'SPECIFIC_DAYS', daysOfWeek: '0,6' }
    expect(isTaskDueOnDate(weekend, D('2026-08-29'))).toBe(true)
    expect(isTaskDueOnDate(weekend, D('2026-08-30'))).toBe(true)
    expect(isTaskDueOnDate(weekend, D('2026-08-28'))).toBe(false)
  })

  it('formats selected days', () => {
    expect(formatRecurrence(task)).toBe('Mon, Wed, Fri')
  })
})

describe('WEEKLY (Any day this week)', () => {
  const task: RecurrenceTask = { recurrenceType: 'WEEKLY' }

  it('is available Monday, Wednesday and Sunday of the week', () => {
    expect(isTaskDueOnDate(task, D('2026-08-24'))).toBe(true) // Mon
    expect(isTaskDueOnDate(task, D('2026-08-26'))).toBe(true) // Wed
    expect(isTaskDueOnDate(task, D('2026-08-30'))).toBe(true) // Sun
  })

  it('has exactly ONE occurrence per calendar week', () => {
    const occ = getOccurrencesForDateRange(task, '2026-08-24', '2026-08-30')
    expect(occ).toHaveLength(1)
    expect(occ[0]).toBe('2026-08-24') // keyed by the week's Monday
  })

  it('completion on Wednesday satisfies the rest of the week via the occurrence key', () => {
    const wednesdayKey = getOccurrenceKey(task, '2026-08-26')
    expect(wednesdayKey).toBe('2026-08-24') // same key as any other day that week

    const ctxThu = {
      todayIso: '2026-08-27',
      completedKeys: new Set([wednesdayKey]),
    }
    expect(getTaskStatus(task, D('2026-08-27'), ctxThu)).toBe('COMPLETED')

    // Without completion, mid-week it's still DUE...
    expect(getTaskStatus(task, D('2026-08-26'), { todayIso: '2026-08-26' })).toBe('DUE')
    // ...and after the week ends without completion it becomes MISSED.
    const nextWeekCtx = { todayIso: '2026-08-31' }
    expect(getTaskStatus(task, D('2026-08-26'), nextWeekCtx)).toBe('MISSED')
  })

  it('week boundaries are Monday-Sunday', () => {
    expect(getWeekStart('2026-08-26')).toBe('2026-08-24') // Wed -> Mon
    expect(getWeekEnd('2026-08-26')).toBe('2026-08-30') // Wed -> Sun
    expect(getWeekStart('2026-08-30')).toBe('2026-08-24') // Sun belongs to its week
    expect(getWeekStart('2026-08-31')).toBe('2026-08-31') // next Monday
  })

  it('formats as "Any day this week"', () => {
    expect(formatRecurrence(task)).toBe('Any day this week')
  })
})

describe('ONE_TIME', () => {
  const task: RecurrenceTask = { recurrenceType: 'ONE_TIME', dueDate: '2026-08-29' }

  it('due only on the due date; before -> upcoming; after -> not due', () => {
    expect(isTaskDueOnDate(task, D('2026-08-28'))).toBe(false)
    expect(isTaskDueOnDate(task, D('2026-08-29'))).toBe(true)
    expect(isTaskDueOnDate(task, D('2026-08-30'))).toBe(false)
  })

  it('status: UPCOMING before, DUE on date, OVERDUE after without completion, COMPLETED after completion', () => {
    expect(getTaskStatus(task, D('2026-08-27'), { todayIso: '2026-08-27' })).toBe('UPCOMING')
    expect(getTaskStatus(task, D('2026-08-29'), { todayIso: '2026-08-29' })).toBe('DUE')
    expect(getTaskStatus(task, D('2026-08-30'), { todayIso: '2026-08-30' })).toBe('OVERDUE')

    const done = new Set(['2026-08-29'])
    expect(getTaskStatus(task, D('2026-08-29'), { todayIso: '2026-08-29', completedKeys: done })).toBe(
      'COMPLETED'
    )
    expect(getTaskStatus(task, D('2026-08-30'), { todayIso: '2026-08-30', completedKeys: done })).toBe(
      'COMPLETED'
    )
  })

  it('never becomes recurring', () => {
    expect(isTaskDueOnDate(task, D('2027-08-29'))).toBe(false)
  })

  it('formats as "Due Aug 29"', () => {
    expect(formatRecurrence(task)).toBe('Due Aug 29')
  })
})

describe('getTaskStatus for scheduled types', () => {
  const daily: RecurrenceTask = { recurrenceType: 'DAILY' }

  it('past uncompleted -> MISSED, today -> DUE, future -> UPCOMING', () => {
    expect(getTaskStatus(daily, D('2026-08-23'), { todayIso: '2026-08-24' })).toBe('MISSED')
    expect(getTaskStatus(daily, D('2026-08-24'), { todayIso: '2026-08-24' })).toBe('DUE')
    expect(getTaskStatus(daily, D('2026-08-25'), { todayIso: '2026-08-24' })).toBe('UPCOMING')
  })

  it('completed occurrence -> COMPLETED regardless of viewing date', () => {
    const done = new Set(['2026-08-23'])
    expect(getTaskStatus(daily, D('2026-08-23'), { todayIso: '2026-08-24', completedKeys: done })).toBe(
      'COMPLETED'
    )
    // A different day remains DUE — completion satisfies one occurrence only.
    expect(getTaskStatus(daily, D('2026-08-24'), { todayIso: '2026-08-24', completedKeys: done })).toBe(
      'DUE'
    )
  })

  it('getNextOccurrence for SPECIFIC_DAYS skips non-selected days', () => {
    const task: RecurrenceTask = { recurrenceType: 'SPECIFIC_DAYS', daysOfWeek: '1,3,5' }
    expect(getNextOccurrence(task, '2026-08-24')).toBe('2026-08-26') // Mon -> Wed
    expect(getNextOccurrence(task, '2026-08-25')).toBe('2026-08-26') // Tue -> Wed
  })
})
