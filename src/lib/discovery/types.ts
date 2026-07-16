/**
 * Legacy + dual-schema wire types for the discovery rank engine.
 * Keep RankResult field names stable for Discover UI / exports.
 * @see docs/design/discovery-workbench-v1.md §5.1.5 (KD19)
 */

import type { SourceFetchStatus } from '../dataStatus'

export type ConfidenceLevel = 'high' | 'moderate' | 'preliminary'

export interface CandidateMolecule {
  name: string
  cid: number | null

  clinicalPhase: number
  geneAssociationScore: number
  sharedTargetRatio: number
  trialCountNorm: number

  clinicalPhaseRaw: number
  sharedTargetCountRaw: number
  trialCountRaw: number
  geneScoreRaw: number
  sources: string[]
  confidence: ConfidenceLevel

  compositeScore: number
}

export interface DiseaseGene {
  symbol: string
  score: number
  source: string
}

/**
 * Legacy RankResult (v1 wire).
 * PR3a additive fields: sourceStatuses, generatedAt, warnings, optional v2.
 * Existing Discover UI only reads the original fields.
 */
export interface RankResult {
  query: string
  diseaseId: string | null
  diseaseName: string
  therapeuticAreas: string[]
  genes: DiseaseGene[]
  candidates: CandidateMolecule[]
  /** Per-upstream-source fetch outcomes (PR3a) */
  sourceStatuses?: SourceFetchStatus[]
  /** ISO-8601 timestamp when this rank payload was produced */
  generatedAt?: string
  /** Non-fatal issues (partial sources, decontamination, etc.) */
  warnings?: string[]
  /**
   * Dual schema: full DiscoveryResult without breaking legacy clients (KD19).
   * Typed via import() to avoid cycle: types ↔ domain/discoveryResult ↔ candidateRanker.
   */
  v2?: import('../domain/discoveryResult').DiscoveryResult
}

export type RankResultWithV2 = RankResult & {
  v2?: import('../domain/discoveryResult').DiscoveryResult
}

/** Internal gather bag before scoring. */
export interface GatheredMolecules {
  fromTargets: import('../api/dgidb').TargetRelatedMolecule[]
  fromTrials: Map<string, number>
  /** Names from disease enrichment that are *actual* drugs (never OT target names). */
  fromDisease: string[]
  diseaseSourceLabel: string | null
}
