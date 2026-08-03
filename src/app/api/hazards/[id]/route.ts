import { NextRequest, NextResponse } from 'next/server'
import { getGhsHazardsByCid } from '@/lib/api/pubchem-hazards'
import { freeApiAgent } from '@/lib/api/freeApiAgent'
import { runWithApiAbort } from '@/lib/api/apiAbort'
import { isTimeoutError } from '@/lib/utils'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid) || cid < 1) {
    return NextResponse.json({ error: 'Invalid molecule ID' }, { status: 400 })
  }

  const ac = new AbortController()
  try {
    const result = await runWithApiAbort(
      ac,
      () =>
        freeApiAgent({
          source: 'hazards',
          empty: null as Awaited<ReturnType<typeof getGhsHazardsByCid>>,
          timeoutMs: 12_000,
          run: async () => getGhsHazardsByCid(cid),
        }),
      [request.signal],
    )
    return NextResponse.json({
      hazards: result.data,
      ...(result.status === 'timeout' || result.status === 'error'
        ? { _partial: true, _timeout: result.status === 'timeout', _error: result.error }
        : {}),
      _agentStatus: result.status,
      _agentMs: result.ms,
    })
  } catch (err) {
    return NextResponse.json({
      hazards: [],
      _partial: true,
      _timeout: isTimeoutError(err),
      _error: err instanceof Error ? err.message : 'error',
    })
  }
}
