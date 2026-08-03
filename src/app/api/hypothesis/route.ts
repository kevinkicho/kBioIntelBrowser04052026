import { NextRequest, NextResponse } from 'next/server'
import { getAxis } from '@/lib/hypothesis/axes'
import { intersectMatches } from '@/lib/hypothesis/intersect'
import type { Filter } from '@/lib/hypothesis/types'
import { freeApiAgent } from '@/lib/api/freeApiAgent'
import { runWithApiAbort } from '@/lib/api/apiAbort'

const MAX_FILTERS = 3
const MAX_RESULTS = 200

interface HypothesisRequestBody {
  filters?: Filter[]
}

export async function POST(request: NextRequest) {
  let body: HypothesisRequestBody
  try {
    body = (await request.json()) as HypothesisRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const filters = body.filters ?? []
  if (filters.length < 2) {
    return NextResponse.json(
      { error: 'At least 2 filters are required' },
      { status: 400 },
    )
  }
  if (filters.length > MAX_FILTERS) {
    return NextResponse.json(
      { error: `At most ${MAX_FILTERS} filters are supported` },
      { status: 400 },
    )
  }

  // Validate each filter has a known axis and a non-empty value.
  for (const f of filters) {
    const axis = getAxis(f.axis)
    if (!axis) {
      return NextResponse.json({ error: `Unknown filter axis: ${f.axis}` }, { status: 400 })
    }
    if (!f.value || typeof f.value !== 'string' || !f.value.trim()) {
      return NextResponse.json(
        { error: `Filter "${axis.label}" requires a value` },
        { status: 400 },
      )
    }
  }

  const ac = new AbortController()
  const agent = await runWithApiAbort(
    ac,
    () =>
      freeApiAgent({
        source: 'hypothesis',
        empty: {
          filters,
          perFilterCounts: [] as number[],
          matches: [] as ReturnType<typeof intersectMatches>,
        },
        timeoutMs: 16_000,
        hasData: (d) => Array.isArray(d.matches) && d.matches.length > 0,
        run: async () => {
          const perFilterMatches = await Promise.all(
            filters.map(async (f) => {
              const axis = getAxis(f.axis)!
              return axis.find(f.value)
            }),
          )
          const intersected = intersectMatches(perFilterMatches).slice(0, MAX_RESULTS)
          return {
            filters,
            perFilterCounts: perFilterMatches.map((m) => m.length),
            matches: intersected,
          }
        },
      }),
    [request.signal],
  )

  return NextResponse.json({
    ...agent.data,
    _agentStatus: agent.status,
    _agentMs: agent.ms,
    ...(agent.status === 'timeout' || agent.status === 'error'
      ? { _partial: true, _timeout: agent.status === 'timeout', _error: agent.error }
      : {}),
  })
}
