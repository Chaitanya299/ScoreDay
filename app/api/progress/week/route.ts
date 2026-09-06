import { NextResponse } from 'next/server'
import { getWeeklyProgress, getWeekRange } from '@/lib/progress'
import { getStreakData } from '@/lib/streaks'

/**
 * Weekly progress bundle for the Progress page week view.
 * Query: ?weekStart=YYYY-MM-DD (any date; normalized to its Monday)
 * Weekly score is total earned / total available across Mon-Sun — never an
 * average of daily percentages.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const weekStart = searchParams.get('weekStart')

    if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return NextResponse.json(
        { error: 'Valid weekStart (YYYY-MM-DD) is required' },
        { status: 400 }
      )
    }

    const range = getWeekRange(weekStart)
    const [weeklyProgress, streaks] = await Promise.all([
      getWeeklyProgress(range.start),
      getStreakData(range.start, range.end),
    ])

    return NextResponse.json({ weeklyProgress, streaks })
  } catch {
    return NextResponse.json({ error: 'Failed to load weekly progress' }, { status: 500 })
  }
}
