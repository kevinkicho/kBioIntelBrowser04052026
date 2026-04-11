import { NextRequest, NextResponse } from 'next/server'
import { getSummary, getDailyTrend, getRecentErrors, purgeOldMetrics } from '@/lib/analytics/db'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const view = url.searchParams.get('view') || 'summary'
    const since = url.searchParams.get('since') || undefined

    purgeOldMetrics()

    switch (view) {
      case 'summary':
        return NextResponse.json(getSummary(since))
      case 'trend':
        return NextResponse.json(getDailyTrend(since || new Date(Date.now() - 30 * 86400000).toISOString()))
      case 'errors':
        return NextResponse.json(getRecentErrors(100))
      default:
        return NextResponse.json({ error: 'Unknown view' }, { status: 400 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}