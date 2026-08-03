/**
 * FDA Purple Book BPPT patent list search (public page, cached).
 * GET ?q=adalimumab
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchPurpleBookPatentsByName } from '@/lib/api/purpleBookPatents'
import { freeApiAgent } from '@/lib/api/freeApiAgent'
import { runWithApiAbort } from '@/lib/api/apiAbort'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || ''
  const limitRaw = request.nextUrl.searchParams.get('limit')
  const limit = limitRaw ? Math.min(150, Math.max(1, parseInt(limitRaw, 10) || 50)) : 50
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
        source: 'purple-book-patents',
        empty: null as Awaited<ReturnType<typeof searchPurpleBookPatentsByName>> | null,
        timeoutMs: 14_000,
        hasData: (d) => d != null && Array.isArray(d.patents) && d.patents.length > 0,
        run: async () => searchPurpleBookPatentsByName(q, limit),
      }),
    [request.signal],
  )

  if (!agent.data) {
    return NextResponse.json({
      ok: false,
      query: q,
      meta: null,
      count: 0,
      patents: [],
      note: 'FDA Purple Book BPPT patent list — ministerial publication; not legal advice.',
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
    count: agent.data.patents.length,
    patents: agent.data.patents,
    note: 'FDA Purple Book BPPT patent list — ministerial publication; not legal advice.',
    _agentStatus: agent.status,
    _agentMs: agent.ms,
  })
}
