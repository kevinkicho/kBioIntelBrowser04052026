import { NextRequest, NextResponse } from 'next/server'
import { getSummary, getCategorizedSummary, getDailyTrend, getRecentErrors, getDetailedApiMetrics, purgeOldMetrics, getDbStatus } from '@/lib/analytics/db'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const view = url.searchParams.get('view') || 'summary'
    const since = url.searchParams.get('since') || undefined
    const source = url.searchParams.get('source') || undefined

    purgeOldMetrics()

    switch (view) {
      case 'summary':
        return NextResponse.json(getSummary(since))
      case 'categorized':
        return NextResponse.json(getCategorizedSummary(since))
      case 'detail':
        if (!source) return NextResponse.json({ error: 'Missing source param' }, { status: 400 })
        const detail = getDetailedApiMetrics(source, since)
        if (!detail) return NextResponse.json({ error: 'No data for source' }, { status: 404 })
        return NextResponse.json(detail)
      case 'trend':
        return NextResponse.json(getDailyTrend(since || new Date(Date.now() - 30 * 86400000).toISOString()))
      case 'errors':
        return NextResponse.json(getRecentErrors(100))
      case 'debug':
        return NextResponse.json(getDbStatus())
      default:
        return NextResponse.json({ error: 'Unknown view' }, { status: 400 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}