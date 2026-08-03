/**
 * FDA Purple Book monthly CSV search (tier B free download, cached).
 * GET ?q=adalimumab
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchPurpleBookByName } from '@/lib/api/purpleBookCache'
import { freeApiAgent } from '@/lib/api/freeApiAgent'
import { runWithApiAbort } from '@/lib/api/apiAbort'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || ''
  const limitRaw = request.nextUrl.searchParams.get('limit')
  const limit = limitRaw ? Math.min(100, Math.max(1, parseInt(limitRaw, 10) || 40)) : 40
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
        source: 'purple-book',
        empty: null as Awaited<ReturnType<typeof searchPurpleBookByName>> | null,
        timeoutMs: 14_000,
        hasData: (d) => d != null && Array.isArray(d.products) && d.products.length > 0,
        run: async () => searchPurpleBookByName(q, limit),
      }),
    [request.signal],
  )

  if (!agent.data) {
    return NextResponse.json({
      ok: false,
      query: q,
      meta: null,
      count: 0,
      products: [],
      note: 'FDA Purple Book monthly public CSV — not clinical decision support.',
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
    meta: agent.data.meta,
    count: agent.data.products.length,
    products: agent.data.products,
    note: 'FDA Purple Book monthly public CSV — not clinical decision support.',
    _agentStatus: agent.status,
    _agentMs: agent.ms,
  })
}
