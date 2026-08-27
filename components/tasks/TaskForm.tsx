'use client'

import { useState, useEffect } from 'react'
import { WEEKDAY_SHORT, type RecurrenceType } from '@/lib/recurrence'
import { getLocalDateString } from '@/lib/dates'
import { COMMON_CATEGORIES } from '@/lib/categories'

interface TaskData {
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

interface TaskFormProps {
  initialData?: TaskData
  existingCategories?: string[]
  onSubmit: (data: TaskData) => Promise<void>
  onCancel: () => void
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]
const OTHER = '__other__'

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'DAILY', label: 'Every day' },
  { value: 'SPECIFIC_DAYS', label: 'Certain days' },
  { value: 'WEEKLY', label: 'Any day this week' },
  { value: 'ONE_TIME', label: 'One time' },
]

export default function TaskForm({ initialData, existingCategories = [], onSubmit, onCancel }: TaskFormProps) {
  const [formData, setFormData] = useState<TaskData>(
    initialData ?? {
      title: '',
      description: '',
      category: '',
      points: 10,
      recurrenceType: 'DAILY',
      daysOfWeek: [1, 3, 5],
      dueDate: '',
      active: true,
    }
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const categoryOptions = Array.from(new Set([...COMMON_CATEGORIES, ...existingCategories]))
  const isPresetCategory =
    formData.category === '' || categoryOptions.includes(formData.category)
  const [customCategoryMode, setCustomCategoryMode] = useState(!isPresetCategory)

  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
      setCustomCategoryMode(
        initialData.category !== '' && !categoryOptions.includes(initialData.category)
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData])

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!formData.title.trim()) e.title = 'Title is required'
    if (formData.points < 1 || formData.points > 10) e.points = 'Points must be 1-10'

    switch (formData.recurrenceType) {
      case 'SPECIFIC_DAYS':
        if (formData.daysOfWeek.length === 0) e.daysOfWeek = 'Select at least one day'
        break
      case 'ONE_TIME': {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.dueDate)) {
          e.dueDate = 'Pick a due date'
        } else if (formData.dueDate < getLocalDateString()) {
          e.dueDate = 'Due date cannot be in the past'
        }
        break
      }
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      await onSubmit(formData)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleDay = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day].sort(),
    }))
  }

  const inputClass = (field: string) =>
    `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
      errors[field] ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
    }`

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className={inputClass('title')}
          placeholder="Enter task title"
        />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
          className={inputClass('description')}
          placeholder="Optional description"
        />
      </div>

      {/* CATEGORY */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
        {customCategoryMode ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Side Project"
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                setCustomCategoryMode(false)
                setFormData((prev) => ({ ...prev, category: '' }))
              }}
              className="px-3 py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              Presets
            </button>
          </div>
        ) : (
          <select
            value={isPresetCategory ? formData.category : OTHER}
            onChange={(e) => {
              const value = e.target.value
              if (value === OTHER) {
                setCustomCategoryMode(true)
                setFormData((prev) => ({ ...prev, category: '' }))
              } else {
                setFormData({ ...formData, category: value })
              }
            }}
            className={`${inputClass('category')} bg-white dark:bg-slate-900`}
          >
            <option value="">No category</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value={OTHER}>Other...</option>
          </select>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Points *</label>
        <select
          value={formData.points}
          onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
          className={inputClass('points')}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        {errors.points && <p className="text-red-500 text-xs mt-1">{errors.points}</p>}
      </div>

      {/* WHEN? — 4 plain options */}
      <fieldset>
        <legend className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">When? *</legend>
        <div className="space-y-2">
          {RECURRENCE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                formData.recurrenceType === opt.value
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="recurrenceType"
                value={opt.value}
                checked={formData.recurrenceType === opt.value}
                onChange={() => setFormData({ ...formData, recurrenceType: opt.value })}
                className="h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
              />
              <span className={`text-sm font-medium ${formData.recurrenceType === opt.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {formData.recurrenceType === 'SPECIFIC_DAYS' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Repeat on *
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_DAYS.map((day) => {
              const selected = formData.daysOfWeek.includes(day)
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-3.5 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                    selected
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-400'
                  }`}
                >
                  {WEEKDAY_SHORT[day]}
                </button>
              )
            })}
          </div>
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={() => setFormData({ ...formData, daysOfWeek: [...ALL_DAYS] })} className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">Every day</button>
            <span className="text-xs text-slate-300 dark:text-slate-700">|</span>
            <button type="button" onClick={() => setFormData({ ...formData, daysOfWeek: [1, 2, 3, 4, 5] })} className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">Weekdays</button>
            <span className="text-xs text-slate-300 dark:text-slate-700">|</span>
            <button type="button" onClick={() => setFormData({ ...formData, daysOfWeek: [0, 6] })} className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">Weekends</button>
          </div>
          {errors.daysOfWeek && <p className="text-red-500 text-xs mt-1">{errors.daysOfWeek}</p>}
        </div>
      )}

      {formData.recurrenceType === 'WEEKLY' && (
        <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
          Complete this anytime during the week. One completion covers the whole week.
        </p>
      )}

      {formData.recurrenceType === 'ONE_TIME' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Due date *
          </label>
          <input
            type="date"
            value={formData.dueDate}
            min={getLocalDateString()}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            className={inputClass('dueDate')}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            The task appears only on this date.
          </p>
          {errors.dueDate && <p className="text-red-500 text-xs mt-1">{errors.dueDate}</p>}
        </div>
      )}

      <div className="flex items-center">
        <input
          type="checkbox"
          id="active"
          checked={formData.active}
          onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
          className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
        />
        <label htmlFor="active" className="ml-2 text-sm text-slate-700 dark:text-slate-300">
          Active
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {submitting ? 'Saving...' : initialData ? 'Update Task' : 'Create Task'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 px-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-semibold rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
