import { NextRequest, NextResponse } from 'next/server'
import { runServerSimilarityExpand } from '@/lib/pipeline/similarityExpandPipeline'
import { logApiOutcome, startApiTimer } from '@/lib/serverLog'
import { freeApiAgent } from '@/lib/api/freeApiAgent'
import { runWithApiAbort } from '@/lib/api/apiAbort'

/**
 * POST { seedCid: number, max?: number }
 * Expands a promoted seed to PubChem 2D-similar neighbors for board add.
 * Staged reliability: freeApiAgent hard wall so App Hosting never hangs.
 */
export async function POST(request: NextRequest) {
  const timer = startApiTimer()
  const body = await request.json().catch(() => ({}))
  const seedCid = Number(body.seedCid)
  if (!Number.isFinite(seedCid) || seedCid < 1) {
    return NextResponse.json({ error: 'seedCid must be a positive number' }, { status: 400 })
  }
  const max = Math.min(10, Math.max(1, Number(body.max) || 5))

  const ac = new AbortController()
  const agent = await runWithApiAbort(
    ac,
    () =>
      freeApiAgent({
        source: 'discover-similarity',
        empty: null as Awaited<ReturnType<typeof runServerSimilarityExpand>> | null,
        timeoutMs: 16_000,
        hasData: (d) => d != null && Array.isArray(d.neighbors) && d.neighbors.length > 0,
        run: async () => runServerSimilarityExpand(seedCid, max),
      }),
    [request.signal],
  )

  if (!agent.data) {
    logApiOutcome({
      route: '/api/discover/similarity',
      method: 'POST',
      status: 200,
      ms: timer.ms(),
      count: 0,
      error: agent.error?.slice(0, 200),
    })
    return NextResponse.json({
      seedCid,
      neighbors: [],
      raw: null,
      pipeline: { ok: false, degraded: true, stages: [] },
      _partial: true,
      _timeout: agent.status === 'timeout',
      _error: agent.error,
      _agentStatus: agent.status,
      _agentMs: agent.ms,
    })
  }

  const result = agent.data
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
    _agentStatus: agent.status,
    _agentMs: agent.ms,
  })
}
