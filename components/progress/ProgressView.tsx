'use client'

import { useState } from 'react'
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
} from '@/lib/progress'

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

interface ProgressViewProps {
  initialData: {
    currentMonth: string
    view: 'week' | 'month'
    monthlyProgress: MonthlyProgress
    trend: TrendData
  }
}

export default function ProgressView({
  initialData,
}: ProgressViewProps) {
  const [currentMonth, setCurrentMonth] = useState(initialData.currentMonth)
  const [view, setView] = useState<'week' | 'month'>(initialData.view)

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

  const handleViewChange = (newView: 'week' | 'month') => {
    setView(newView)
  }

  const { monthlyProgress, trend } = initialData

  // Format data for chart
  const chartData = monthlyProgress.dailyScores
    .filter((d) => d.hasScheduledTasks)
    .map((d) => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: d.percentage,
      earned: d.earned,
      max: d.max,
    }))

  const getScoreColor = (percentage: number) => {
    if (percentage >= 81) return 'text-emerald-500'
    if (percentage >= 61) return 'text-blue-500'
    if (percentage >= 41) return 'text-yellow-500'
    if (percentage > 0) return 'text-orange-500'
    return 'text-slate-400'
  }

  const getCalendarColor = (percentage: number | null) => {
    if (percentage === null) return 'bg-slate-100 dark:bg-slate-800'
    if (percentage >= 81) return 'bg-emerald-500'
    if (percentage >= 61) return 'bg-blue-500'
    if (percentage >= 41) return 'bg-yellow-500'
    if (percentage > 0) return 'bg-orange-500'
    return 'bg-slate-200 dark:bg-slate-700'
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Progress</h1>
        <div className="flex items-center gap-4">
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
              onClick={goToPreviousMonth}
              className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              &lt;
            </button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {formatMonth(currentMonth)}
            </span>
            <button
              onClick={goToNextMonth}
              className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
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

      {/* Score History Chart */}
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

      {/* Activity Calendar */}
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
            <div
              key={day.date}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs cursor-pointer hover:opacity-80 transition-opacity ${getCalendarColor(
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
            </div>
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

      {/* Trend Indicator */}
      {trend.previous && (
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
    </div>
  )
}