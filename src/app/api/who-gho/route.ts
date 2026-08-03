/**
 * WHO Global Health Observatory proxy (free public OData, no key).
 * Disease epidemiology context — not drug labels or clinical advice.
 * GET ?q=amyloidosis  → indicators + sample facts
 */

import { NextRequest, NextResponse } from 'next/server'
import { getWhoGhoContextForDisease } from '@/lib/api/whoGho'
import { freeApiAgent } from '@/lib/api/freeApiAgent'
import { runWithApiAbort } from '@/lib/api/apiAbort'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || ''
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
        source: 'who-gho',
        empty: null as Awaited<ReturnType<typeof getWhoGhoContextForDisease>> | null,
        timeoutMs: 12_000,
        run: async () => getWhoGhoContextForDisease(q),
      }),
    [request.signal],
  )

  if (!agent.data) {
    return NextResponse.json({
      ok: false,
      query: q,
      _agentStatus: agent.status,
      _agentMs: agent.ms,
      _partial: agent.status === 'timeout' || agent.status === 'error',
      _timeout: agent.status === 'timeout',
      _error: agent.error,
      error: agent.error ?? 'No WHO GHO context',
    })
  }

  return NextResponse.json({
    ok: true,
    query: q,
    ...agent.data,
    note: 'WHO GHO public OData — disease/population indicators only; not product authorization.',
    _agentStatus: agent.status,
    _agentMs: agent.ms,
  })
}
