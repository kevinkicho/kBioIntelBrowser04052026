import { NextRequest, NextResponse } from 'next/server'
import { rankCandidatesForDisease } from '@/lib/candidateRanker'

const MAX_LIMIT = 25
const MIN_QUERY_LENGTH = 2

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  const limitParam = request.nextUrl.searchParams.get('limit')
  const limit = Math.min(Math.max(parseInt(limitParam ?? '15', 10) || 15, 1), MAX_LIMIT)

  if (!q || q.trim().length < MIN_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Query must be at least ${MIN_QUERY_LENGTH} characters` },
      { status: 400 }
    )
  }

  const query = q.trim()

  try {
    const result = await rankCandidatesForDisease(query, limit)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[api/discover/rank] Error:', error)
    return NextResponse.json(
      {
        error: 'Candidate ranking failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}