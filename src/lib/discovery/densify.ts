/**
 * Shortlist densify — always fill safety/novelty for top-K after cheap rank.
 * Bounded free-API harvest; does not invent scores. Empty safety ≠ safe.
 */

import type { ScoreRubric, ScoreVector } from '../domain/score'
import {
  harvestCandidateAxes,
  HARVEST_CONCURRENCY,
  type HarvestResult,
} from './harvest'
import type { CandidateMolecule } from './types'

/** Default K for always-on densify (investigation shortlist, not full universe). */
export const DENSIFY_K_DEFAULT = 10

/** Soft timeout budget per densify candidate (ms) — keep rank responsive. */
export const DENSIFY_SAFETY_TIMEOUT_MS = 3500
export const DENSIFY_NOVELTY_TIMEOUT_MS = 2500

export interface DensifyInput {
  candidates: CandidateMolecule[]
  /** name(lower) → cheap ScoreVector */
  scoreByName: Map<string, ScoreVector>
  rubric: ScoreRubric
  /** Max candidates to densify (default DENSIFY_K_DEFAULT) */
  k?: number
  /** Opt out (tests / ultra-cheap path) */
  skip?: boolean
}

export interface DensifyResult {
  /** Updated score map (merged harvest) */
  scoreByName: Map<string, ScoreVector>
  /** Candidates re-sorted with densified composites */
  candidates: CandidateMolecule[]
  harvest: HarvestResult | null
  densifiedCount: number
  skipped: boolean
  timingMs: number
  warnings: string[]
}

/**
 * Always densify top-K with safety + novelty harvest (free public APIs).
 * Tail of the shortlist stays cheap-phase only.
 */
export async function densifyShortlist(input: DensifyInput): Promise<DensifyResult> {
  const start = Date.now()
  const warnings: string[] = []
  const k = Math.min(
    Math.max(1, input.k ?? DENSIFY_K_DEFAULT),
    input.candidates.length,
  )
  const scoreByName = new Map(input.scoreByName)

  if (input.skip || input.candidates.length === 0 || k === 0) {
    return {
      scoreByName,
      candidates: input.candidates,
      harvest: null,
      densifiedCount: 0,
      skipped: true,
      timingMs: Date.now() - start,
      warnings: input.skip ? ['Densify skipped by option.'] : [],
    }
  }

  const top = input.candidates.slice(0, k)
  const harvest = await harvestCandidateAxes(
    top.map((c) => ({
      name: c.name,
      scores: scoreByName.get(c.name.toLowerCase()),
      phaseNorm: c.clinicalPhase,
      clinicalStage: scoreByName.get(c.name.toLowerCase())?.axes.clinicalStage ?? c.clinicalPhase,
    })),
    {
      runSafety: true,
      runNovelty: true,
      rubric: input.rubric,
      concurrency: HARVEST_CONCURRENCY,
      safetyTimeoutMs: DENSIFY_SAFETY_TIMEOUT_MS,
      noveltyTimeoutMs: DENSIFY_NOVELTY_TIMEOUT_MS,
    },
  )

  warnings.push(...harvest.warnings)
  for (const h of harvest.candidates) {
    scoreByName.set(h.name.toLowerCase(), h.scores)
  }

  const candidates = input.candidates.map((c) => {
    const s = scoreByName.get(c.name.toLowerCase())
    if (!s) return c
    return { ...c, compositeScore: s.composite }
  })

  return {
    scoreByName,
    candidates,
    harvest,
    densifiedCount: top.length,
    skipped: false,
    timingMs: Date.now() - start,
    warnings,
  }
}
