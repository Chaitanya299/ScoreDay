import { NextResponse } from 'next/server'
import { getDashboardData } from '@/lib/scoring'
import { isValidDateString } from '@/lib/dates'

/**
 * GET /api/dashboard[?date=YYYY-MM-DD]
 * Returns the complete dashboard data for the Today screen. With a `date` query
 * it returns that day's scoreboard instead of today's, so past days can be
 * reviewed and back-filled. Invalid dates fall back to today.
 * This is the single authoritative endpoint for the native Today screen.
 */
export async function GET(request: Request) {
  try {
    const dateParam = new URL(request.url).searchParams.get('date')
    const date = isValidDateString(dateParam) ? dateParam : undefined
    const data = await getDashboardData(date)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 })
  }
}
