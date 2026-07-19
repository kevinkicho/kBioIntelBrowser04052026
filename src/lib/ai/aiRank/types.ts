/**
 * Structured AI analysis ordering (non-of-record).
 * Deterministic Discover scores remain system of record.
 */

export interface AiRankItem {
  /** Stable key: preferred candidateId, else name|cid */
  key: string
  name: string
  rank: number
  /** Short reasons (model-generated; must map to retrieved evidence) */
  reasons: string[]
  /** Optional evidence tags e.g. trial, target, safety, source:chembl */
  evidenceKeys?: string[]
}

export interface AiRankResult {
  ordering: AiRankItem[]
  caveats: string[]
  refused: boolean
  refuseReason?: string
  /** Model id used (transparency) */
  model?: string
  generatedAt: string
}

export interface AiRankCandidateInput {
  key: string
  name: string
  cid: number | null
  ofRecordRank: number
  compositeScore: number
  clinicalPhaseRaw: number
  trialCountRaw: number
  sharedTargetCountRaw: number
  geneScoreRaw: number
  sources: string[]
  confidence: string
  /** Optional axis snapshot when available */
  axes?: Record<string, number | null | undefined>
}
