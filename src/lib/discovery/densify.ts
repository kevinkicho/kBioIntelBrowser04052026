/**
 * Shortlist densify — always fill safety/novelty for top-K after cheap rank.
 * Bounded free-API harvest + multi-source breadth (patents/OpenAlex/BindingDB/…).
 * Does not invent scores. Empty safety ≠ safe.
 */

import type { ScoreRubric, ScoreVector } from '../domain/score'
import {
  harvestCandidateAxes,
  HARVEST_CONCURRENCY,
  type HarvestResult,
} from './harvest'
import {
  harvestBreadthBatch,
  mergeLitHitProxy,
  type BreadthHarvestOpts,
  type BreadthHarvestRow,
} from './densifyBreadth'
import { getDensifyBudgets } from './densifyBudgets'
import { mergeHarvestIntoScoreVector, scoreNovelty } from './scoreAxes'
import type { CandidateMolecule } from './types'

/** Default K for always-on densify (overridden by env budgets on cloud). */
export const DENSIFY_K_DEFAULT = 10

/** Soft timeout budgets — prefer getDensifyBudgets() at runtime. */
export const DENSIFY_SAFETY_TIMEOUT_MS = 3500
export const DENSIFY_NOVELTY_TIMEOUT_MS = 2500

export interface DensifyInput {
  candidates: CandidateMolecule[]
  /** name(lower) → cheap ScoreVector */
  scoreByName: Map<string, ScoreVector>
  rubric: ScoreRubric
  /** Max candidates to densify (default from densify budgets) */
  k?: number
  /** Opt out (tests / ultra-cheap path) */
  skip?: boolean
  /** Opt out multi-source breadth (default from densify budgets on cloud) */
  skipBreadth?: boolean
}

export interface DensifyResult {
  /** Updated score map (merged harvest) */
  scoreByName: Map<string, ScoreVector>
  /** Candidates re-sorted with densified composites + breadth sources */
  candidates: CandidateMolecule[]
  harvest: HarvestResult | null
  /** name(lower) → multi-source breadth row (when breadth ran) */
  breadthByName: Map<string, BreadthHarvestRow>
  densifiedCount: number
  skipped: boolean
  timingMs: number
  warnings: string[]
}

/**
 * Always densify top-K with safety + novelty harvest (free public APIs),
 * then multi-source breadth to utilize more catalog endpoints on the shortlist.
 * Tail of the shortlist stays cheap-phase only.
 */
