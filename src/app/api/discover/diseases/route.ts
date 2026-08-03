/**
 * Thin disease-search wrapper for staged discover APIs (design §5.1.4).
 * GET /api/discover/diseases?q=&limit=
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchDiseases } from '@/lib/diseaseSearch'
import { freeApiAgent } from '@/lib/api/freeApiAgent'
import { runWithApiAbort } from '@/lib/api/apiAbort'

const MAX_LIMIT = 25
const MIN_QUERY_LENGTH = 2

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  const limitParam = request.nextUrl.searchParams.get('limit')
  const limit = Math.min(Math.max(parseInt(limitParam ?? '10', 10) || 10, 1), MAX_LIMIT)

  if (!q || q.trim().length < MIN_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Query must be at least ${MIN_QUERY_LENGTH} characters` },
      { status: 400 },
    )
  }

  const query = q.trim()
  const generatedAt = new Date().toISOString()

  const ac = new AbortController()
  const agent = await runWithApiAbort(
    ac,
    () =>
      freeApiAgent({
        source: 'discover-diseases',
        empty: [] as Awaited<ReturnType<typeof searchDiseases>>,
        timeoutMs: 14_000,
        run: async () => searchDiseases(query, limit),
      }),
    [request.signal],
  )

  const diseases = agent.data
  return NextResponse.json({
    query,
    diseases,
    generatedAt,
    warnings:
      diseases.length === 0
        ? ['No disease matches.']
        : ([
            ...(diseases.some(
              (d) => d.source === 'Open Targets' && (!d.molecules || d.molecules.length === 0),
            )
              ? [
                  'Open Targets known drugs may be empty for this hit (no drugAndClinicalCandidates rows or id unresolved).',
                ]
              : []),
          ] as string[]),
    _agentStatus: agent.status,
    _agentMs: agent.ms,
    ...(agent.status === 'timeout' || agent.status === 'error'
      ? { _partial: true, _timeout: agent.status === 'timeout', _error: agent.error }
      : {}),
  })
}
