import { NextRequest, NextResponse } from 'next/server'
import { expandSimilarCandidates } from '@/lib/discovery/similarityExpand'

/**
 * POST { seedCid: number, max?: number }
 * Expands a promoted seed to PubChem 2D-similar neighbors for board add.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const seedCid = Number(body.seedCid)
  if (!Number.isFinite(seedCid) || seedCid < 1) {
    return NextResponse.json({ error: 'seedCid must be a positive number' }, { status: 400 })
  }
  const max = Math.min(10, Math.max(1, Number(body.max) || 5))
  try {
    const result = await expandSimilarCandidates(seedCid, { max })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Similarity expand failed' },
      { status: 500 },
    )
  }
}
