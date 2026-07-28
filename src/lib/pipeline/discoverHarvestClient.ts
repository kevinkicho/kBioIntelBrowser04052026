/**
 * Discover deferred safety/novelty harvest (client).
 * Used when harvestTiming is board/promote and user clicks “Load safety”.
 */

import { clientFetch } from '@/lib/clientFetch'
import type { ScoreRubric, ScoreVector } from '@/lib/domain/score'
import { newPipelineRun, runStage } from './runStage'
import type { PipelineReport } from './types'

export interface DiscoverHarvestCandidateIn {
  name: string
  candidateId?: string
  scores?: ScoreVector
  phaseNorm?: number | null
  clinicalStage?: number | null
}

export interface DiscoverHarvestResult {
  candidates: { name: string; scores: ScoreVector }[]
  warnings: string[]
  pipeline: PipelineReport
}

/**
 * POST /api/discover/harvest with retries and validation.
 */
export async function runDiscoverHarvestPipeline(input: {
  candidates: DiscoverHarvestCandidateIn[]
  rubric: ScoreRubric
  signal?: AbortSignal
}): Promise<DiscoverHarvestResult> {
  const run = newPipelineRun('discover-harvest')
  const signal = input.signal

  if (input.candidates.length === 0) {
    run.addStage({
      id: 'network_harvest',
      status: 'skipped',
      ms: 0,
      notes: ['empty candidate list'],
    })
    return { candidates: [], warnings: [], pipeline: run.finish(true, false) }
  }

  const body = {
    candidates: input.candidates.slice(0, 15),
    runSafety: true,
    runNovelty: true,
    rubric: input.rubric,
  }

  const { value: data, stage } = await runStage(
    {
      id: 'network_harvest',
      timeoutMs: 45_000,
      retries: 2,
      retryDelayMs: 800,
      signal,
    },
    async () => {
      const res = await clientFetch(
        '/api/discover/harvest',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal,
        },
        { retries: 0, timeoutMs: 40_000 },
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          (err as { error?: string; message?: string }).error ??
            (err as { message?: string }).message ??
            `Harvest failed (${res.status})`,
        )
      }
      return (await res.json()) as {
        candidates?: { name: string; scores: ScoreVector }[]
        warnings?: string[]
      }
    },
  )
  run.addStage(stage)

  if (!data) {
    const e = new Error(stage.error || 'Harvest failed')
    ;(e as Error & { pipeline?: PipelineReport }).pipeline = run.finish(false, false)
    throw e
  }

  const candidates = Array.isArray(data.candidates) ? data.candidates : []
  const { stage: valStage } = await runStage(
    { id: 'validate_harvest', timeoutMs: 500, signal },
    async () => {
      for (const c of candidates) {
        if (!c.name || !c.scores) throw new Error('Invalid harvest row')
      }
      return true
    },
  )
  run.addStage(valStage)

  return {
    candidates,
    warnings: data.warnings ?? [],
    pipeline: run.finish(true, false),
  }
}
