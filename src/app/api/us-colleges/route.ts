/**
 * US College Scorecard search (free Dept of Ed API via api.data.gov).
 * GET ?q=harvard
 * Optional free key: DATA_GOV_API_KEY (defaults to DEMO_KEY).
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchUsCollegesByName } from '@/lib/api/collegeScorecard'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || ''
  const limitRaw = request.nextUrl.searchParams.get('limit')
  const limit = limitRaw ? Math.min(50, Math.max(1, parseInt(limitRaw, 10) || 15)) : 15
  if (q.length < 2) {
    return NextResponse.json(
      { ok: false, error: 'Query q required (min 2 chars)' },
      { status: 400 },
    )
  }
  try {
    const colleges = await searchUsCollegesByName(q, limit)
    return NextResponse.json({
      ok: true,
      query: q,
      count: colleges.length,
      colleges,
      note: 'College Scorecard public data — not admissions advice. Free api.data.gov key optional (DEMO_KEY default).',
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    )
  }
}
