/**
 * Safety + novelty harvest for top-K candidates (expensive axes).
 * Concurrency 4; K ≤ 15. Empty AE+recall → axis null + empty (never “safe”).
 * @see docs/design/discovery-workbench-v1.md §5.1.3
 */

import { getAdverseEventsByName } from '../api/adverseevents'
import { getDrugRecallsByName } from '../api/recalls'
import { getLiteratureHitCount } from '../api/europepmc'
import type { SourceFetchStatus } from '../dataStatus'
import type { ScoreRubric, ScoreVector } from '../domain/score'
import { makeSourceStatus } from './sourceStatus'
import {
  mergeHarvestIntoScoreVector,
  scoreNovelty,
  scoreSafety,
} from './scoreAxes'

export const HARVEST_K_DEFAULT = 15
export const HARVEST_CONCURRENCY = 4

export interface HarvestCandidateInput {
  name: string
  /** Optional stable id for response matching. */
  candidateId?: string
  /** Existing score vector (cheap) to merge into. */
  scores?: ScoreVector
  /** maxPhase/4 for novelty dampening. */
  phaseNorm?: number | null
  clinicalStage?: number | null
}

export interface HarvestedCandidate {
  name: string
  candidateId?: string
  scores: ScoreVector
  safety: {
    aeTotal: number
    seriousTotal: number
    recallCount: number
    status: string
  }
  novelty: {
    hitCount: number
    status: string
  }
}

export interface HarvestResult {
  candidates: HarvestedCandidate[]
  sourceStatuses: SourceFetchStatus[]
  generatedAt: string
  timingMs: number
  warnings: string[]
}

