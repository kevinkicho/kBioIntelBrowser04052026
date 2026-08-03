import { NextRequest, NextResponse } from 'next/server'
import { searchDiseases, parseLimit } from '@/lib/diseaseSearch'
import { freeApiAgent } from '@/lib/api/freeApiAgent'
import { runWithApiAbort } from '@/lib/api/apiAbort'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  const limitParam = request.nextUrl.searchParams.get('limit')
  const limit = parseLimit(limitParam)

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
  }

  const query = q.trim()
  const ac = new AbortController()
  const agent = await runWithApiAbort(
    ac,
    () =>
      freeApiAgent({
        source: 'search-disease',
        empty: [] as Awaited<ReturnType<typeof searchDiseases>>,
        timeoutMs: 12_000,
        run: async () => searchDiseases(query, limit),
      }),
    [request.signal],
  )

  return NextResponse.json({
    results: agent.data,
    _agentStatus: agent.status,
    _agentMs: agent.ms,
    ...(agent.status === 'timeout' || agent.status === 'error'
      ? { _partial: true, _timeout: agent.status === 'timeout', _error: agent.error }
      : {}),
  })
}
