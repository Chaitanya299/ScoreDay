// Dashboard scoring — the only place score math lives.
//
// Daily:   earned = Σ pointsEarned of completions whose local completion date
//          is today. max = Σ points of occurrences due today.
//          WEEKLY ("Any day this week") excluded from today's max: one
//          opportunity per week, not per day.
// Weekly:  earned = Σ pointsEarned with completedOn inside Mon..Sun.
//          max = occurrences in that range per task via the recurrence engine.
// History: TaskCompletion.pointsEarned is a frozen snapshot; editing a task
//          never rewrites past scores.

import { prisma } from './prisma'
import { getLocalDateString, getDaysOfWeek } from './dates'
import {
  isTaskDueOnDate,
  getTaskStatus,
  getOccurrencesForDateRange,
  type RecurrenceTask,
} from './recurrence'

export async function getDashboardData(dateStr?: string) {
  const targetDate = dateStr || getLocalDateString()

  const tasks = await prisma.task.findMany({
    where: { active: true },
    orderBy: { createdAt: 'asc' },
  })

  const weekDays = getDaysOfWeek(targetDate)
  const weekStart = weekDays[0].dateStr
  const weekEnd = weekDays[6].dateStr

  const [weekCompletions] = await Promise.all([
    prisma.taskCompletion.findMany({
      where: { completedOn: { gte: weekStart, lte: weekEnd } },
    }),
  ])

  const completionsByTask = new Map<string, typeof weekCompletions>()
  for (const c of weekCompletions) {
    const list = completionsByTask.get(c.taskId) ?? []
    list.push(c)
    completionsByTask.set(c.taskId, list)
  }

  let earnedToday = 0
  let maxDaily = 0

  const todaysRows = tasks.map((task) => {
    const rec: RecurrenceTask = task
    const completions = completionsByTask.get(task.id) ?? []
    const completedKeys = new Set(completions.map((c) => c.occurrenceDate))
    const status = getTaskStatus(rec, targetDate, { todayIso: targetDate, completedKeys })
    return { task, rec, completions, completedKeys, status }
  })

  // Today's list membership: actionable now, completed earlier today,
  // or weekly tasks completed earlier this week (remain visible as "Completed this week").
  const todaysTasks = todaysRows.filter(({ task, status, completions }) => {
    if (status === 'DUE' || status === 'OVERDUE') return true
    if (status === 'COMPLETED') {
      if (task.recurrenceType === 'WEEKLY') return true
      return completions.some((c) => c.completedOn === targetDate)
    }
    return false
  })

  interface TaskRow {
    id: string
    title: string
    description: string | null
    category: string | null
    points: number
    recurrenceType: string
    daysOfWeek: string
    dueDate: string | null
    active: boolean
    status: string
    isCompleted: boolean
    completedThisOccurrence: boolean
  }

  const taskList: TaskRow[] = []

  for (const { task, status, completions } of todaysTasks) {
    const completedThisOccurrence = status === 'COMPLETED'
    if (status === 'DUE' || status === 'OVERDUE' || status === 'COMPLETED') {
      if (task.recurrenceType !== 'WEEKLY') {
        maxDaily += task.points
      }
    }
    const earnedNow = completions
      .filter((c) => c.completedOn === targetDate)
      .reduce((acc, c) => acc + c.pointsEarned, 0)
    earnedToday += earnedNow

    taskList.push({
      id: task.id,
      title: task.title,
      description: task.description,
      category: task.category,
      points: task.points,
      recurrenceType: task.recurrenceType,
      daysOfWeek: task.daysOfWeek,
      dueDate: task.dueDate,
      active: task.active,
      status,
      isCompleted: status === 'COMPLETED',
      completedThisOccurrence,
    })
  }

  const dailyPercentage =
    maxDaily > 0 ? Math.min(100, Math.round((earnedToday / maxDaily) * 100)) : 0

  // ---------------------------------------------------------------------
  // Weekly score
  // ---------------------------------------------------------------------
  const weeklyEarned = weekCompletions.reduce((acc, c) => acc + c.pointsEarned, 0)

  let weeklyMax = 0
  for (const task of tasks) {
    const rec: RecurrenceTask = task
    const occurrences = getOccurrencesForDateRange(rec, weekStart, weekEnd)
    weeklyMax += occurrences.length * task.points
  }

  const weeklyPercentage =
    weeklyMax > 0 ? Math.min(100, Math.round((weeklyEarned / weeklyMax) * 100)) : 0

  const completedCount = taskList.filter((t) => t.status === 'COMPLETED').length
  const incompleteCount = taskList.filter((t) => t.status !== 'COMPLETED').length

  // ---------------------------------------------------------------------
  // 7-day overview — per-day max from the engine.
  // ---------------------------------------------------------------------
  const weeklyOverview = weekDays.map((day) => {
    const dayDate = day.dateStr
    let dayMax = 0
    for (const task of tasks) {
      const rec: RecurrenceTask = task
      if (isTaskDueOnDate(rec, dayDate)) {
        if (task.recurrenceType === 'WEEKLY') {
          if (dayDate === weekStart) dayMax += task.points
        } else {
          dayMax += task.points
        }
      }
    }
    const dayEarned = weekCompletions
      .filter((c) => c.completedOn === dayDate)
      .reduce((acc, c) => acc + c.pointsEarned, 0)
    return {
      label: day.label,
      date: dayDate,
      earned: dayEarned,
      max: dayMax,
      percentage: dayMax > 0 ? Math.min(100, Math.round((dayEarned / dayMax) * 100)) : 0,
      isFuture: dayDate > targetDate,
    }
  })

  // ---------------------------------------------------------------------
  // Upcoming ONE_TIME tasks (next 7 days, not yet completed)
  // ---------------------------------------------------------------------
  const tomorrowDate = new Date(targetDate + 'T00:00:00')
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const horizonDate = new Date(tomorrowDate)
  horizonDate.setDate(horizonDate.getDate() + 6)

  const upcomingRaw = await prisma.task.findMany({
    where: {
      active: true,
      recurrenceType: 'ONE_TIME',
      dueDate: {
        gte: getLocalDateString(tomorrowDate),
        lte: getLocalDateString(horizonDate),
      },
      completions: { none: {} },
    },
    orderBy: { dueDate: 'asc' },
  })

  const upcomingList = upcomingRaw.map((t) => ({
    id: t.id,
    title: t.title,
    category: t.category,
    points: t.points,
    dueDate: t.dueDate as string,
  }))


  // ---------------------------------------------------------------------
  // Streak: consecutive days ending today (or yesterday) with completions
  // ---------------------------------------------------------------------
  const streak = await computeStreak(targetDate)

  return {
    targetDate,
    earnedToday,
    maxDaily,
    dailyPercentage,
    weeklyEarned,
    weeklyMax,
    weeklyPercentage,
    completedCount,
    incompleteCount,
    streak,
    taskList,
    weeklyOverview,
    upcomingList,
  }
}

async function computeStreak(todayIso: string): Promise<number> {
  const lookback = new Date(todayIso + 'T00:00:00')
  lookback.setDate(lookback.getDate() - 400)
  const completions = await prisma.taskCompletion.findMany({
    where: { completedOn: { gte: getLocalDateString(lookback), lte: todayIso } },
    select: { completedOn: true },
  })
  const daysWithPoints = new Set(completions.map((c) => c.completedOn))

  let streak = 0
  const cursor = new Date(todayIso + 'T00:00:00')
  if (!daysWithPoints.has(getLocalDateString(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }
  while (daysWithPoints.has(getLocalDateString(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
