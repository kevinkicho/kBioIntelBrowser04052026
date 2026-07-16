/**
 * DiscoveryResult wire contract + dual-schema note for legacy RankResult.
 * @see docs/design/discovery-workbench-v1.md §3.1, §5.1.5 (KD19)
 */

import type { SourceFetchStatus } from '../dataStatus'
import type { CandidateMolecule, DiseaseGene, RankResult } from '../candidateRanker'
import type { DiscoveryPreferencesSnapshot } from '../discovery/preferences'
import type { DiseaseEntity, MoleculeCandidate, TargetEntity } from './entities'
import { createDefaultScoreRubric, type ScorePhase, type ScoreRubric } from './score'

export type { DiscoveryPreferencesSnapshot }

export type DiscoveryTimingStage =
  | 'disease'
  | 'targets'
  | 'gather'
  | 'identity'
  | 'cheapScore'
  | 'safetyHarvest'
  | 'total'

/**
 * Schema version 2 discovery payload.
 * Multi-hit disease: `diseaseCandidates` + `needsDiseaseConfirmation`.
 * Prefer `disease` for the confirmed/primary entity; `diseaseCandidates` for disambiguation UI.
 */
export interface DiscoveryResult {
  schemaVersion: 2
  query: string
  disease: DiseaseEntity | null
  /**
   * Multi-hit disease options (disambiguation).
   * When length > 1 and no hard diseaseId pin → needsDiseaseConfirmation should be true.
   * Single writer field — do not invent a parallel `diseases` array.
   */
  diseaseCandidates?: DiseaseEntity[]
  needsDiseaseConfirmation: boolean
  targets: TargetEntity[]
  candidates: MoleculeCandidate[]
  sourceStatuses: SourceFetchStatus[]
  rubric: ScoreRubric
  /** Echo of prefs used for this run (export reproducibility) */
  preferencesSnapshot?: DiscoveryPreferencesSnapshot
  generatedAt: string
  warnings: string[]
  scorePhase: ScorePhase
  timingMs?: Partial<Record<DiscoveryTimingStage, number>>
}

/**
 * Dual schema (KD19): legacy RankResult remains the default JSON shape;
 * additive optional `v2` carries the full DiscoveryResult without breaking clients.
 *
 *   export type RankResultWithV2 = RankResult & { v2?: DiscoveryResult }
 *
 * Engine PRs should populate both until UI migrates fully to v2.
 */
export type RankResultWithV2 = RankResult & {
  v2?: DiscoveryResult
}

/** Empty discovery result helper for tests / error paths. */
export function createEmptyDiscoveryResult(
  query: string,
  overrides?: Partial<DiscoveryResult>,
): DiscoveryResult {
  return {
    schemaVersion: 2,
    query,
    disease: null,
    needsDiseaseConfirmation: false,
    targets: [],
    candidates: [],
    sourceStatuses: [],
    rubric: createDefaultScoreRubric('balanced'),
    generatedAt: new Date().toISOString(),
    warnings: [],
    scorePhase: 'cheap',
    ...overrides,
  }
}

/**
 * Type guard for schema v2 payloads.
 */
export function isDiscoveryResult(value: unknown): value is DiscoveryResult {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return v.schemaVersion === 2 && typeof v.query === 'string' && Array.isArray(v.candidates)
}

/**
 * Narrow dual-schema rank payload.
 */
export function getDiscoveryV2(result: RankResult | RankResultWithV2): DiscoveryResult | undefined {
  return (result as RankResultWithV2).v2
}

/** Re-export legacy pieces for dual-schema consumers without deep imports. */
export type { RankResult, CandidateMolecule, DiseaseGene, SourceFetchStatus }
