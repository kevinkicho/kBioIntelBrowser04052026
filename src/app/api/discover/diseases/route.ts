/**
 * Thin disease-search wrapper for staged discover APIs (design §5.1.4).
 * GET /api/discover/diseases?q=&limit=
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchDiseases } from '@/lib/diseaseSearch'

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

  try {
    const diseases = await searchDiseases(query, limit)
    return NextResponse.json({
      query,
      diseases,
      generatedAt,
      warnings:
        diseases.length === 0
          ? ['No disease matches.']
          : ([
              // Document OT decontamination for clients that inspect disease.molecules
              ...(diseases.some((d) => d.source === 'Open Targets')
                ? [
                    'Open Targets results do not attach getDrugsForDisease target names as molecules (PR3a decontamination; knownDrugs in PR3b).',
                  ]
                : []),
            ] as string[]),
    })
  } catch (error) {
    console.error('[api/discover/diseases] Error:', error)
    return NextResponse.json(
      {
        error: 'Disease search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        generatedAt,
      },
      { status: 500 },
    )
  }
}
