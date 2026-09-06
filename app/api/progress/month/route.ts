import { NextResponse } from 'next/server'
import {
  getMonthlyProgress,
  getTrendComparison,
  getMonthRange,
} from '@/lib/progress'
import { getStreakData } from '@/lib/streaks'

/**
 * Monthly progress bundle for the Progress page.
 * Query: ?month=YYYY-MM
 * All calculations run server-side and reuse the scoring/recurrence engines.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: 'Valid month (YYYY-MM) is required' },
        { status: 400 }
      )
    }

    const range = getMonthRange(month)
    const [monthlyProgress, trend, streaks] = await Promise.all([
      getMonthlyProgress(month),
      getTrendComparison(range),
      getStreakData(range.start, range.end),
    ])

    return NextResponse.json({ monthlyProgress, trend, streaks })
  } catch {
    return NextResponse.json({ error: 'Failed to load monthly progress' }, { status: 500 })
  }
}
