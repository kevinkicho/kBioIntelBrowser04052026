/**
 * US College Scorecard search (free Dept of Ed API via api.data.gov).
 * GET ?q=harvard
 * Optional free key: DATA_GOV_API_KEY (defaults to DEMO_KEY).
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchUsCollegesByName } from '@/lib/api/collegeScorecard'
import { freeApiAgent } from '@/lib/api/freeApiAgent'
import { runWithApiAbort } from '@/lib/api/apiAbort'

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

  const ac = new AbortController()
  const agent = await runWithApiAbort(
    ac,
    () =>
      freeApiAgent({
        source: 'us-colleges',
        empty: [] as Awaited<ReturnType<typeof searchUsCollegesByName>>,
        timeoutMs: 12_000,
        run: async () => searchUsCollegesByName(q, limit),
      }),
    [request.signal],
  )

  return NextResponse.json({
    ok: agent.status === 'loaded' || agent.status === 'empty',
    query: q,
    count: agent.data.length,
    colleges: agent.data,
    note: 'Scorecard primary; OpenAlex US education fallback (no key); Urban IPEDS enriches UNITID rows. Not admissions advice.',
    _agentStatus: agent.status,
    _agentMs: agent.ms,
    ...(agent.status === 'timeout' || agent.status === 'error'
      ? { _partial: true, _timeout: agent.status === 'timeout', _error: agent.error }
      : {}),
  })
}
