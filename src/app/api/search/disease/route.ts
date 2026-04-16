import { NextRequest, NextResponse } from 'next/server'
import { searchDiseases, parseLimit } from '@/lib/diseaseSearch'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  const limitParam = request.nextUrl.searchParams.get('limit')
  const limit = parseLimit(limitParam)

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
  }

  const query = q.trim()

  try {
    const results = await searchDiseases(query, limit)
    return NextResponse.json({ results })
  } catch (error) {
    console.error('[api/search/disease] Error:', error)
    return NextResponse.json({ error: 'Disease search failed', message: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}