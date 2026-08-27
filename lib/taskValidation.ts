// Server-side task input validation — only 4 recurrence types.
import {
  RECURRENCE_TYPES,
  serializeDaysOfWeek,
  parseDaysInput,
  isValidDateString,
  isPastDateString,
  type RecurrenceType,
} from './recurrence'
import { getLocalDateString } from './dates'

export interface ValidatedTask {
  title: string
  description: string | null
  category: string | null
  points: number
  recurrenceType: string
  daysOfWeek: string
  dueDate: string | null
}

export function validateRecurrenceInput(
  body: Record<string, unknown>,
  existing?: { dueDate: string | null } | null
): { error: string } | { data: ValidatedTask } {
  const { title, description, category, points, recurrenceType } = body

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return { error: 'Title is required' }
  }

  const parsedPoints = Number(points)
  if (Number.isNaN(parsedPoints) || parsedPoints < 1 || parsedPoints > 10) {
    return { error: 'Points must be between 1 and 10' }
  }

  if (!RECURRENCE_TYPES.includes(recurrenceType as RecurrenceType)) {
    return { error: `recurrenceType must be one of: ${RECURRENCE_TYPES.join(', ')}` }
  }

  const base: ValidatedTask = {
    title: (title as string).trim(),
    description: description ? String(description).trim() : null,
    category: category ? String(category).trim() : null,
    points: parsedPoints,
    recurrenceType: recurrenceType as string,
    daysOfWeek: '0,1,2,3,4,5,6',
    dueDate: null,
  }

  switch (recurrenceType) {
    case 'DAILY':
    case 'WEEKLY':
      break

    case 'SPECIFIC_DAYS': {
      if (body.daysOfWeek === undefined) {
        return { error: 'Select at least one day of the week' }
      }
      const days = parseDaysInput(body.daysOfWeek)
      if (days === null) {
        return { error: 'daysOfWeek must contain weekday numbers between 0 (Sun) and 6 (Sat)' }
      }
      return { data: { ...base, daysOfWeek: serializeDaysOfWeek(days) } }
    }

    case 'ONE_TIME': {
      if (!isValidDateString(body.dueDate)) {
        return { error: 'ONE_TIME requires a valid dueDate (YYYY-MM-DD)' }
      }
      const dueDate = body.dueDate as string
      const today = getLocalDateString()
      const isUnchangedLegacy = existing != null && existing.dueDate === dueDate
      if (isPastDateString(dueDate, today) && !isUnchangedLegacy && dueDate !== today) {
        return { error: 'Due date cannot be in the past' }
      }
      return { data: { ...base, dueDate } }
    }
  }

  return { data: base }
}
