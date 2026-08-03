/**
 * EMA medicines Excel dump search (tier B free download, cached).
 * GET ?q=adalimumab&biosimilar=1
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchEmaBulkByName } from '@/lib/api/emaMedicinesBulk'
import { freeApiAgent } from '@/lib/api/freeApiAgent'
import { runWithApiAbort } from '@/lib/api/apiAbort'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || ''
  const biosimilarOnly =
    request.nextUrl.searchParams.get('biosimilar') === '1' ||
    request.nextUrl.searchParams.get('biosimilar') === 'true'
  const limitRaw = request.nextUrl.searchParams.get('limit')
  const limit = limitRaw ? Math.min(100, Math.max(1, parseInt(limitRaw, 10) || 30)) : 30
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
        source: 'ema-bulk',
        empty: null as Awaited<ReturnType<typeof searchEmaBulkByName>> | null,
        timeoutMs: 16_000,
        hasData: (d) => d != null && Array.isArray(d.products) && d.products.length > 0,
        run: async () => searchEmaBulkByName(q, { limit, biosimilarOnly }),
      }),
    [request.signal],
  )

  if (!agent.data) {
    return NextResponse.json({
      ok: false,
      query: q,
      biosimilarOnly,
      meta: null,
      count: 0,
      products: [],
      note: 'EMA official medicines Excel dump — not clinical decision support.',
      _agentStatus: agent.status,
      _agentMs: agent.ms,
      _partial: true,
      _timeout: agent.status === 'timeout',
      _error: agent.error,
    })
  }

  return NextResponse.json({
    ok: true,
    query: q,
    biosimilarOnly,
    meta: agent.data.meta,
    count: agent.data.products.length,
    products: agent.data.products,
    note: 'EMA official medicines Excel dump — not clinical decision support.',
    _agentStatus: agent.status,
    _agentMs: agent.ms,
  })
}
