// ScoreDay Recurrence Engine — expanded to support custom intervals and weekly goals
// 
// NONE         → one-time task on dueDate
// DAILY        → every calendar day (interval days)
// WEEKLY       → specific weekdays (interval weeks)
// WEEKLY_GOAL  → once per Mon-Sun week, any day (interval weeks)
// CUSTOM       → flexible recurrence with interval/unit + constraints
//
// Deterministic, pure, client-safe. All date math via lib/dates.

import {
  parseLocalDate,
  getLocalDateString,
  getWeekStart,
  eachDay,
} from './dates'

export const RECURRENCE_TYPES = [
  'NONE',
  'DAILY',
  'WEEKLY',
  'WEEKLY_GOAL',
  'CUSTOM',
] as const

export type RecurrenceType = (typeof RECURRENCE_TYPES)[number]

export interface RecurrenceTask {
  recurrenceType: string
  interval: number // default: 1
  unit?: string // DAY | WEEK | MONTH
  selectedWeekdays?: string // "0,1,2,3,4,5,6" — 0=Sun..6=Sat
  dayOfMonth?: number // 1-31
  dueDate?: string | null // YYYY-MM-DD (for NONE type)
  startDate?: string // YYYY-MM-DD (when recurrence begins)
  endDate?: string // YYYY-MM-DD (optional end date)
}

export type TaskStatus =
  | 'NOT_DUE'
  | 'DUE'
  | 'COMPLETED'
  | 'MISSED'
  | 'UPCOMING'
  | 'OVERDUE'
  | 'SATISFIED' // for WEEKLY_GOAL when completed

export interface StatusContext {
  todayIso: string
  completedKeys?: ReadonlySet<string>
}

// ---------------------------------------------------------------------------
// Weekday helpers
// ---------------------------------------------------------------------------

export function parseDaysOfWeek(daysOfWeek: string | null | undefined): number[] {
  if (!daysOfWeek) return [0, 1, 2, 3, 4, 5, 6]
  const parsed = daysOfWeek
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
  return parsed.length > 0 ? Array.from(new Set(parsed)).sort() : [0, 1, 2, 3, 4, 5, 6]
}

export function serializeDaysOfWeek(days: number[]): string {
  const valid = Array.from(
    new Set(days.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))
  ).sort()
  return valid.length > 0 ? valid.join(',') : '0,1,2,3,4,5,6'
}

export function parseDaysInput(input: unknown): number[] | null {
  if (input === undefined || input === null) return null
  const parts = Array.isArray(input)
    ? input.map((v) => String(v).trim())
    : String(input)
        .split(',')
        .map((s) => s.trim())
  const days = parts.filter((p) => p !== '').map(Number)
  if (days.length === 0 || days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    return null
  }
  return Array.from(new Set(days)).sort()
}

// ---------------------------------------------------------------------------
// Date-string validation
// ---------------------------------------------------------------------------

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return !Number.isNaN(parseLocalDate(value).getTime())
}

export function isPastDateString(iso: string, referenceIso?: string): boolean {
  if (!isValidDateString(iso)) return false
  const ref = referenceIso ?? getLocalDateString()
  return iso < ref
}

// ---------------------------------------------------------------------------
// Core engine
// ---------------------------------------------------------------------------

export function isTaskDueOnDate(task: RecurrenceTask, dateIso: string): boolean {
  // Check if date is within start/end bounds
  if (task.startDate && dateIso < task.startDate) return false
  if (task.endDate && dateIso > task.endDate) return false

  switch (task.recurrenceType) {
    case 'NONE':
      return !!task.dueDate && task.dueDate === dateIso
    case 'DAILY':
      // Every interval days starting from startDate
      if (!task.startDate) return false
      const daysDiff = daysBetween(task.startDate, dateIso)
      return daysDiff >= 0 && daysDiff % task.interval === 0
    case 'WEEKLY':
      // Every interval weeks on selected weekdays
      if (!task.startDate) return false
      const weeksDiff = weeksBetween(task.startDate, dateIso)
      if (weeksDiff < 0 || weeksDiff % task.interval !== 0) return false
      const weekday = parseLocalDate(dateIso).getDay()
      return parseDaysOfWeek(task.selectedWeekdays).includes(weekday)
    case 'WEEKLY_GOAL':
      // Once per interval weeks, any day
      if (!task.startDate) return false
      const weeksDiff = weeksBetween(task.startDate, dateIso)
      return weeksDiff >= 0 && weeksDiff % task.interval === 0
    case 'CUSTOM':
      if (!task.startDate) return false
      switch (task.unit) {
        case 'DAY':
          const daysDiff = daysBetween(task.startDate, dateIso)
          return daysDiff >= 0 && daysDiff % task.interval === 0
        case 'WEEK': {
          const weeksDiff = weeksBetween(task.startDate, dateIso)
          if (weeksDiff < 0 || weeksDiff % task.interval !== 0) return false
          const weekday = parseLocalDate(dateIso).getDay()
          return parseDaysOfWeek(task.selectedWeekdays).includes(weekday)
        }
        case 'MONTH': {
          // Check if it's the right day of month in the right interval
          if (!task.dayOfMonth) return false
          const monthsDiff = monthsBetween(task.startDate, dateIso)
          if (monthsDiff < 0 || monthsDiff % task.interval !== 0) return false
          
          // Check if this month has the dayOfMonth
          const date = parseLocalDate(dateIso)
          const year = date.getFullYear()
          const month = date.getMonth()
          const lastDay = new Date(year, month + 1, 0).getDate()
          const dayToCheck = Math.min(task.dayOfMonth, lastDay)
          
          return date.getDate() === dayToCheck
        }
        default:
          return false
      }
    default:
      return false
  }
}

