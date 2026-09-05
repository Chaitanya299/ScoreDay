// Progress Service — single source of truth for historical performance data.
// All calculations reuse the existing recurrence and scoring engines.

import { prisma } from './prisma'
import {
  getLocalDateString,
  getWeekStart,
  getWeekEnd,
  addDays,
  eachDay,
  getDaysOfWeek,
} from './dates'
import {
  isTaskDueOnDate,
  getOccurrenceKey,
  getOccurrencesForDateRange,
  type RecurrenceTask,
} from './recurrence'

// Helper: get individual day occurrences for a task in a date range
// For WEEKLY tasks, this returns each scheduled day (not just week keys)
// For WEEKLY_GOAL, returns only the week start (one per week)
function getDayOccurrencesForDateRange(
  task: RecurrenceTask,
  rangeStartIso: string,
  rangeEndIso: string
): string[] {
  if (rangeEndIso < rangeStartIso) return []
  
  let start = rangeStartIso
  let end = rangeEndIso
  
  if (task.startDate && start < task.startDate) start = task.startDate
  if (task.endDate && end > task.endDate) end = task.endDate
  
  if (start > end) return []

  // For WEEKLY_GOAL, use the existing getOccurrencesForDateRange which returns week keys
  if (task.recurrenceType === 'WEEKLY_GOAL') {
    return getOccurrencesForDateRange(task, start, end)
  }

  const out: string[] = []
  let cursor = start
  while (cursor <= end) {
    if (isTaskDueOnDate(task, cursor)) out.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return out
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DateRange {
  start: string
  end: string
}

export interface DailyProgress {
  date: string
  earned: number
  max: number
  percentage: number
  hasScheduledTasks: boolean
}

export interface WeeklyProgress {
  weekStart: string
  weekEnd: string
  earned: number
  max: number
  percentage: number
  dailyBreakdown: DailyProgress[]
}

export interface MonthlyProgress {
  month: string // YYYY-MM
  earned: number
  max: number
  percentage: number
  averageScore: number
  bestDay: { date: string; percentage: number } | null
  totalPoints: number
  completionRate: number
  dailyScores: DailyScore[]
}

export interface DailyScore {
  date: string
  earned: number
  max: number
  percentage: number
  hasScheduledTasks: boolean
}

export interface CalendarDay {
  date: string
  percentage: number | null
  hasScheduledTasks: boolean
  isCurrentMonth: boolean
}

export interface TaskPerformance {
  taskId: string
  title: string
  category: string | null
  points: number
  recurrenceType: string
  scheduledOccurrences: number
  completedOccurrences: number
  completionRate: number
  pointsEarned: number
}

export interface CategoryPerformance {
  category: string
  scheduledOccurrences: number
  completedOccurrences: number
  completionRate: number
  pointsEarned: number
}

export interface MissedOccurrence {
  taskId: string
  taskTitle: string
  category: string | null
  occurrenceDate: string
  points: number
}

export interface ProgressSummary {
  averageScore: number
  bestDay: { date: string; percentage: number } | null
  totalPoints: number
  completionRate: number
}

export interface TrendData {
  current: ProgressSummary
  previous: ProgressSummary | null
  averageScoreChange: number | null
  completionRateChange: number | null
  pointsChange: number | null
}

export interface DayDetail {
  date: string
  percentage: number
  earned: number
  max: number
  completedTasks: Array<{
    taskId: string
    title: string
    category: string | null
    pointsEarned: number
  }>
  missedTasks: Array<{
    taskId: string
    title: string
    category: string | null
    points: number
  }>
}

// ---------------------------------------------------------------------------
// Date Range Helpers
// ---------------------------------------------------------------------------

export function getMonthRange(monthIso: string): DateRange {
  const [year, month] = monthIso.split('-').map(Number)
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

export function getWeekRange(weekStartIso: string): DateRange {
  const start = getWeekStart(weekStartIso)
  const end = getWeekEnd(start)
  return { start, end }
}

export function getCurrentMonthIso(): string {
  return getLocalDateString().slice(0, 7)
}

export function getPreviousMonth(monthIso: string): string {
  const [year, month] = monthIso.split('-').map(Number)
  const date = new Date(year, month - 2, 1) // month-2 because 0-indexed and we want previous
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function getNextMonth(monthIso: string): string {
  const [year, month] = monthIso.split('-').map(Number)
  const date = new Date(year, month, 1) // month is 0-indexed, so this gives next month
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function getPreviousWeek(weekStartIso: string): string {
  return addDays(weekStartIso, -7)
}

export function getNextWeek(weekStartIso: string): string {
  return addDays(weekStartIso, 7)
}

// ---------------------------------------------------------------------------
// Core Calculation Functions
// ---------------------------------------------------------------------------

async function getActiveTasks(): Promise<Array<RecurrenceTask & { id: string; title: string; category: string | null; points: number }>> {
  const tasks = await prisma.task.findMany({
    where: { active: true },
    select: {
      id: true,
      title: true,
      category: true,
      points: true,
      recurrenceType: true,
      interval: true,
      unit: true,
      selectedWeekdays: true,
      dayOfMonth: true,
      dueDate: true,
      startDate: true,
      endDate: true,
    },
  })
  return tasks as Array<RecurrenceTask & { id: string; title: string; category: string | null; points: number }>
}

async function getCompletionsInRange(range: DateRange) {
  return prisma.taskCompletion.findMany({
    where: { completedOn: { gte: range.start, lte: range.end } },
  })
}

// ---------------------------------------------------------------------------
// Daily Progress
// ---------------------------------------------------------------------------

export async function getDailyProgress(dateStr: string): Promise<DailyProgress> {
  const tasks = await getActiveTasks()
  const completions = await prisma.taskCompletion.findMany({
    where: { completedOn: dateStr },
  })

  let earned = 0
  let max = 0

  for (const task of tasks) {
    const rec: RecurrenceTask = task
    if (isTaskDueOnDate(rec, dateStr)) {
      // For WEEKLY_GOAL, only count once per week (on the week's Monday)
      if (task.recurrenceType === 'WEEKLY_GOAL') {
        const weekStart = getWeekStart(dateStr)
        if (dateStr === weekStart) {
          max += task.points
        }
      } else {
        max += task.points
      }
    }
  }

  for (const c of completions) {
    earned += c.pointsEarned
  }

  const hasScheduledTasks = max > 0
  const percentage = hasScheduledTasks ? Math.min(100, Math.round((earned / max) * 100)) : 0

  return { date: dateStr, earned, max, percentage, hasScheduledTasks }
}

// ---------------------------------------------------------------------------
// Weekly Progress
// ---------------------------------------------------------------------------

export async function getWeeklyProgress(weekStart: string): Promise<WeeklyProgress> {
  const { start, end } = getWeekRange(weekStart)
  const tasks = await getActiveTasks()
  const completions = await getCompletionsInRange({ start, end })

  // Weekly earned from completions
  const weeklyEarned = completions.reduce((acc, c) => acc + c.pointsEarned, 0)

  // Weekly max: sum points for each scheduled day in the week
  // Use day-by-day iteration to correctly count WEEKLY task occurrences per selected day
  let weeklyMax = 0
  for (const date of eachDay(start, end)) {
    for (const task of tasks) {
      const rec: RecurrenceTask = task
      if (isTaskDueOnDate(rec, date)) {
        // For WEEKLY_GOAL, only count once per week (on the week's Monday)
        if (task.recurrenceType === 'WEEKLY_GOAL') {
          const weekStart = getWeekStart(date)
          if (date === weekStart) {
            weeklyMax += task.points
          }
        } else {
          weeklyMax += task.points
        }
      }
    }
  }

  const weeklyPercentage = weeklyMax > 0 ? Math.min(100, Math.round((weeklyEarned / weeklyMax) * 100)) : 0

  // Daily breakdown for the week
  const weekDays = getDaysOfWeek(weekStart)
  const dailyBreakdown: DailyProgress[] = []

  for (const day of weekDays) {
    const dayProgress = await getDailyProgress(day.dateStr)
    dailyBreakdown.push(dayProgress)
  }

  return {
    weekStart: start,
    weekEnd: end,
    earned: weeklyEarned,
    max: weeklyMax,
    percentage: weeklyPercentage,
    dailyBreakdown,
  }
}

// ---------------------------------------------------------------------------
// Monthly Progress
// ---------------------------------------------------------------------------

export async function getMonthlyProgress(monthIso: string): Promise<MonthlyProgress> {
  const { start, end } = getMonthRange(monthIso)
  const tasks = await getActiveTasks()
  const completions = await getCompletionsInRange({ start, end })

  // Build completions map for quick lookup
  const completionsByDate = new Map<string, typeof completions>()
  for (const c of completions) {
    const list = completionsByDate.get(c.completedOn) ?? []
    list.push(c)
    completionsByDate.set(c.completedOn, list)
  }

  let totalEarned = 0
  let totalMax = 0
  let totalScheduledOccurrences = 0
  let totalCompletedOccurrences = 0

  const dailyScores: DailyScore[] = []
  let bestDay: { date: string; percentage: number } | null = null

  // Iterate each day in the month
  for (const date of eachDay(start, end)) {
    let dayEarned = 0
    let dayMax = 0

    for (const task of tasks) {
      const rec: RecurrenceTask = task
      if (isTaskDueOnDate(rec, date)) {
        totalScheduledOccurrences++

        // For WEEKLY_GOAL, only count once per week (on the week's Monday)
        if (task.recurrenceType === 'WEEKLY_GOAL') {
          const weekStart = getWeekStart(date)
          if (date === weekStart) {
            dayMax += task.points
            totalMax += task.points
          }
        } else {
          dayMax += task.points
          totalMax += task.points
        }

        // Check if completed
        const occKey = getOccurrenceKey(rec, date)
        const dayCompletions = completionsByDate.get(date) ?? []
        const isCompleted = dayCompletions.some(c => c.taskId === task.id && c.occurrenceDate === occKey)
        if (isCompleted) {
          totalCompletedOccurrences++
          // Find the completion to get pointsEarned
          const completion = dayCompletions.find(c => c.taskId === task.id && c.occurrenceDate === occKey)
          if (completion) {
            dayEarned += completion.pointsEarned
            totalEarned += completion.pointsEarned
          }
        }
      }
    }

    const hasScheduledTasks = dayMax > 0
    const percentage = hasScheduledTasks ? Math.min(100, Math.round((dayEarned / dayMax) * 100)) : 0

    dailyScores.push({
      date,
      earned: dayEarned,
      max: dayMax,
      percentage,
      hasScheduledTasks,
    })

    if (hasScheduledTasks) {
      if (bestDay === null || percentage > bestDay.percentage) {
        bestDay = { date, percentage }
      }
    }
  }

  // Calculate average score (only days with scheduled tasks)
  const daysWithTasks = dailyScores.filter(d => d.hasScheduledTasks)
  const averageScore = daysWithTasks.length > 0
    ? Math.round(daysWithTasks.reduce((acc, d) => acc + d.percentage, 0) / daysWithTasks.length)
    : 0

  const completionRate = totalScheduledOccurrences > 0
    ? Math.round((totalCompletedOccurrences / totalScheduledOccurrences) * 100)
    : 0

  return {
    month: monthIso,
    earned: totalEarned,
    max: totalMax,
    percentage: totalMax > 0 ? Math.min(100, Math.round((totalEarned / totalMax) * 100)) : 0,
    averageScore,
    bestDay,
    totalPoints: totalEarned,
    completionRate,
    dailyScores,
  }
}

// ---------------------------------------------------------------------------
// Score History (for chart)
// ---------------------------------------------------------------------------

export async function getScoreHistory(monthIso: string): Promise<DailyScore[]> {
  const monthly = await getMonthlyProgress(monthIso)
  return monthly.dailyScores
}

// ---------------------------------------------------------------------------
// Calendar Heatmap
// ---------------------------------------------------------------------------

export async function getCalendarHeatmap(monthIso: string): Promise<CalendarDay[]> {
  const { start, end } = getMonthRange(monthIso)
  const monthly = await getMonthlyProgress(monthIso)
  
  // Create a map for quick lookup
  const scoreMap = new Map(monthly.dailyScores.map(d => [d.date, d]))

  const calendarDays: CalendarDay[] = []
  const startDate = new Date(start + 'T00:00:00')
  const endDate = new Date(end + 'T00:00:00')
  
  // Find the Monday of the week containing the first day of the month
  const cursor = new Date(startDate)
  const firstDayOfWeek = cursor.getDay() // 0=Sun
  const daysToMonday = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek
  cursor.setDate(cursor.getDate() + daysToMonday)

  // Generate 6 weeks (42 days) to fill the calendar grid
  for (let week = 0; week < 6; week++) {
    for (let day = 0; day < 7; day++) {
      const dateStr = getLocalDateString(cursor)
      const isCurrentMonth = dateStr >= start && dateStr <= end
      const scoreData = scoreMap.get(dateStr)
      
      calendarDays.push({
        date: dateStr,
        percentage: scoreData?.hasScheduledTasks ? scoreData.percentage : null,
        hasScheduledTasks: scoreData?.hasScheduledTasks ?? false,
        isCurrentMonth,
      })
      
      cursor.setDate(cursor.getDate() + 1)
    }
    
    // Stop if we've gone past the end of the month and completed the week
    if (cursor > endDate && week >= 4) break
  }

  return calendarDays
}

// ---------------------------------------------------------------------------
// Task Performance
// ---------------------------------------------------------------------------

export async function getTaskPerformance(taskId: string, range: DateRange): Promise<TaskPerformance | null> {
  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) return null

  const rec: RecurrenceTask = task as RecurrenceTask

  // Get scheduled occurrences by iterating day by day (correctly counts WEEKLY per selected day)
  const dayOccurrences = getDayOccurrencesForDateRange(rec, range.start, range.end)
  const scheduledOccurrences = dayOccurrences.length

  // For completion checking, we need the occurrence keys (week-start for WEEKLY)
  const occurrenceKeys = getOccurrencesForDateRange(rec, range.start, range.end)

  const completions = await prisma.taskCompletion.findMany({
    where: {
      taskId,
      occurrenceDate: { in: occurrenceKeys },
    },
  })

  const completedOccurrences = completions.length
  const pointsEarned = completions.reduce((acc, c) => acc + c.pointsEarned, 0)
  const completionRate = scheduledOccurrences > 0
    ? Math.round((completedOccurrences / scheduledOccurrences) * 100)
    : 0

  return {
    taskId: task.id,
    title: task.title,
    category: task.category,
    points: task.points,
    recurrenceType: task.recurrenceType,
    scheduledOccurrences,
    completedOccurrences,
    completionRate,
    pointsEarned,
  }
}

export async function getAllTaskPerformance(range: DateRange): Promise<TaskPerformance[]> {
  const tasks = await getActiveTasks()
  const results: TaskPerformance[] = []

  for (const task of tasks) {
    const perf = await getTaskPerformance(task.id, range)
    if (perf && perf.scheduledOccurrences > 0) {
      results.push(perf)
    }
  }

  // Sort by completion rate descending
  return results.sort((a, b) => b.completionRate - a.completionRate)
}

// ---------------------------------------------------------------------------
// Category Performance
// ---------------------------------------------------------------------------

export async function getCategoryPerformance(range: DateRange): Promise<CategoryPerformance[]> {
  const taskPerformances = await getAllTaskPerformance(range)
  
  const categoryMap = new Map<string, CategoryPerformance>()

  for (const tp of taskPerformances) {
    const category = tp.category || 'Uncategorized'
    const existing = categoryMap.get(category) || {
      category,
      scheduledOccurrences: 0,
      completedOccurrences: 0,
      completionRate: 0,
      pointsEarned: 0,
    }

    existing.scheduledOccurrences += tp.scheduledOccurrences
    existing.completedOccurrences += tp.completedOccurrences
    existing.pointsEarned += tp.pointsEarned
    existing.completionRate = existing.scheduledOccurrences > 0
      ? Math.round((existing.completedOccurrences / existing.scheduledOccurrences) * 100)
      : 0

    categoryMap.set(category, existing)
  }

  return Array.from(categoryMap.values())
    .filter(c => c.scheduledOccurrences > 0)
    .sort((a, b) => b.completionRate - a.completionRate)
}

// ---------------------------------------------------------------------------
// Points Breakdown
// ---------------------------------------------------------------------------

export async function getPointsBreakdown(range: DateRange): Promise<Array<{ category: string; points: number }>> {
  const categoryPerf = await getCategoryPerformance(range)
  return categoryPerf.map(c => ({ category: c.category, points: c.pointsEarned }))
    .sort((a, b) => b.points - a.points)
}

// ---------------------------------------------------------------------------
// Missed Occurrences
// ---------------------------------------------------------------------------

export async function getMissedOccurrences(range: DateRange): Promise<MissedOccurrence[]> {
  const tasks = await getActiveTasks()
  const completions = await getCompletionsInRange(range)

  const completedKeys = new Set(completions.map(c => `${c.taskId}:${c.occurrenceDate}`))
  const missed: MissedOccurrence[] = []

  for (const task of tasks) {
    const rec: RecurrenceTask = task
    // Use day-by-day occurrences to correctly identify missed days
    const dayOccurrences = getDayOccurrencesForDateRange(rec, range.start, range.end)

    for (const occ of dayOccurrences) {
      // For completion checking, we need the occurrence key (week-start for WEEKLY)
      const occKey = getOccurrenceKey(rec, occ)
      const key = `${task.id}:${occKey}`
      
      if (!completedKeys.has(key)) {
        // For WEEKLY_GOAL, only count as missed if the week has ended
        if (task.recurrenceType === 'WEEKLY_GOAL') {
          const weekEnd = getWeekEnd(occ)
          if (weekEnd > range.end) continue // Week hasn't ended yet in our range
        }
        // For all types, only count as missed if the occurrence date has passed
        if (occ > range.end) continue

        missed.push({
          taskId: task.id,
          taskTitle: task.title,
          category: task.category,
          occurrenceDate: occ,
          points: task.points,
        })
      }
    }
  }

  // Sort by date descending (most recent first)
  return missed.sort((a, b) => b.occurrenceDate.localeCompare(a.occurrenceDate))
}

// ---------------------------------------------------------------------------
// Progress Summary
// ---------------------------------------------------------------------------

export async function getProgressSummary(range: DateRange): Promise<ProgressSummary> {
  // For summary, we need to determine if it's a month or week range
  // We'll calculate based on the range
  const tasks = await getActiveTasks()
  const completions = await getCompletionsInRange(range)

  let totalEarned = 0
  let totalScheduledOccurrences = 0
  let totalCompletedOccurrences = 0
  let bestDay: { date: string; percentage: number } | null = null
  const dailyScoresMap = new Map<string, { earned: number; max: number }>()

  // Group completions by date
  const completionsByDate = new Map<string, typeof completions>()
  for (const c of completions) {
    const list = completionsByDate.get(c.completedOn) ?? []
    list.push(c)
    completionsByDate.set(c.completedOn, list)
  }

  // Iterate each day in range
  for (const date of eachDay(range.start, range.end)) {
    let dayEarned = 0
    let dayMax = 0

    for (const task of tasks) {
      const rec: RecurrenceTask = task
      if (isTaskDueOnDate(rec, date)) {
        // For WEEKLY_GOAL, only count as a scheduled occurrence on the week start day
        if (task.recurrenceType === 'WEEKLY_GOAL') {
          const weekStart = getWeekStart(date)
          if (date === weekStart) {
            totalScheduledOccurrences++
            dayMax += task.points
          } else {
            // WEEKLY_GOAL is due every day but only counts once per week
            // Don't count as scheduled occurrence on other days
            continue
          }
        } else {
          totalScheduledOccurrences++
          dayMax += task.points
        }

        const occKey = getOccurrenceKey(rec, date)
        
        // For WEEKLY_GOAL, check completions across the whole week (not just this day)
        // because the completion could have happened on any day of the week
        let isCompleted = false
        if (task.recurrenceType === 'WEEKLY_GOAL') {
          // Check all completions in the range for this task with this occurrence key
          isCompleted = completions.some(
            c => c.taskId === task.id && c.occurrenceDate === occKey
          )
        } else {
          // For other types, check completions for this specific day
          const dayCompletions = completionsByDate.get(date) ?? []
          isCompleted = dayCompletions.some(c => c.taskId === task.id && c.occurrenceDate === occKey)
        }
        
        if (isCompleted) {
          totalCompletedOccurrences++
          // Find the completion to get pointsEarned
          const completion = completions.find(c => c.taskId === task.id && c.occurrenceDate === occKey)
          if (completion) {
            dayEarned += completion.pointsEarned
            totalEarned += completion.pointsEarned
          }
        }
      }
    }

    const hasScheduledTasks = dayMax > 0
    const percentage = hasScheduledTasks ? Math.min(100, Math.round((dayEarned / dayMax) * 100)) : 0

    dailyScoresMap.set(date, { earned: dayEarned, max: dayMax })

    if (hasScheduledTasks) {
      if (bestDay === null || percentage > bestDay.percentage) {
        bestDay = { date, percentage }
      }
    }
  }

  const daysWithTasks = Array.from(dailyScoresMap.entries()).filter(([, v]) => v.max > 0)
  const averageScore = daysWithTasks.length > 0
    ? Math.round(daysWithTasks.reduce((acc, [, v]) => acc + Math.min(100, Math.round((v.earned / v.max) * 100)), 0) / daysWithTasks.length)
    : 0

  const completionRate = totalScheduledOccurrences > 0
    ? Math.round((totalCompletedOccurrences / totalScheduledOccurrences) * 100)
    : 0

  return {
    averageScore,
    bestDay,
    totalPoints: totalEarned,
    completionRate,
  }
}

// ---------------------------------------------------------------------------
// Trend Comparison
// ---------------------------------------------------------------------------

export async function getTrendComparison(currentRange: DateRange): Promise<TrendData> {
  const current = await getProgressSummary(currentRange)

  // Calculate previous period range (same duration)
  const currentStart = new Date(currentRange.start + 'T00:00:00')
  const currentEnd = new Date(currentRange.end + 'T00:00:00')
  const durationDays = Math.round((currentEnd.getTime() - currentStart.getTime()) / 86400000)

  const prevEnd = new Date(currentStart)
  prevEnd.setDate(prevEnd.getDate() - 1)
  const prevStart = new Date(prevEnd)
  prevStart.setDate(prevStart.getDate() - durationDays)

  const previousRange: DateRange = {
    start: getLocalDateString(prevStart),
    end: getLocalDateString(prevEnd),
  }

  // Check if previous period has any data
  const prevCompletions = await prisma.taskCompletion.findMany({
    where: { completedOn: { gte: previousRange.start, lte: previousRange.end } },
    take: 1,
  })

  if (prevCompletions.length === 0) {
    return {
      current,
      previous: null,
      averageScoreChange: null,
      completionRateChange: null,
      pointsChange: null,
    }
  }

  const previous = await getProgressSummary(previousRange)

  return {
    current,
    previous,
    averageScoreChange: previous.averageScore !== undefined ? current.averageScore - previous.averageScore : null,
    completionRateChange: previous.completionRate !== undefined ? current.completionRate - previous.completionRate : null,
    pointsChange: current.totalPoints - previous.totalPoints,
  }
}

// ---------------------------------------------------------------------------
// Day Detail
// ---------------------------------------------------------------------------

export async function getDayDetail(dateStr: string): Promise<DayDetail> {
  const tasks = await getActiveTasks()
  const completions = await prisma.taskCompletion.findMany({
    where: { completedOn: dateStr },
  })

  const completionsByTask = new Map<string, typeof completions>()
  for (const c of completions) {
    const list = completionsByTask.get(c.taskId) ?? []
    list.push(c)
    completionsByTask.set(c.taskId, list)
  }

  let earned = 0
  let max = 0
  const completedTasks: DayDetail['completedTasks'] = []
  const missedTasks: DayDetail['missedTasks'] = []

  for (const task of tasks) {
    const rec: RecurrenceTask = task
    if (isTaskDueOnDate(rec, dateStr)) {
      // For WEEKLY_GOAL, only count once per week (on the week's Monday)
      if (task.recurrenceType === 'WEEKLY_GOAL') {
        const weekStart = getWeekStart(dateStr)
        if (dateStr === weekStart) {
          max += task.points
        }
      } else {
        max += task.points
      }

      const occKey = getOccurrenceKey(rec, dateStr)
      const taskCompletions = completionsByTask.get(task.id) ?? []
      const completion = taskCompletions.find(c => c.occurrenceDate === occKey)

      if (completion) {
        earned += completion.pointsEarned
        completedTasks.push({
          taskId: task.id,
          title: task.title,
          category: task.category,
          pointsEarned: completion.pointsEarned,
        })
      } else {
        missedTasks.push({
          taskId: task.id,
          title: task.title,
          category: task.category,
          points: task.points,
        })
      }
    }
  }

  const percentage = max > 0 ? Math.min(100, Math.round((earned / max) * 100)) : 0

  return {
    date: dateStr,
    percentage,
    earned,
    max,
    completedTasks,
    missedTasks,
  }
}