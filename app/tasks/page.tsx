'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/ui/Header'
import TaskForm from '@/components/tasks/TaskForm'
import { parseDaysOfWeek, formatRecurrence, type RecurrenceType } from '@/lib/recurrence'

interface Task {
  id: string
  title: string
  description: string | null
  category: string | null
  points: number
  recurrenceType: string
  daysOfWeek: string
  dueDate: string | null
  active: boolean
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks')
      const data = await res.json()
      if (Array.isArray(data)) setTasks(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  // Categories already in use — surfaced as one-click options in the form.
  const existingCategories = Array.from(
    new Set(tasks.map((t) => t.category).filter((c): c is string => !!c))
  )

  const handleSubmit = async (data: TaskDataShape) => {
    const url = data.id ? `/api/tasks/${data.id}` : '/api/tasks'
    const method = data.id ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        daysOfWeek:
          data.recurrenceType === 'SPECIFIC_DAYS' ? data.daysOfWeek.join(',') : undefined,
        dueDate: data.recurrenceType === 'ONE_TIME' ? data.dueDate : undefined,
      }),
    })

    if (res.ok) {
      await fetchTasks()
      setIsAdding(false)
      setEditingTask(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Task Management</h1>
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors"
          >
            + Create Task
          </button>
        </div>

        {(isAdding || editingTask) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-xl my-8">
              <h2 className="text-xl font-bold mb-4">{editingTask ? 'Edit Task' : 'New Task'}</h2>
              <TaskForm
                existingCategories={existingCategories}
                initialData={editingTask ? toFormData(editingTask) : undefined}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setIsAdding(false)
                  setEditingTask(null)
                }}
              />
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-center text-slate-500">Loading tasks...</p>
        ) : tasks.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-800">
            <p className="text-slate-500 mb-4">No tasks found. Create one to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`p-5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 ${
                  !task.active ? 'opacity-50' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg">{task.title}</h3>
                  <button
                    onClick={() => setEditingTask(task)}
                    className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                  >
                    Edit
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {task.category && (
                    <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-medium">
                      {task.category}
                    </span>
                  )}
                  {!task.active && (
                    <span className="text-xs px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded font-medium">
                      Inactive
                    </span>
                  )}
                </div>
                {task.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                    {task.description}
                  </p>
                )}
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2">
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    +{task.points} pts
                  </span>
                  <span className="text-xs font-medium text-slate-400 truncate">
                    {formatRecurrence(task)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

interface TaskDataShape {
  id?: string
  title: string
  description: string
  category: string
  points: number
  recurrenceType: RecurrenceType
  daysOfWeek: number[]
  dueDate: string
  active: boolean
}

function toFormData(t: Task): TaskDataShape {
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? '',
    category: t.category ?? '',
    points: t.points,
    recurrenceType: t.recurrenceType as RecurrenceType,
    daysOfWeek: parseDaysOfWeek(t.daysOfWeek),
    dueDate: t.dueDate ?? '',
    active: t.active,
  }
}