export interface HarvestOptions {
  runSafety?: boolean
  runNovelty?: boolean
  rubric: ScoreRubric
  concurrency?: number
  /** Per-call soft timeout ms (best-effort; underlying clients may not abort). */
  safetyTimeoutMs?: number
  noveltyTimeoutMs?: number
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  onTimeout: () => T,
): Promise<{ value: T; timedOut: boolean }> {
  if (ms <= 0) {
    return { value: await promise, timedOut: false }
  }
  let timedOut = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      timedOut = true
      resolve(onTimeout())
    }, ms)
  })
  try {
    const value = await Promise.race([promise, timeoutPromise])
    return { value, timedOut }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * Harvest safety (openFDA AE+recalls) and/or novelty (EuropePMC) for candidates.
 */
export async function harvestCandidateAxes(
  candidates: HarvestCandidateInput[],
  options: HarvestOptions,
): Promise<HarvestResult> {
  const start = Date.now()
  const generatedAt = new Date().toISOString()
  const warnings: string[] = []
  const sourceStatuses: SourceFetchStatus[] = []
  const concurrency = options.concurrency ?? HARVEST_CONCURRENCY
  const runSafety = options.runSafety !== false
  const runNovelty = options.runNovelty !== false
  const safetyTimeoutMs = options.safetyTimeoutMs ?? 4000
  const noveltyTimeoutMs = options.noveltyTimeoutMs ?? 3000

  if (candidates.length === 0) {
    return {
      candidates: [],
      sourceStatuses,
      generatedAt,
      timingMs: Date.now() - start,
      warnings: ['No candidates to harvest.'],
    }
  }

  let safetyErrors = 0
  let noveltyErrors = 0
  let safetyEmpty = 0
  let noveltyOk = 0

  const harvested = await mapPool(candidates, concurrency, async (c) => {
    let aeTotal = 0
    let seriousTotal = 0
    let recallCount = 0
    let safetyFetchFailed = false
    let safetyTimedOut = false
    let hitCount = 0
    let noveltyFetchFailed = false
    let noveltyTimedOut = false

    if (runSafety) {
      const safetyResult = await withTimeout(
        Promise.all([
          getAdverseEventsByName(c.name).catch(() => {
            safetyFetchFailed = true
            return [] as Awaited<ReturnType<typeof getAdverseEventsByName>>
          }),
          getDrugRecallsByName(c.name).catch(() => {
            safetyFetchFailed = true
            return [] as Awaited<ReturnType<typeof getDrugRecallsByName>>
          }),
        ]),
        safetyTimeoutMs,
        () => {
          safetyTimedOut = true
          return [[], []] as [
            Awaited<ReturnType<typeof getAdverseEventsByName>>,
            Awaited<ReturnType<typeof getDrugRecallsByName>>,
          ]
        },
      )
      const [aes, recalls] = safetyResult.value
      if (safetyResult.timedOut) safetyTimedOut = true
      aeTotal = aes.reduce((s, a) => s + (a.count || 0), 0)
      seriousTotal = aes.reduce((s, a) => s + (a.serious || 0), 0)
      recallCount = recalls.length
      if (safetyFetchFailed && !safetyTimedOut) safetyErrors++
      if (!safetyFetchFailed && !safetyTimedOut && aeTotal === 0 && recallCount === 0) {
        safetyEmpty++
      }
    }

    if (runNovelty) {
      const novResult = await withTimeout(
        getLiteratureHitCount(c.name).catch(() => {
          noveltyFetchFailed = true
          return 0
        }),
        noveltyTimeoutMs,
        () => {
          noveltyTimedOut = true
          return 0
        },
      )
      hitCount = novResult.value
      if (novResult.timedOut) noveltyTimedOut = true
      if (noveltyFetchFailed && !noveltyTimedOut) noveltyErrors++
      if (!noveltyFetchFailed && !noveltyTimedOut) noveltyOk++
    }

    const safetyScored = runSafety
      ? scoreSafety({
          aeTotal,
          seriousTotal,
          recallCount,
          fetchFailed: safetyFetchFailed && !safetyTimedOut,
          fetchTimedOut: safetyTimedOut,
        })
      : null

    const noveltyScored = runNovelty
      ? scoreNovelty({
          hitCount,
          phaseNorm: c.phaseNorm ?? c.clinicalStage ?? null,
          fetchFailed: noveltyFetchFailed && !noveltyTimedOut,
          fetchTimedOut: noveltyTimedOut,
        })
      : null

    const baseScores =
      c.scores ??
      ({
        composite: 0,
        axes: {
          efficacy: null,
          clinicalStage: c.clinicalStage ?? null,
          safety: null,
          novelty: null,
          identityTrust: null,
        },
        axisStatus: {
          efficacy: 'not-retrieved',
          clinicalStage: c.clinicalStage != null ? 'computed' : 'not-retrieved',
          safety: 'not-retrieved',
          novelty: 'not-retrieved',
          identityTrust: 'not-retrieved',
        },
        rubricVersion: 1 as const,
        scorePhase: 'cheap' as const,
      } satisfies ScoreVector)

    const merged = mergeHarvestIntoScoreVector(baseScores, options.rubric, {
      safety: safetyScored
        ? {
            value: safetyScored.value,
            status: safetyScored.status,
            flags: safetyScored.flags,
          }
        : undefined,
      novelty: noveltyScored
        ? { value: noveltyScored.value, status: noveltyScored.status }
        : undefined,
    })

    return {
      name: c.name,
      candidateId: c.candidateId,
      scores: merged,
      safety: {
        aeTotal,
        seriousTotal,
        recallCount,
        status: safetyScored?.status ?? 'not-retrieved',
      },
      novelty: {
        hitCount,
        status: noveltyScored?.status ?? 'not-retrieved',
      },
    } satisfies HarvestedCandidate
  })

  if (runSafety) {
    sourceStatuses.push(
      makeSourceStatus(
        'openFDA (AE+recalls harvest)',
        safetyErrors === candidates.length ? 'error' : safetyEmpty === candidates.length ? 'empty' : 'loaded',
        {
          durationMs: Date.now() - start,
          hasData: safetyEmpty < candidates.length,
          error:
            safetyErrors > 0
              ? `${safetyErrors}/${candidates.length} safety fetches failed`
              : undefined,
        },
      ),
    )
  }
  if (runNovelty) {
    sourceStatuses.push(
      makeSourceStatus(
        'EuropePMC (novelty harvest)',
        noveltyErrors === candidates.length ? 'error' : noveltyOk === 0 ? 'empty' : 'loaded',
        {
          durationMs: Date.now() - start,
          hasData: noveltyOk > 0,
          error:
            noveltyErrors > 0
              ? `${noveltyErrors}/${candidates.length} novelty fetches failed`
              : undefined,
        },
      ),
    )
  }

  if (safetyErrors > 0) {
    warnings.push(`Safety harvest partial failures: ${safetyErrors}`)
  }
  if (noveltyErrors > 0) {
    warnings.push(`Novelty harvest partial failures: ${noveltyErrors}`)
  }

  return {
    candidates: harvested,
    sourceStatuses,
    generatedAt,
    timingMs: Date.now() - start,
    warnings,
  }
}