export function getOccurrenceKey(task: RecurrenceTask, completionDateIso: string): string {
  if (task.recurrenceType === 'WEEKLY' || task.recurrenceType === 'WEEKLY_GOAL') {
    return getWeekStart(completionDateIso)
  }
  return completionDateIso
}

export function getTaskOccurrenceForDate(
  task: RecurrenceTask & { id?: string },
  dateIso: string
): string | null {
  if (!isTaskDueOnDate(task, dateIso)) return null
  return getOccurrenceKey(task, dateIso)
}

export function getOccurrencesForDateRange(
  task: RecurrenceTask,
  rangeStartIso: string,
  rangeEndIso: string
): string[] {
  if (rangeEndIso < rangeStartIso) return []
  
  // Adjust range to be within task bounds
  let start = rangeStartIso
  let end = rangeEndIso
  
  if (task.startDate && start < task.startDate) start = task.startDate
  if (task.endDate && end > task.endDate) end = task.endDate
  
  if (start > end) return []

  switch (task.recurrenceType) {
    case 'NONE':
      return isTaskDueOnDate(task, start) ? [start] : []
    case 'DAILY': {
      const out: string[] = []
      let cursor = start
      while (cursor <= end) {
        if (isTaskDueOnDate(task, cursor)) out.push(cursor)
        cursor = addDays(cursor, 1)
      }
      return out
    }
    case 'WEEKLY': {
      const out: string[] = []
      let cursor = start
      while (cursor <= end) {
        if (isTaskDueOnDate(task, cursor)) {
          const ws = getWeekStart(cursor)
          if (!out.includes(ws)) out.push(ws)
        }
        cursor = addDays(cursor, 1)
      }
      return out
    }
    case 'WEEKLY_GOAL': {
      const out: string[] = []
      let cursor = start
      while (cursor <= end) {
        if (isTaskDueOnDate(task, cursor)) {
          const ws = getWeekStart(cursor)
          if (!out.includes(ws)) out.push(ws)
        }
        cursor = addDays(cursor, 1)
      }
      return out
    }
    case 'CUSTOM': {
      const out: string[] = []
      let cursor = start
      while (cursor <= end) {
        if (isTaskDueOnDate(task, cursor)) out.push(cursor)
        
        // Increment based on unit
        switch (task.unit) {
          case 'DAY':
            cursor = addDays(cursor, task.interval)
            break
          case 'WEEK':
            cursor = addWeeks(cursor, task.interval)
            break
          case 'MONTH':
            cursor = addMonths(cursor, task.interval)
            break
          default:
            cursor = addDays(cursor, 1) // fallback
        }
      }
      return out
    }
    default:
      return []
  }
}

function addDays(iso: string, n: number): string {
  const d = parseLocalDate(iso)
  d.setDate(d.getDate() + n)
  return getLocalDateString(d)
}

function addWeeks(iso: string, n: number): string {
  const d = parseLocalDate(iso)
  d.setDate(d.getDate() + n * 7)
  return getLocalDateString(d)
}

function addMonths(iso: string, n: number): string {
  const d = parseLocalDate(iso)
  d.setMonth(d.getMonth() + n)
  return getLocalDateString(d)
}

