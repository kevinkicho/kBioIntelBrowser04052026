import { NextRequest, NextResponse } from 'next/server'
import { getPharosTdlBatch } from '@/lib/api/pharos'
import { freeApiAgent } from '@/lib/api/freeApiAgent'
import { runWithApiAbort } from '@/lib/api/apiAbort'

/**
 * GET /api/pharos/tdl?symbols=EGFR,BRAF
 * Returns { tdl: { EGFR: "Tclin", ... } } — free Pharos GraphQL only.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('symbols') ?? ''
  const symbols = raw
    .split(/[,+|]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20)

  if (symbols.length === 0) {
    return NextResponse.json({ tdl: {} })
  }

  const ac = new AbortController()
  const agent = await runWithApiAbort(
    ac,
    () =>
      freeApiAgent({
        source: 'pharos-tdl',
        empty: {} as Record<string, string>,
        timeoutMs: 12_000,
        hasData: (d) => Object.keys(d).length > 0,
        run: async () => getPharosTdlBatch(symbols, 3),
      }),
    [request.signal],
  )

  return NextResponse.json({
    tdl: agent.data,
    _agentStatus: agent.status,
    _agentMs: agent.ms,
    ...(agent.status === 'timeout' || agent.status === 'error'
      ? { _partial: true, _timeout: agent.status === 'timeout', _error: agent.error }
      : {}),
  })
}
