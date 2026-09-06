'use client'

import { useState, useEffect, useRef } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  getPreviousMonth,
  getNextMonth,
  getPreviousWeek,
  getNextWeek,
} from '@/lib/progress'
import { getWeekStart, getLocalDateString } from '@/lib/dates'

interface DailyScore {
  date: string
  earned: number
  max: number
  percentage: number
  hasScheduledTasks: boolean
}

interface MonthlyProgress {
  month: string
  earned: number
  max: number
  percentage: number
  averageScore: number
  bestDay: { date: string; percentage: number } | null
  totalPoints: number
  completionRate: number
  dailyScores: DailyScore[]
}

interface WeeklyProgress {
  weekStart: string
  weekEnd: string
  earned: number
  max: number
  percentage: number
  dailyBreakdown: DailyScore[]
}

interface TrendData {
  current: {
    averageScore: number
    bestDay: { date: string; percentage: number } | null
    totalPoints: number
    completionRate: number
  }
  previous: {
    averageScore: number
    bestDay: { date: string; percentage: number } | null
    totalPoints: number
    completionRate: number
  } | null
  averageScoreChange: number | null
  completionRateChange: number | null
  pointsChange: number | null
}

interface StreakSummary {
  currentStreak: number
  bestStreak: number
  consistencyRate: number
  successfulDays: number
  scheduledDays: number
}

