import { NextRequest, NextResponse } from 'next/server'
import { getAxis } from '@/lib/hypothesis/axes'
import { intersectMatches } from '@/lib/hypothesis/intersect'
import type { Filter } from '@/lib/hypothesis/types'

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

  try {
    const perFilterMatches = await Promise.all(
      filters.map(async f => {
        const axis = getAxis(f.axis)!
        return axis.find(f.value)
      }),
    )

    const intersected = intersectMatches(perFilterMatches).slice(0, MAX_RESULTS)
    return NextResponse.json({
      filters,
      perFilterCounts: perFilterMatches.map(m => m.length),
      matches: intersected,
    })
  } catch (error) {
    console.error('[api/hypothesis] Error:', error)
    return NextResponse.json(
      {
        error: 'Hypothesis evaluation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
