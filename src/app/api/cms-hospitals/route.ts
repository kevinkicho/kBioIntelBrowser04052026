/**
 * CMS Hospital General Information keyword search (free public datastore).
 * GET ?q=mayo
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchCmsHospitalsByName } from '@/lib/api/cmsHospitals'
import { freeApiAgent } from '@/lib/api/freeApiAgent'
import { runWithApiAbort } from '@/lib/api/apiAbort'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || ''
  const limitRaw = request.nextUrl.searchParams.get('limit')
  const limit = limitRaw ? Math.min(50, Math.max(1, parseInt(limitRaw, 10) || 20)) : 20
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
        source: 'cms-hospitals',
        empty: [] as Awaited<ReturnType<typeof searchCmsHospitalsByName>>,
        timeoutMs: 14_000,
        run: async () => searchCmsHospitalsByName(q, limit),
      }),
    [request.signal],
  )

  return NextResponse.json({
    ok: agent.status === 'loaded' || agent.status === 'empty',
    query: q,
    count: agent.data.length,
    hospitals: agent.data,
    note: 'CMS Medicare hospital registry — not a treatment recommendation.',
    _agentStatus: agent.status,
    _agentMs: agent.ms,
    ...(agent.status === 'timeout' || agent.status === 'error'
      ? { _partial: true, _timeout: agent.status === 'timeout', _error: agent.error }
      : {}),
  })
}
