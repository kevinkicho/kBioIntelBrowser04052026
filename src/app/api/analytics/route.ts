import { NextRequest, NextResponse } from 'next/server'
import { recordMetric } from '@/lib/analytics/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { source, endpoint, status, duration_ms, error, has_data, items_count } = body

    if (!source || !endpoint || status === undefined || duration_ms === undefined) {
      return NextResponse.json({ error: 'Missing required fields: source, endpoint, status, duration_ms' }, { status: 400 })
    }

    recordMetric({
      source,
      endpoint,
      status: Number(status),
      duration_ms: Number(duration_ms),
      error: error ?? undefined,
      has_data: has_data !== false,
      items_count: items_count ?? undefined,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}