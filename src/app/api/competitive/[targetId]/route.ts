import { NextRequest, NextResponse } from 'next/server'
import { getRelatedCompoundsByTarget } from '@/lib/api/chembl'
import { getCached, setCache } from '@/lib/cache'
import type { RelatedCompound } from '@/lib/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: { targetId: string } }
) {
  const targetId = params.targetId
  if (!targetId) {
    return NextResponse.json({ error: 'Missing target ID' }, { status: 400 })
  }

  const cacheKey = `competitive:${targetId}`
  const cached = getCached<RelatedCompound[]>(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }

  try {
    const data = await getRelatedCompoundsByTarget(targetId)
    setCache(cacheKey, data, 86400000) // 24h cache
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch related compounds' }, { status: 500 })
  }
}
