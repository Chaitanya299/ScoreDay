// Streak / Consistency service — core ScoreDay metrics without gamification.
//
// A day is "successful" when it has scheduled tasks AND the daily score is
// 100% (earned points / points available for that date). Days with no
// scheduled tasks are "no data": they neither extend nor break streaks.
//
// Semantics mirror getDailyProgress() in lib/progress.ts (same denominator
// rules, including WEEKLY_GOAL counting once per week on the week's Monday),
// but data is fetched in two batched Prisma queries instead of per-day
// queries so streak lookbacks stay cheap.

import { prisma } from './prisma'
import { getLocalDateString, addDays } from './dates'
import { isTaskDueOnDate, type RecurrenceTask } from './recurrence'

export interface StreakData {
  currentStreak: number
  bestStreak: number
  consistencyRate: number
  successfulDays: number
  scheduledDays: number
}

interface ActiveTask extends RecurrenceTask {
  id: string
  title: string
  category: string | null
  points: number
}

interface DayScore {
  date: string
  earned: number
  max: number
  hasScheduledTasks: boolean
}

const LOOKBACK_DAYS = 400

async function getActiveTasks(): Promise<ActiveTask[]> {
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
  return tasks as ActiveTask[]
}

/**
 * Score every day in [startIso, endIso]. Same denominator semantics as
 * getDailyProgress(): only tasks scheduled for that date contribute to max,
 * WEEKLY_GOAL counts once per week (on the week's Monday), earned points
 * come from immutable TaskCompletion.pointsEarned.
 */
export async function getDayScoresInRange(startIso: string, endIso: string): Promise<DayScore[]> {
  const tasks = await getActiveTasks()
  const completions = await prisma.taskCompletion.findMany({
    where: { completedOn: { gte: startIso, lte: endIso } },
  })

  const earnedByDate = new Map<string, number>()
  for (const c of completions) {
    earnedByDate.set(c.completedOn, (earnedByDate.get(c.completedOn) ?? 0) + c.pointsEarned)
  }

  const out: DayScore[] = []
  let cursor = startIso
  while (cursor <= endIso) {
    let max = 0
    for (const task of tasks) {
      // WEEKLY_GOAL never enters daily denominators (mirrors getDailyProgress).
      if (task.recurrenceType !== 'WEEKLY_GOAL' && isTaskDueOnDate(task, cursor)) {
        max += task.points
      }
    }
    out.push({
      date: cursor,
      earned: earnedByDate.get(cursor) ?? 0,
      max,
      hasScheduledTasks: max > 0,
    })
    cursor = addDays(cursor, 1)
  }
  return out
}

function isSuccessful(day: DayScore): boolean {
  return day.hasScheduledTasks && day.earned >= day.max
}

/**
 * Current streak: consecutive successful scheduled days ending today.
 * An in-progress today (scheduled but not yet 100%) does not break the
 * streak — counting starts from yesterday in that case. Days with no
 * scheduled tasks are skipped, never breaking the run.
 */
export async function getCurrentStreak(todayIso?: string): Promise<number> {
  const today = todayIso ?? getLocalDateString()
  const start = addDays(today, -LOOKBACK_DAYS)
  const days = await getDayScoresInRange(start, today)

  let streak = 0
  for (let i = days.length - 1; i >= 0; i--) {
    const day = days[i]
    if (!day.hasScheduledTasks) continue
    if (isSuccessful(day)) {
      streak++
    } else if (day.date === today) {
      // Today is still in progress — don't break the streak yet.
      continue
    } else {
      break
    }
  }
  return streak
}

/**
 * Best historical streak: longest run of consecutive successful scheduled
 * days in the lookback window. No-task days are skipped within a run.
 */
export async function getBestStreak(todayIso?: string): Promise<number> {
  const today = todayIso ?? getLocalDateString()
  const start = addDays(today, -LOOKBACK_DAYS)
  const days = await getDayScoresInRange(start, today)

  let best = 0
  let run = 0
  for (const day of days) {
    if (day.date > today) break
    if (!day.hasScheduledTasks) continue
    if (isSuccessful(day)) {
      run++
      if (run > best) best = run
    } else {
      run = 0
    }
  }
  return best
}

/**
 * Consistency rate for a date range: successful scheduled days / days with
 * scheduled tasks. Distinct from Score (weighted points) and Completion
 * Rate (occurrence completion).
 */
export async function getConsistencyRate(
  startIso: string,
  endIso: string,
  todayIso?: string
): Promise<{
  consistencyRate: number
  successfulDays: number
  scheduledDays: number
}> {
  const today = todayIso ?? getLocalDateString()
  const end = endIso > today ? today : endIso
  if (end < startIso) return { consistencyRate: 0, successfulDays: 0, scheduledDays: 0 }

  const days = await getDayScoresInRange(startIso, end)
  const scheduled = days.filter((d) => d.hasScheduledTasks)
  const successful = scheduled.filter(isSuccessful)

  return {
    consistencyRate:
      scheduled.length > 0 ? Math.round((successful.length / scheduled.length) * 100) : 0,
    successfulDays: successful.length,
    scheduledDays: scheduled.length,
  }
}

/** Current streak + best streak + consistency for a range, in 3 batched queries. */
export async function getStreakData(
  rangeStart: string,
  rangeEnd: string,
  todayIso?: string
): Promise<StreakData> {
  const [currentStreak, bestStreak, consistency] = await Promise.all([
    getCurrentStreak(todayIso),
    getBestStreak(todayIso),
    getConsistencyRate(rangeStart, rangeEnd),
  ])
  return {
    currentStreak,
    bestStreak,
    consistencyRate: consistency.consistencyRate,
    successfulDays: consistency.successfulDays,
    scheduledDays: consistency.scheduledDays,
  }
}
