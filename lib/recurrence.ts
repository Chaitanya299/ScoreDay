// ScoreDay Recurrence Engine — simplified to 4 frequency types.
//
// DAILY         → every calendar day
// SPECIFIC_DAYS → only on selected weekdays (Sun 0 .. Sat 6)
// WEEKLY        → once per Mon-Sun week, any day
// ONE_TIME      → single dueDate
//
// Deterministic, pure, client-safe. All date math via lib/dates.

import {
  parseLocalDate,
  getLocalDateString,
  getWeekStart,
  eachDay,
} from './dates'

export const RECURRENCE_TYPES = [
  'DAILY',
  'SPECIFIC_DAYS',
  'WEEKLY',
  'ONE_TIME',
] as const

export type RecurrenceType = (typeof RECURRENCE_TYPES)[number]

export interface RecurrenceTask {
  recurrenceType: string
  daysOfWeek?: string | null // "0,1,2,3,4,5,6" — 0=Sun..6=Sat (SPECIFIC_DAYS)
  dueDate?: string | null // YYYY-MM-DD (ONE_TIME)
}

export type TaskStatus =
  | 'NOT_DUE'
  | 'DUE'
  | 'COMPLETED'
  | 'MISSED'
  | 'UPCOMING'
  | 'OVERDUE'

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
  switch (task.recurrenceType) {
    case 'DAILY':
      return true
    case 'SPECIFIC_DAYS': {
      const weekday = parseLocalDate(dateIso).getDay()
      return parseDaysOfWeek(task.daysOfWeek).includes(weekday)
    }
    case 'WEEKLY':
      return true
    case 'ONE_TIME':
      return !!task.dueDate && task.dueDate === dateIso
    default:
      return false
  }
}

export function getOccurrenceKey(task: RecurrenceTask, completionDateIso: string): string {
  if (task.recurrenceType === 'WEEKLY') return getWeekStart(completionDateIso)
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
  if (task.recurrenceType === 'WEEKLY') {
    const out: string[] = []
    let cursor = rangeStartIso
    while (cursor <= rangeEndIso) {
      const ws = getWeekStart(cursor)
      if (!out.includes(ws) && isTaskDueOnDate(task, ws)) out.push(ws)
      cursor = addDaysLocal(ws, 7)
    }
    return out.filter((ws) => ws <= rangeEndIso || ws === getWeekStart(rangeEndIso))
  }
  return eachDay(rangeStartIso, rangeEndIso).filter((d) => isTaskDueOnDate(task, d))
}

function addDaysLocal(iso: string, n: number): string {
  const d = parseLocalDate(iso)
  d.setDate(d.getDate() + n)
  return getLocalDateString(d)
}

export function getNextOccurrence(task: RecurrenceTask, afterIso: string): string | null {
  const horizon = addDaysLocal(afterIso, 366 * 5)
  let cursor = addDaysLocal(afterIso, 1)
  while (cursor <= horizon) {
    if (isTaskDueOnDate(task, cursor)) return cursor
    cursor = addDaysLocal(cursor, 1)
  }
  return null
}

export function getPreviousOccurrence(task: RecurrenceTask, beforeIso: string): string | null {
  let cursor = beforeIso
  let guard = 0
  while (cursor >= '0000-01-01' && guard < 366 * 5) {
    if (isTaskDueOnDate(task, cursor)) return cursor
    cursor = addDaysLocal(cursor, -1)
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

  if (task.recurrenceType === 'ONE_TIME') {
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
    case 'DAILY':
      return 'Every day'
    case 'SPECIFIC_DAYS':
      return formatDaysLabel(task.daysOfWeek)
    case 'WEEKLY':
      return 'Any day this week'
    case 'ONE_TIME':
      return task.dueDate ? `Due ${formatDueDate(task.dueDate)}` : 'One time'
    default:
      return 'Custom'
  }
}

// Legacy alias: keep formatFrequency name usable; callers should migrate to formatRecurrence.
export const formatFrequency = formatRecurrence
export const formatSchedule = formatRecurrence
