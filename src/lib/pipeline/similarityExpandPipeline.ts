/**
 * PubChem similarity expand — bounded, optional, never fails the parent rank.
 * Stages: select_seeds → expand_neighbors → attach
 */

import {
  expandRankShortlistBySimilarity,
  expandSimilarCandidates,
  RANK_SIMILARITY_NEIGHBORS,
  RANK_SIMILARITY_SCORE_PENALTY,
  RANK_SIMILARITY_SEED_MAX,
  type RankSimilarityExpandResult,
  type SimilarityExpandResult,
} from '@/lib/discovery/similarityExpand'
import type { CandidateMolecule } from '@/lib/discovery/types'
import type { MoleculeCandidate } from '@/lib/domain'
import { clientFetch } from '@/lib/clientFetch'
import { newPipelineRun, runStage } from './runStage'
import type { PipelineReport } from './types'

export interface RankSimilarityPipelineResult extends RankSimilarityExpandResult {
  pipeline: PipelineReport
}

/**
 * Discover rank-path similarity expand with overall timeout and non-fatal failure.
 */
export async function runRankSimilarityExpandPipeline(input: {
  shortlist: CandidateMolecule[]
  seedMax?: number
  neighborsPerSeed?: number
  penalty?: number
  existingNames?: Set<string>
  /** Soft overall budget (default 12s — keep rank responsive) */
  timeoutMs?: number
}): Promise<RankSimilarityPipelineResult> {
  const run = newPipelineRun('rank-similarity-expand')
  const timeoutMs = input.timeoutMs ?? 12_000

  const { value, stage } = await runStage(
    {
      id: 'expand_neighbors',
      timeoutMs,
      retries: 0,
      optional: true,
    },
    async () =>
      expandRankShortlistBySimilarity(input.shortlist, {
        seedMax: input.seedMax ?? RANK_SIMILARITY_SEED_MAX,
        neighborsPerSeed: input.neighborsPerSeed ?? RANK_SIMILARITY_NEIGHBORS,
        penalty: input.penalty ?? RANK_SIMILARITY_SCORE_PENALTY,
        existingNames: input.existingNames,
      }),
  )
  run.addStage(stage)

  if (!value) {
    const empty: RankSimilarityExpandResult = {
      candidates: [],
      added: 0,
      seedCids: [],
      warnings: [
        stage.error
          ? `Similarity expand skipped: ${stage.error}`
          : 'Similarity expand skipped (no result)',
      ],
    }
    return { ...empty, pipeline: run.finish(true, true) }
  }

  if (value.warnings.length) {
    run.report.warnings.push(...value.warnings)
  }
  return {
    ...value,
    pipeline: run.finish(true, value.added === 0),
  }
}

/**
 * Board UI: expand one seed CID via API with clientFetch retries.
 */
export async function runBoardSimilarityExpandPipeline(input: {
  seedCid: number
  max?: number
  signal?: AbortSignal
}): Promise<{
  result: SimilarityExpandResult
  neighbors: MoleculeCandidate[]
  pipeline: PipelineReport
}> {
  const run = newPipelineRun('board-similarity-expand')
  const seedCid = input.seedCid

  const { value, stage } = await runStage(
    {
      id: 'network_similar',
      timeoutMs: 20_000,
      retries: 2,
      retryDelayMs: 500,
      signal: input.signal,
    },
    async () => {
      const res = await clientFetch(
        '/api/discover/similarity',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seedCid, max: input.max ?? 5 }),
          signal: input.signal,
        },
        { retries: 1, retryDelayMs: 400, timeoutMs: 18_000 },
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          (err as { error?: string }).error ?? `Expand failed (${res.status})`,
        )
      }
      return (await res.json()) as SimilarityExpandResult
    },
  )
  run.addStage(stage)

  if (!value) {
    const e = new Error(stage.error || 'Similarity expand failed')
    ;(e as Error & { pipeline?: PipelineReport }).pipeline = run.finish(false, false)
    throw e
  }

  const neighbors = Array.isArray(value.neighbors) ? value.neighbors : []
  run.addStage({
    id: 'validate_neighbors',
    status: 'ok',
    ms: 0,
    notes: [`${neighbors.length} neighbor(s)`],
  })

  return {
    result: value,
    neighbors,
    pipeline: run.finish(true, neighbors.length === 0),
  }
}

/**
 * Server API path: direct expand with timeout (no clientFetch).
 */
export async function runServerSimilarityExpand(
  seedCid: number,
  max = 5,
): Promise<SimilarityExpandResult & { pipeline: PipelineReport }> {
  const run = newPipelineRun('server-similarity-expand')
  const { value, stage } = await runStage(
    { id: 'pubchem_similar', timeoutMs: 15_000, retries: 1, retryDelayMs: 400 },
    async () => expandSimilarCandidates(seedCid, { max }),
  )
  run.addStage(stage)
  if (!value) {
    throw new Error(stage.error || 'Similarity expand failed')
  }
  return { ...value, pipeline: run.finish(true, value.neighbors.length === 0) }
}
