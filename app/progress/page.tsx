import Header from '@/components/ui/Header'
import ProgressView from '@/components/progress/ProgressView'
import {
  getMonthlyProgress,
  getTrendComparison,
  getMonthRange,
  getAllTaskPerformance,
  getCategoryPerformance,
  getMissedOccurrences,
} from '@/lib/progress'
import { getCurrentMonthIso } from '@/lib/progress'
import { getStreakData } from '@/lib/streaks'

export const revalidate = 0

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: 'week' | 'month' }>
}) {
  const { month, view = 'month' } = await searchParams
  const targetMonth = month || getCurrentMonthIso()
  const monthRange = getMonthRange(targetMonth)

  const [monthlyProgress, trend, streaks, taskPerformance, categoryPerformance, missed] =
    await Promise.all([
      getMonthlyProgress(targetMonth),
      getTrendComparison({
        start: targetMonth + '-01',
        end: new Date(new Date(targetMonth + '-01').setMonth(new Date(targetMonth + '-01').getMonth() + 1) - 1).toISOString().slice(0, 10),
      }),
      getStreakData(monthRange.start, monthRange.end),
      getAllTaskPerformance(monthRange),
      getCategoryPerformance(monthRange),
      getMissedOccurrences(monthRange),
    ])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <ProgressView
          initialData={{
            currentMonth: targetMonth,
            view,
            monthlyProgress,
            trend,
            streaks,
            taskPerformance,
            categoryPerformance,
            missed,
          }}
        />
      </main>
    </div>
  )
}
