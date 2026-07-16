import { NextRequest, NextResponse } from 'next/server'
import {
  rankCandidatesForDisease,
  UnknownDiseaseIdError,
} from '@/lib/candidateRanker'

const MAX_LIMIT = 25
const MIN_QUERY_LENGTH = 2

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  const diseaseIdParam = request.nextUrl.searchParams.get('diseaseId')
  const diseaseId = diseaseIdParam?.trim() || undefined
  const limitParam = request.nextUrl.searchParams.get('limit')
  const limit = Math.min(Math.max(parseInt(limitParam ?? '15', 10) || 15, 1), MAX_LIMIT)

  const query = (q?.trim() || diseaseId || '').trim()

  // 400 if neither q nor diseaseId (design §5.1.5)
  if (!query || (query.length < MIN_QUERY_LENGTH && !diseaseId)) {
    return NextResponse.json(
      { error: `Provide q (min ${MIN_QUERY_LENGTH} chars) and/or diseaseId` },
      { status: 400 },
    )
  }

  if (q && q.trim().length > 0 && q.trim().length < MIN_QUERY_LENGTH && !diseaseId) {
    return NextResponse.json(
      { error: `Query must be at least ${MIN_QUERY_LENGTH} characters` },
      { status: 400 },
    )
  }

  try {
    const result = await rankCandidatesForDisease(query, limit, {
      diseaseId,
    })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof UnknownDiseaseIdError) {
      return NextResponse.json(
        {
          error: 'Unknown diseaseId',
          message: error.message,
          diseaseId: error.diseaseId,
        },
        { status: 404 },
      )
    }
    console.error('[api/discover/rank] Error:', error)
    return NextResponse.json(
      {
        error: 'Candidate ranking failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