export async function densifyShortlist(input: DensifyInput): Promise<DensifyResult> {
  const start = Date.now()
  const warnings: string[] = []
  const budgets = getDensifyBudgets()
  const k = Math.min(
    Math.max(1, input.k ?? budgets.densifyK),
    input.candidates.length,
  )
  const scoreByName = new Map(input.scoreByName)
  const breadthByName = new Map<string, BreadthHarvestRow>()
  const skipBreadth =
    input.skipBreadth !== undefined
      ? input.skipBreadth
      : budgets.skipBreadthByDefault

  if (input.skip || input.candidates.length === 0 || k === 0) {
    return {
      scoreByName,
      candidates: input.candidates,
      harvest: null,
      breadthByName,
      densifiedCount: 0,
      skipped: true,
      timingMs: Date.now() - start,
      warnings: input.skip ? ['Densify skipped by option.'] : [],
    }
  }

  const top = input.candidates.slice(0, k)
  // Harvest is best-effort: never throw out of densify (rank must still return cheap scores)
  let harvest: Awaited<ReturnType<typeof harvestCandidateAxes>> | null = null
  try {
    harvest = await harvestCandidateAxes(
      top.map((c) => ({
        name: c.name,
        scores: scoreByName.get(c.name.toLowerCase()),
        phaseNorm: c.clinicalPhase,
        clinicalStage:
          scoreByName.get(c.name.toLowerCase())?.axes.clinicalStage ?? c.clinicalPhase,
      })),
      {
        runSafety: true,
        runNovelty: true,
        rubric: input.rubric,
        concurrency: Math.min(HARVEST_CONCURRENCY, budgets.harvestConcurrency),
        safetyTimeoutMs: budgets.safetyTimeoutMs,
        noveltyTimeoutMs: budgets.noveltyTimeoutMs,
      },
    )
  } catch {
    warnings.push('Safety/novelty harvest failed (non-fatal); cheap scores retained.')
    return {
      scoreByName,
      candidates: input.candidates.map((c) => {
        const s = scoreByName.get(c.name.toLowerCase())
        return s ? { ...c, compositeScore: s.composite } : c
      }),
      harvest: null,
      breadthByName,
      densifiedCount: 0,
      skipped: false,
      timingMs: Date.now() - start,
      warnings,
    }
  }

  warnings.push(...harvest.warnings)
  for (const h of harvest.candidates) {
    scoreByName.set(h.name.toLowerCase(), h.scores)
  }

  // Multi-source free-API breadth (skip EuropePMC re-fetch; reuse novelty hits)
  if (!skipBreadth && top.length > 0) {
    const optsByName = new Map<string, BreadthHarvestOpts>()
    for (const h of harvest.candidates) {
      optsByName.set(h.name.toLowerCase(), {
        skipEuropePmc: true,
        europePmcHits: h.novelty.hitCount,
      })
    }
    try {
      const breadth = await harvestBreadthBatch(
        top.map((c) => c.name),
        budgets.breadthConcurrency,
        optsByName,
      )
      for (const [key, row] of Array.from(breadth.entries())) {
        breadthByName.set(key, row)
      }

      let breadthSources = 0
      for (const h of harvest.candidates) {
        const key = h.name.toLowerCase()
        const b = breadthByName.get(key)
        if (!b) continue
        breadthSources += b.sources.length

        const priorHits = h.novelty.hitCount
        const mergedHits = mergeLitHitProxy(priorHits, b.litHitProxy)
        if (mergedHits > priorHits && h.novelty.status !== 'timeout' && h.novelty.status !== 'error') {
          const existing = scoreByName.get(key)
          const phaseNorm =
            existing?.axes.clinicalStage ??
            top.find((c) => c.name.toLowerCase() === key)?.clinicalPhase ??
            null
          const noveltyScored = scoreNovelty({
            hitCount: mergedHits,
            phaseNorm,
            fetchFailed: false,
            fetchTimedOut: false,
          })
          if (existing && noveltyScored.value != null) {
            const merged = mergeHarvestIntoScoreVector(existing, input.rubric, {
              novelty: { value: noveltyScored.value, status: noveltyScored.status },
            })
            scoreByName.set(key, merged)
          }
        }
      }
      if (breadthSources > 0) {
        warnings.push(
          `Breadth densify used extra free APIs (PatentsView/OpenAlex/BindingDB/Semantic Scholar/NIH) on top-${top.length}.`,
        )
      }
    } catch {
      warnings.push('Breadth densify failed (non-fatal); FAERS + EuropePMC densify retained.')
    }
  } else if (skipBreadth) {
    warnings.push(
      `Breadth densify skipped (${budgets.profile} budget — set DENSIFY_ENABLE_BREADTH=1 to force).`,
    )
  }

  const candidates = input.candidates.map((c) => {
    const key = c.name.toLowerCase()
    const s = scoreByName.get(key)
    const b = breadthByName.get(key)
    let next = c
    if (s) next = { ...next, compositeScore: s.composite }
    if (b && b.sources.length > 0) {
      const union = Array.from(new Set([...next.sources, ...b.sources]))
      next = { ...next, sources: union }
    }
    return next
  })

  return {
    scoreByName,
    candidates,
    harvest,
    breadthByName,
    densifiedCount: top.length,
    skipped: false,
    timingMs: Date.now() - start,
    warnings,
  }
}
