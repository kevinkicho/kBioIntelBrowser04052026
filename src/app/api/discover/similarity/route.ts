import { NextRequest, NextResponse } from 'next/server'
import { runServerSimilarityExpand } from '@/lib/pipeline/similarityExpandPipeline'
import { logApiOutcome, startApiTimer } from '@/lib/serverLog'

/**
 * POST { seedCid: number, max?: number }
 * Expands a promoted seed to PubChem 2D-similar neighbors for board add.
 * Staged reliability: timeout + one retry on upstream flakiness.
 */
export async function POST(request: NextRequest) {
  const timer = startApiTimer()
  const body = await request.json().catch(() => ({}))
  const seedCid = Number(body.seedCid)
  if (!Number.isFinite(seedCid) || seedCid < 1) {
    return NextResponse.json({ error: 'seedCid must be a positive number' }, { status: 400 })
  }
  const max = Math.min(10, Math.max(1, Number(body.max) || 5))
  try {
    const result = await runServerSimilarityExpand(seedCid, max)
    logApiOutcome({
      route: '/api/discover/similarity',
      method: 'POST',
      status: 200,
      ms: timer.ms(),
      count: result.neighbors.length,
    })
    return NextResponse.json({
      seedCid: result.seedCid,
      neighbors: result.neighbors,
      raw: result.raw,
      pipeline: {
        ok: result.pipeline.ok,
        degraded: result.pipeline.degraded,
        stages: result.pipeline.stages.map((s) => ({
          id: s.id,
          status: s.status,
          ms: s.ms,
        })),
      },
    })
  } catch (err) {
    logApiOutcome({
      route: '/api/discover/similarity',
      method: 'POST',
      status: 500,
      ms: timer.ms(),
      error: err instanceof Error ? err.message.slice(0, 200) : 'expand failed',
    })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Similarity expand failed' },
      { status: 500 },
    )
  }
}