function daysBetween(aIso: string, bIso: string): number {
  const a = parseLocalDate(aIso)
  const b = parseLocalDate(bIso)
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

function weeksBetween(aIso: string, bIso: string): number {
  return Math.round(daysBetween(getWeekStart(aIso), getWeekStart(bIso)) / 7)
}

function monthsBetween(aIso: string, bIso: string): number {
  const a = parseLocalDate(aIso)
  const b = parseLocalDate(bIso)
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
}

export function getNextOccurrence(task: RecurrenceTask, afterIso: string): string | null {
  const horizon = addDays(afterIso, 366 * 5) // Look 5 years ahead
  let cursor = addDays(afterIso, 1)
  while (cursor <= horizon) {
    if (isTaskDueOnDate(task, cursor)) return cursor
    cursor = addDays(cursor, 1)
  }
  return null
}

export function getPreviousOccurrence(task: RecurrenceTask, beforeIso: string): string | null {
  let cursor = beforeIso
  let guard = 0
  while (cursor >= '0000-01-01' && guard < 366 * 5) {
    if (isTaskDueOnDate(task, cursor)) return cursor
    cursor = addDays(cursor, -1)
    guard++
  }
  return null
}

// ---------------------------------------------------------------------------
// Status engine
// ---------------------------------------------------------------------------

export function getTaskStatus(
  task: RecurrenceTask,
  dateIso: string,
  ctx: StatusContext
): TaskStatus {
  const { todayIso, completedKeys } = ctx
  const completed = (key: string) => completedKeys?.has(key) ?? false

  if (task.recurrenceType === 'NONE') {
    const key = task.dueDate ?? ''
    if (completed(key)) return 'COMPLETED'
    if (!task.dueDate) return 'NOT_DUE'
    if (dateIso === task.dueDate) return 'DUE'
    if (dateIso < task.dueDate) return 'UPCOMING'
    return 'OVERDUE'
  }

  if (!isTaskDueOnDate(task, dateIso)) return 'NOT_DUE'

  const key = getOccurrenceKey(task, dateIso)
  if (completed(key)) return 'COMPLETED'

  if (task.recurrenceType === 'WEEKLY_GOAL') {
    const weekOfToday = getWeekStart(todayIso)
    const weekOfDate = getWeekStart(dateIso)
    if (weekOfDate > weekOfToday) return 'UPCOMING'
    if (weekOfDate === weekOfToday) return 'SATISFIED' // Special status for weekly goal
    return 'MISSED'
  }

  if (task.recurrenceType === 'WEEKLY') {
    const weekOfToday = getWeekStart(todayIso)
    const weekOfDate = getWeekStart(dateIso)
    if (weekOfDate > weekOfToday) return 'UPCOMING'
    if (weekOfDate === weekOfToday) return 'DUE'
    return 'MISSED'
  }

  if (dateIso < todayIso) return 'MISSED'
  if (dateIso === todayIso) return 'DUE'
  return 'UPCOMING'
}

// ---------------------------------------------------------------------------
// Formatting — raw enum names must never reach the UI.
// ---------------------------------------------------------------------------

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export function formatDueDate(iso: string): string {
  const d = parseLocalDate(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`
}

function formatDaysLabel(daysOfWeek: string | null | undefined): string {
  const days = parseDaysOfWeek(daysOfWeek)
  if (days.length === 7) return 'Every day'
  return days.map((d) => WEEKDAY_SHORT[d]).join(', ')
}

export function formatRecurrence(task: RecurrenceTask): string {
  switch (task.recurrenceType) {
    case 'NONE':
      return task.dueDate ? `Due ${formatDueDate(task.dueDate)}` : 'One time'
    case 'DAILY':
      return task.interval === 1 ? 'Every day' : `Every ${task.interval} days`
    case 'WEEKLY':
      if (task.interval === 1) {
        return `Every week on ${formatDaysLabel(task.selectedWeekdays)}`
      } else {
        return `Every ${task.interval} weeks on ${formatDaysLabel(task.selectedWeekdays)}`
      }
    case 'WEEKLY_GOAL':
      return 'Any day this week'
    case 'CUSTOM':
      switch (task.unit) {
        case 'DAY':
          return task.interval === 1 ? 'Every day' : `Every ${task.interval} days`
        case 'WEEK':
          if (task.interval === 1) {
            return `Every week on ${formatDaysLabel(task.selectedWeekdays)}`
          } else {
            return `Every ${task.interval} weeks on ${formatDaysLabel(task.selectedWeekdays)}`
          }
        case 'MONTH':
          if (task.interval === 1) {
            return `Every month on the ${task.dayOfMonth}${getOrdinalSuffix(task.dayOfMonth)}`
          } else {
            return `Every ${task.interval} months on the ${task.dayOfMonth}${getOrdinalSuffix(task.dayOfMonth)}`
          }
        default:
          return 'Custom'
      }
    default:
      return 'Custom'
  }
}

// Helper for ordinal suffix
function getOrdinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return 'th'
  switch (n % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

// Legacy alias: keep formatFrequency name usable; callers should migrate to formatRecurrence.
export const formatFrequency = formatRecurrence
export const formatSchedule = formatRecurrence