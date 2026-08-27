'use client'

import { useState } from 'react'
import { formatRecurrence, formatDueDate } from '@/lib/recurrence'

interface TaskItem {
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

interface WeeklyDay {
  label: string
  date: string
  earned: number
  max: number
  percentage: number
  isFuture: boolean
}

interface UpcomingTask {
  id: string
  title: string
  category: string | null
  points: number
  dueDate: string
}

interface DashboardProps {
  initialData: {
    targetDate: string
    earnedToday: number
    maxDaily: number
    dailyPercentage: number
    weeklyEarned: number
    weeklyMax: number
    weeklyPercentage: number
    completedCount: number
    incompleteCount: number
    streak: number
    taskList: TaskItem[]
    weeklyOverview: WeeklyDay[]
    upcomingList: UpcomingTask[]
  }
}

export default function DashboardView({ initialData }: DashboardProps) {
  const [data, setData] = useState(initialData)
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleComplete = async (taskId: string, points: number) => {
    setLoadingTaskId(taskId)
    setError(null)

    // Optimistic update
    setData((prev) => ({
      ...prev,
      earnedToday: prev.earnedToday + points,
      dailyPercentage:
        prev.maxDaily > 0 ? Math.min(100, Math.round(((prev.earnedToday + points) / prev.maxDaily) * 100)) : 0,
      weeklyEarned: prev.weeklyEarned + points,
      weeklyPercentage:
        prev.weeklyMax > 0
          ? Math.min(100, Math.round(((prev.weeklyEarned + points) / prev.weeklyMax) * 100))
          : 0,
      completedCount: prev.completedCount + 1,
      incompleteCount: Math.max(0, prev.incompleteCount - 1),
      taskList: prev.taskList.map((t) =>
        t.id === taskId
          ? { ...t, isCompleted: true, status: 'COMPLETED', completedThisOccurrence: true }
          : t
      ),
    }))

    try {
      const res = await fetch('/api/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, dateStr: data.targetDate }),
      })
      if (!res.ok) {
        throw new Error('Failed to save completion')
      }
    } catch {
      setError('Could not save. Please refresh and try again.')
      window.location.reload()
    } finally {
      setLoadingTaskId(null)
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* TODAY SCORE — only POINTS and SCORE% */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Today&apos;s Score
            </span>
            <div className="text-4xl font-extrabold text-slate-900 dark:text-white mt-1">
              {data.earnedToday} <span className="text-xl font-medium text-slate-400">/ {data.maxDaily}</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {data.completedCount} completed · {data.incompleteCount} remaining · 🔥 {data.streak} day streak
            </p>
          </div>
          <div className="text-center sm:text-right">
            <div className="text-5xl font-black text-indigo-600 dark:text-indigo-400">
              {data.dailyPercentage}%
            </div>
          </div>
        </div>
      </section>

      {/* DAILY TASK LIST */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Today&apos;s Tasks</h2>
        {data.taskList.length === 0 ? (
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center text-slate-500">
            No tasks for today. Create your first task to start scoring.
          </div>
        ) : (
          <div className="space-y-3">
            {data.taskList.map((task) => {
              const isWeeklyCompleted = task.recurrenceType === 'WEEKLY' && task.status === 'COMPLETED'
              return (
                <div
                  key={task.id}
                  className={`flex items-center justify-between gap-3 p-4 rounded-xl border transition-colors ${
                    task.status === 'COMPLETED'
                      ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-75'
                      : task.status === 'OVERDUE'
                        ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className={`font-semibold text-base ${task.status === 'COMPLETED' ? 'line-through text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                        {task.title}
                      </span>
                      {task.category && (
                        <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-medium">
                          {task.category}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      +{task.points} points · {formatRecurrence(task)}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {task.status === 'COMPLETED' ? (
                      <span className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {isWeeklyCompleted ? 'Completed this week' : '✓ Completed'}
                      </span>
                    ) : task.status === 'OVERDUE' ? (
                      <button
                        onClick={() => handleComplete(task.id, task.points)}
                        disabled={loadingTaskId === task.id}
                        className="text-xs font-semibold px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {loadingTaskId === task.id ? 'Saving...' : `Overdue · Complete +${task.points}`}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleComplete(task.id, task.points)}
                        disabled={loadingTaskId === task.id}
                        className="text-xs font-semibold px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {loadingTaskId === task.id ? 'Saving...' : `Complete +${task.points}`}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* COMING UP (one-time tasks in the next 7 days) */}
      {data.upcomingList.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Coming up
          </h2>
          <div className="space-y-2">
            {data.upcomingList.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-transparent"
              >
                <div className="min-w-0 flex items-center gap-2">
                  <span className="font-medium text-sm text-slate-700 dark:text-slate-300 truncate">
                    {task.title}
                  </span>
                  {task.category && (
                    <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-medium shrink-0">
                      {task.category}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                  {formatDueDate(task.dueDate)} · +{task.points} pts
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* WEEKLY SUMMARY */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              This Week
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {data.weeklyEarned} <span className="text-base font-normal text-slate-400">/ {data.weeklyMax}</span>
            </div>
          </div>
          <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {data.weeklyPercentage}%
          </div>
        </div>

        <div>
          <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">Weekly Overview</h3>
          <div className="grid grid-cols-7 gap-2 text-center">
            {data.weeklyOverview.map((day) => (
              <div
                key={day.date}
                className={`p-2 rounded-lg border ${
                  day.isFuture
                    ? 'bg-transparent border-dashed border-slate-200 dark:border-slate-800'
                    : day.percentage >= 100
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
                }`}
              >
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{day.label}</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {!day.isFuture && day.max > 0 ? `${day.percentage}%` : '--'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
