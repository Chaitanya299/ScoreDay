// Server-side task input validation — supports expanded recurrence model
import {
  RECURRENCE_TYPES,
  type RecurrenceType,
  type RecurrenceTask,
} from './recurrence'
import { getLocalDateString } from './dates'

export interface ValidatedTask extends RecurrenceTask {
  title: string
  description: string | null
  category: string | null
  points: number
  active: boolean
}

export function validateRecurrenceInput(
  body: Record<string, unknown>,
  existing?: RecurrenceTask | null
): { error: string } | { data: ValidatedTask } {
  const { title, description, category, points, active, recurrenceType } = body

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
    interval: 1,
    unit: undefined,
    selectedWeekdays: undefined,
    dayOfMonth: undefined,
    startDate: undefined,
    endDate: undefined,
    dueDate: undefined,
    active: active ?? true,
  }

  switch (recurrenceType) {
    case 'DAILY':
    case 'WEEKLY':
    case 'WEEKLY_GOAL':
      // These types don't require additional validation beyond type
      break

    case 'NONE': {
      if (!isValidDateString(body.dueDate)) {
        return { error: 'NONE requires a valid dueDate (YYYY-MM-DD)' }
      }
      const dueDate = body.dueDate as string
      const today = getLocalDateString()
      const isUnchangedLegacy = existing != null && existing.dueDate === dueDate
      if (isPastDateString(dueDate, today) && !isUnchangedLegacy && dueDate !== today) {
        return { error: 'Due date cannot be in the past' }
      }
      return { data: { ...base, dueDate } }
    }

    case 'CUSTOM': {
      // Validate interval
      const interval = body.interval !== undefined ? Number(body.interval) : 1
      if (Number.isNaN(interval) || interval < 1) {
        return { error: 'Interval must be at least 1' }
      }

      // Validate unit
      const unit = body.unit as string | undefined
      if (!unit || !['DAY', 'WEEK', 'MONTH'].includes(unit)) {
        return { error: 'Unit must be DAY, WEEK, or MONTH' }
      }

      // Validate selectedWeekdays for WEEK unit
      let selectedWeekdays = body.selectedWeekdays as string | undefined
      if (unit === 'WEEK') {
        if (!selectedWeekdays) {
          return { error: 'Select at least one day of the week' }
        }
        const days = parseDaysInput(selectedWeekdays)
        if (days === null) {
          return { error: 'selectedWeekdays must contain weekday numbers between 0 (Sun) and 6 (Sat)' }
        }
        selectedWeekdays = serializeDaysOfWeek(days)
      }

      // Validate dayOfMonth for MONTH unit
      let dayOfMonth = body.dayOfMonth !== undefined ? Number(body.dayOfMonth) : undefined
      if (unit === 'MONTH') {
        if (dayOfMonth === undefined || dayOfMonth < 1 || dayOfMonth > 31) {
          return { error: 'Day of month must be between 1 and 31' }
        }
      }

      // Validate dates
      let startDate = body.startDate as string | undefined
      let endDate = body.endDate as string | undefined
      
      if (startDate && !isValidDateString(startDate)) {
        return { error: 'Start date must be valid (YYYY-MM-DD)' }
      }
      if (endDate && !isValidDateString(endDate)) {
        return { error: 'End date must be valid (YYYY-MM-DD)' }
      }
      if (startDate && endDate && startDate > endDate) {
        return { error: 'Start date must be before end date' }
      }

      return { data: { 
        ...base, 
        interval,
        unit,
        selectedWeekdays,
        dayOfMonth,
        startDate,
        endDate
      } }
    }
  }

  return { data: base }
}