interface TaskPerformanceItem {
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

interface CategoryPerformanceItem {
  category: string
  scheduledOccurrences: number
  completedOccurrences: number
  completionRate: number
  pointsEarned: number
}

interface MissedItem {
  taskId: string
  taskTitle: string
  category: string | null
  occurrenceDate: string
  points: number
}

interface ProgressViewProps {
  initialData: {
    currentMonth: string
    view: 'week' | 'month'
    monthlyProgress: MonthlyProgress
    trend: TrendData
    streaks: StreakSummary
    taskPerformance: TaskPerformanceItem[]
    categoryPerformance: CategoryPerformanceItem[]
    missed: MissedItem[]
  }
}

function formatMissedDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function barColor(percentage: number) {
  if (percentage >= 81) return 'bg-emerald-500'
  if (percentage >= 61) return 'bg-blue-500'
  if (percentage >= 41) return 'bg-yellow-500'
  if (percentage > 0) return 'bg-orange-500'
  return 'bg-slate-300 dark:bg-slate-700'
}

interface DayDetailData {
  date: string
  percentage: number
  earned: number
  max: number
  completedTasks: Array<{ taskId: string; title: string; category: string | null; pointsEarned: number }>
  missedTasks: Array<{ taskId: string; title: string; category: string | null; points: number }>
}

function formatDayTitle(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function getScoreColor(percentage: number) {
  if (percentage >= 81) return 'text-emerald-500'
  if (percentage >= 61) return 'text-blue-500'
  if (percentage >= 41) return 'text-yellow-500'
  if (percentage > 0) return 'text-orange-500'
  return 'text-slate-400'
}

function getCalendarColor(percentage: number | null) {
  if (percentage === null) return 'bg-slate-100 dark:bg-slate-800'
  if (percentage >= 81) return 'bg-emerald-500'
  if (percentage >= 61) return 'bg-blue-500'
  if (percentage >= 41) return 'bg-yellow-500'
  if (percentage > 0) return 'bg-orange-500'
  return 'bg-slate-200 dark:bg-slate-700'
}

function DayDetailModal({ date, onClose }: { date: string; onClose: () => void }) {
  const [detail, setDetail] = useState<DayDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/progress/day?date=${date}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load')
        return res.json()
      })
      .then((data: DayDetailData) => {
        if (!cancelled) {
          setDetail(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Could not load details for this day. Please try again.')
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [date])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${formatDayTitle(date)}`}
        className="relative bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close day details"
          className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 text-2xl"
        >
          &times;
        </button>

        <h2 className="text-xl font-bold mb-1 pr-10">{formatDayTitle(date)}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Daily performance</p>

        {loading && (
          <div className="py-10 text-center text-slate-500" aria-live="polite">
            Loading day detail…
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        {detail && !loading && (
          <>
            <div className="mb-6 flex items-end gap-3">
              <p className={`text-5xl font-black ${getScoreColor(detail.percentage)}`}>
                {detail.percentage}%
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 pb-2">
                {detail.earned} / {detail.max} points
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Completed ({detail.completedTasks.length})
                </h3>
                {detail.completedTasks.length > 0 ? (
                  <ul className="space-y-2">
                    {detail.completedTasks.map((t) => (
                      <li
                        key={t.taskId}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900"
                      >
                        <span className="min-w-0">
                          <span className="block font-medium text-sm text-slate-900 dark:text-white truncate">
                            ✓ {t.title}
                          </span>
                          {t.category && (
                            <span className="block text-xs text-slate-500 dark:text-slate-400">
                              {t.category}
                            </span>
                          )}
                        </span>
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 shrink-0">
                          +{t.pointsEarned}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Nothing completed this day.</p>
                )}
              </div>

              {detail.missedTasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Missed ({detail.missedTasks.length})
                  </h3>
                  <ul className="space-y-2">
                    {detail.missedTasks.map((t) => (
                      <li
                        key={t.taskId}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900"
                      >
                        <span className="min-w-0">
                          <span className="block font-medium text-sm text-slate-600 dark:text-slate-400 truncate">
                            ○ {t.title}
                          </span>
                          {t.category && (
                            <span className="block text-xs text-slate-500 dark:text-slate-400">
                              {t.category}
                            </span>
                          )}
                        </span>
                        <span className="text-xs font-semibold text-red-600 dark:text-red-400 shrink-0">
                          {t.points} pts
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function ProgressView({
  initialData,
}: ProgressViewProps) {
  const [currentMonth, setCurrentMonth] = useState(initialData.currentMonth)
  const [view, setView] = useState<'week' | 'month'>(initialData.view)
  const [showDayDetail, setShowDayDetail] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  // Period data: server-rendered first paint, refetched client-side on navigation.
  const [monthlyProgress, setMonthlyProgress] = useState(initialData.monthlyProgress)
  const [trend, setTrend] = useState(initialData.trend)
  const [streaks, setStreaks] = useState(initialData.streaks)
  const [taskPerformance, setTaskPerformance] = useState(initialData.taskPerformance)
  const [categoryPerformance, setCategoryPerformance] = useState(initialData.categoryPerformance)
  const [missed, setMissed] = useState(initialData.missed)
  const [weekStart, setWeekStart] = useState(() => getWeekStart(getLocalDateString()))
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress | null>(null)
  const [loadingPeriod, setLoadingPeriod] = useState(false)
  const [periodError, setPeriodError] = useState<string | null>(null)
  const firstMonthRender = useRef(true)

  useEffect(() => {
    if (view !== 'month') return
    if (firstMonthRender.current) {
      firstMonthRender.current = false
      return
    }
    let cancelled = false
    setLoadingPeriod(true)
    setPeriodError(null)
    fetch(`/api/progress/month?month=${currentMonth}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load')
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        setMonthlyProgress(data.monthlyProgress)
        setTrend(data.trend)
        setStreaks(data.streaks)
        setTaskPerformance(data.taskPerformance)
        setCategoryPerformance(data.categoryPerformance)
        setMissed(data.missed)
        setLoadingPeriod(false)
      })
      .catch(() => {
        if (cancelled) return
        setPeriodError('Could not load this month. Please try again.')
        setLoadingPeriod(false)
      })
    return () => {
      cancelled = true
    }
  }, [currentMonth, view])

  useEffect(() => {
    if (view !== 'week') return
    let cancelled = false
    setLoadingPeriod(true)
    setPeriodError(null)
    fetch(`/api/progress/week?weekStart=${weekStart}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load')
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        setWeeklyProgress(data.weeklyProgress)
        setStreaks(data.streaks)
        setTaskPerformance(data.taskPerformance)
        setCategoryPerformance(data.categoryPerformance)
        setMissed(data.missed)
        setLoadingPeriod(false)
      })
      .catch(() => {
        if (cancelled) return
        setPeriodError('Could not load this week. Please try again.')
        setLoadingPeriod(false)
      })
    return () => {
      cancelled = true
    }
  }, [view, weekStart])

  const goToPreviousMonth = () => {
    setCurrentMonth(getPreviousMonth(currentMonth))
  }

  const goToNextMonth = () => {
    setCurrentMonth(getNextMonth(currentMonth))
  }

  const formatMonth = (monthIso: string) => {
    const [year, month] = monthIso.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const formatWeekRange = (startIso: string) => {
    const start = new Date(startIso + 'T00:00:00')
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`
  }

  const handleViewChange = (newView: 'week' | 'month') => {
    setView(newView)
  }

  const openDayDetail = (dateStr: string) => {
    setSelectedDay(dateStr)
    setShowDayDetail(true)
  }

  // Format data for chart
  const chartData = monthlyProgress.dailyScores
    .filter((d) => d.hasScheduledTasks)
    .map((d) => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: d.percentage,
      earned: d.earned,
      max: d.max,
    }))

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Progress</h1>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* Week/Month Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => handleViewChange('week')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === 'week'
                  ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => handleViewChange('month')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === 'month'
                  ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Month
            </button>
          </div>

          {/* Prev/Next Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => (view === 'week' ? setWeekStart(getPreviousWeek(weekStart)) : goToPreviousMonth())}
              aria-label={view === 'week' ? 'Previous week' : 'Previous month'}
              className="px-3 py-2 min-w-[44px] min-h-[44px] text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              &lt;
            </button>
            <span className="text-sm font-medium min-w-[110px] sm:min-w-[140px] text-center">
              {view === 'week' ? formatWeekRange(weekStart) : formatMonth(currentMonth)}
            </span>
            <button
              onClick={() => (view === 'week' ? setWeekStart(getNextWeek(weekStart)) : goToNextMonth())}
              aria-label={view === 'week' ? 'Next week' : 'Next month'}
              className="px-3 py-2 min-w-[44px] min-h-[44px] text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Period loading / error states */}
      {loadingPeriod && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center text-slate-500" aria-live="polite">
          Loading…
        </div>
      )}
      {periodError && !loadingPeriod && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl p-4 text-sm">
          {periodError}
        </div>
      )}

      {/* Week View */}
      {view === 'week' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  This Week
                </span>
                {weeklyProgress ? (
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {weeklyProgress.earned}{' '}
                    <span className="text-base font-normal text-slate-400">/ {weeklyProgress.max}</span>
                  </div>
                ) : (
                  !loadingPeriod && <p className="text-sm text-slate-500 mt-1">No data for this week yet.</p>
                )}
              </div>
              {weeklyProgress && (
                <div className={`text-2xl font-extrabold ${getScoreColor(weeklyProgress.percentage)}`}>
                  {weeklyProgress.percentage}%
                </div>
              )}
            </div>
          </div>

          {weeklyProgress && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Daily Breakdown</h2>
              <div className="grid grid-cols-7 gap-2 text-center">
                {weeklyProgress.dailyBreakdown.map((day) => {
                  const label = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
                  const isFuture = day.date > getLocalDateString()
                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => openDayDetail(day.date)}
                      aria-label={`View details for ${day.date}`}
                      className={`p-2 rounded-lg border min-h-[44px] transition-colors ${
                        isFuture
                          ? 'bg-transparent border-dashed border-slate-200 dark:border-slate-800'
                          : day.hasScheduledTasks && day.percentage >= 100
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
                      }`}
                    >
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                        {!isFuture && day.hasScheduledTasks ? `${day.percentage}%` : '–'}
                      </div>
                      {!isFuture && day.hasScheduledTasks && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {day.earned}/{day.max}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      {view === 'month' && (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Average Score */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Avg Score
          </p>
          <p className={`text-3xl font-black mt-2 ${getScoreColor(monthlyProgress.averageScore)}`}>
            {monthlyProgress.averageScore}%
          </p>
        </div>

        {/* Best Day */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Best Day
          </p>
          {monthlyProgress.bestDay ? (
            <>
              <p className={`text-3xl font-black mt-2 ${getScoreColor(monthlyProgress.bestDay.percentage)}`}>
                {monthlyProgress.bestDay.percentage}%
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {new Date(monthlyProgress.bestDay.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </>
          ) : (
            <p className="text-slate-400 text-sm mt-2">No data</p>
          )}
        </div>

        {/* Total Points */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Points
          </p>
          <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-2">
            {monthlyProgress.totalPoints}
          </p>
        </div>

        {/* Completion Rate */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Completion
          </p>
          <p className={`text-3xl font-black mt-2 ${getScoreColor(monthlyProgress.completionRate)}`}>
            {monthlyProgress.completionRate}%
          </p>
        </div>
      </div>
      )}

      {/* Score History Chart */}
      {view === 'month' && (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-bold mb-4">Score History</h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg">
                        <p className="text-sm font-semibold">{label}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Score: {data.score}%
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Earned: {data.earned}/{data.max} pts
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ fill: '#6366f1', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-slate-500">
            No score data available for this period
          </div>
        )}
      </div>
      )}

      {/* Activity Calendar */}
      {view === 'month' && (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-bold mb-4">Activity Calendar</h2>
        <div className="grid grid-cols-7 gap-2">
          {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-2"
            >
              {day}
            </div>
          ))}
          {monthlyProgress.dailyScores.map((day) => (
            <button
              key={day.date}
              type="button"
              onClick={() => openDayDetail(day.date)}
              aria-label={`View details for ${day.date}: ${day.hasScheduledTasks ? `${day.percentage}%` : 'no scheduled tasks'}`}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs cursor-pointer hover:opacity-80 transition-opacity min-h-[44px] ${getCalendarColor(
                day.hasScheduledTasks ? day.percentage : null
              )}`}
              title={`${day.date}: ${day.percentage}%`}
            >
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {new Date(day.date).getDate()}
              </span>
              {day.hasScheduledTasks && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {day.percentage}%
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-700"></span>
            No data
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-orange-500"></span>
            0-20%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-yellow-500"></span>
            21-40%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-blue-500"></span>
            41-60%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-500"></span>
            81-100%
          </span>
        </div>
      </div>
      )}

      {/* Consistency */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-bold mb-1">Consistency</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Perfect-score days this period · a day counts when every scheduled task is done
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Current Streak
            </p>
            <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-2">
              {streaks.currentStreak}
              <span className="text-sm font-medium text-slate-400"> {streaks.currentStreak === 1 ? 'day' : 'days'}</span>
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Best Streak
            </p>
            <p className="text-3xl font-black mt-2">
              {streaks.bestStreak}
              <span className="text-sm font-medium text-slate-400"> {streaks.bestStreak === 1 ? 'day' : 'days'}</span>
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Consistency
            </p>
            <p className={`text-3xl font-black mt-2 ${getScoreColor(streaks.consistencyRate)}`}>
              {streaks.consistencyRate}%
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {streaks.successfulDays} of {streaks.scheduledDays} days perfect
            </p>
          </div>
        </div>
      </div>

      {/* Task Performance */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-bold mb-1">Task Performance</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Weakest first · {view === 'week' ? 'this week' : formatMonth(currentMonth)}
        </p>
        {taskPerformance.length > 0 ? (
          <ul className="space-y-3">
            {taskPerformance.map((t) => {
              const available = t.scheduledOccurrences * t.points
              return (
                <li
                  key={t.taskId}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium text-sm text-slate-900 dark:text-white truncate">
                        {t.title}
                      </span>
                      <span className={`text-sm font-bold shrink-0 ${getScoreColor(t.completionRate)}`}>
                        {t.completionRate}%
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 mt-2"
                      role="progressbar"
                      aria-valuenow={t.completionRate}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${t.title} completion rate`}
                    >
                      <div
                        className={`h-1.5 rounded-full ${barColor(t.completionRate)}`}
                        style={{ width: `${t.completionRate}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                      {t.completedOccurrences} of {t.scheduledOccurrences} completed
                      {' · '}{t.pointsEarned}/{available} pts
                      {t.category ? ` · ${t.category}` : ''}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No task performance data yet.</p>
        )}
      </div>

      {/* Category Performance */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-bold mb-1">Category Performance</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Weakest first · {view === 'week' ? 'this week' : formatMonth(currentMonth)}
        </p>
        {categoryPerformance.length > 0 ? (
          <ul className="space-y-3">
            {categoryPerformance.map((c) => (
              <li
                key={c.category}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-sm text-slate-900 dark:text-white truncate">
                      {c.category}
                    </span>
                    <span className={`text-sm font-bold shrink-0 ${getScoreColor(c.completionRate)}`}>
                      {c.completionRate}%
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 mt-2"
                    role="progressbar"
                    aria-valuenow={c.completionRate}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${c.category} completion rate`}
                  >
                    <div
                      className={`h-1.5 rounded-full ${barColor(c.completionRate)}`}
                      style={{ width: `${c.completionRate}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    {c.completedOccurrences} of {c.scheduledOccurrences} completed
                    {' · '}{c.pointsEarned} pts earned
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No categorized tasks yet.</p>
        )}
      </div>

      {/* Missed */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-bold mb-1">Missed</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Scheduled, passed, not completed · {view === 'week' ? 'this week' : formatMonth(currentMonth)}
        </p>
        {missed.length > 0 ? (
          <>
            <ul className="space-y-2">
              {missed.slice(0, 10).map((m) => (
                <li
                  key={`${m.taskId}:${m.occurrenceDate}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-sm text-slate-700 dark:text-slate-300 truncate">
                      {m.taskTitle}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {formatMissedDate(m.occurrenceDate)}
                      {m.category ? ` · ${m.category}` : ''}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                    {m.points} pts
                  </span>
                </li>
              ))}
            </ul>
            {missed.length > 10 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                +{missed.length - 10} more missed in this period
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No missed tasks in this period.</p>
        )}
      </div>

      {/* Trend Indicator */}
      {view === 'month' && trend.previous && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4">Monthly Trend</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Avg Score
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-2xl font-black">{trend.current.averageScore}%</span>
                {trend.averageScoreChange !== null && (
                  <span
                    className={`text-sm font-medium ${
                      trend.averageScoreChange > 0
                        ? 'text-emerald-500'
                        : trend.averageScoreChange < 0
                        ? 'text-red-500'
                        : 'text-slate-500'
                    }`}
                  >
                    {trend.averageScoreChange > 0 ? '↑' : '↓'}{' '}
                    {Math.abs(trend.averageScoreChange)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                vs last month: {trend.previous.averageScore}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Completion
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-2xl font-black">{trend.current.completionRate}%</span>
                {trend.completionRateChange !== null && (
                  <span
                    className={`text-sm font-medium ${
                      trend.completionRateChange > 0
                        ? 'text-emerald-500'
                        : trend.completionRateChange < 0
                        ? 'text-red-500'
                        : 'text-slate-500'
                    }`}
                  >
                    {trend.completionRateChange > 0 ? '↑' : '↓'}{' '}
                    {Math.abs(trend.completionRateChange)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                vs last month: {trend.previous.completionRate}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Points
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-2xl font-black">{trend.current.totalPoints}</span>
                {trend.pointsChange !== null && (
                  <span
                    className={`text-sm font-medium ${
                      trend.pointsChange > 0
                        ? 'text-emerald-500'
                        : trend.pointsChange < 0
                        ? 'text-red-500'
                        : 'text-slate-500'
                    }`}
                  >
                    {trend.pointsChange > 0 ? '↑' : '↓'}{' '}
                    {Math.abs(trend.pointsChange)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                vs last month: {trend.previous.totalPoints}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {monthlyProgress.dailyScores.length === 0 && (
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-12 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
            Your history starts here
          </p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
            Complete your first task to begin tracking your progress
          </p>
        </div>
      )}

      {/* Day Detail Modal */}
      {showDayDetail && selectedDay && (
        <DayDetailModal
          date={selectedDay}
          onClose={() => {
            setShowDayDetail(false)
            setSelectedDay(null)
          }}
        />
      )}
    </div>
  )
}
