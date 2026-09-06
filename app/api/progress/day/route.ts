import { NextResponse } from 'next/server'
import { getDayDetail } from '@/lib/progress'

/**
 * Day detail for the Progress page.
 * Query: ?date=YYYY-MM-DD
 * Returns score, earned/max points, completed tasks, missed scheduled tasks.
 * All calculations reuse the existing recurrence/scoring engines server-side.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Valid date (YYYY-MM-DD) is required' },
        { status: 400 }
      )
    }

    const detail = await getDayDetail(date)
    return NextResponse.json(detail)
  } catch {
    return NextResponse.json({ error: 'Failed to load day detail' }, { status: 500 })
  }
}
