import { NextRequest, NextResponse } from 'next/server'
import { getSimilarMolecules } from '@/lib/api/pubchem-similar'
import { getCached, setCache } from '@/lib/cache'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const cacheKey = `similar:${cid}`
  const cached = getCached<unknown>(cacheKey)
  if (cached) return NextResponse.json(cached)

  const molecules = await getSimilarMolecules(cid)
  setCache(cacheKey, molecules)
  return NextResponse.json(molecules)
}
