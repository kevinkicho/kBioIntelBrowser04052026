/**
 * Legacy single-composite scoring (weights fixed).
 * Multi-axis ScoreVector / rubric presets land in PR4 — do not change formulas here.
 */

import type { TargetRelatedMolecule } from '../api/dgidb'
import type { CandidateMolecule, ConfidenceLevel, DiseaseGene } from './types'
import { matchIndication, normalizeLog } from './normalize'

export const W_CLINICAL_PHASE = 0.35
export const W_GENE_ASSOCIATION = 0.25
export const W_SHARED_TARGET = 0.2
export const W_TRIAL_COUNT = 0.2

export function computeGeneScore(mol: TargetRelatedMolecule, genes: DiseaseGene[]): number {
  const geneMap = new Map(genes.map((g) => [g.symbol.toUpperCase(), g.score]))
  const scores: number[] = []
  for (const target of mol.sharedTargets) {
    const score = geneMap.get(target.toUpperCase())
    if (score !== undefined) scores.push(score)
  }
  if (scores.length === 0) return 0
  return Math.max(...scores)
}

export function confidenceFromSources(sources: string[]): ConfidenceLevel {
  const unique = Array.from(new Set(sources))
  if (unique.length >= 4) return 'high'
  if (unique.length >= 2) return 'moderate'
  return 'preliminary'
}

export interface ScoreInputs {
  name: string
  cid: number | null
  diseaseName: string
  targetMol: TargetRelatedMolecule | undefined
  trialCount: number
  maxTrialCount: number
  genes: DiseaseGene[]
  topTargetCount: number
  indications: { meshHeading: string; efoTerm: string; maxPhaseForIndication: number }[]
  sources: string[]
}

/** Build one legacy CandidateMolecule with the original composite formula. */
export function scoreLegacyCandidate(input: ScoreInputs): CandidateMolecule {
  const {
    name,
    cid,
    diseaseName,
    targetMol,
    trialCount,
    maxTrialCount,
    genes,
    topTargetCount,
    indications,
    sources,
  } = input

  const geneSymbolSet = new Map(genes.map((g) => [g.symbol.toUpperCase(), g.score]))
  const geneAssociationScore = targetMol ? computeGeneScore(targetMol, genes) : 0

  const sharedTargetCount = targetMol
    ? targetMol.sharedTargets.filter((t) => geneSymbolSet.has(t.toUpperCase())).length
    : 0
  const sharedTargetRatio = Math.min(1, sharedTargetCount / Math.min(topTargetCount, 10))

  const trialCountNorm = normalizeLog(trialCount, maxTrialCount)
  const clinicalPhase = matchIndication(diseaseName, indications)
  const clinicalPhaseNorm = clinicalPhase / 4

  const compositeScore =
    W_CLINICAL_PHASE * clinicalPhaseNorm +
    W_GENE_ASSOCIATION * geneAssociationScore +
    W_SHARED_TARGET * sharedTargetRatio +
    W_TRIAL_COUNT * trialCountNorm

  const uniqueSources = Array.from(new Set(sources))

  return {
    name,
    cid,
    clinicalPhase: clinicalPhaseNorm,
    geneAssociationScore,
    sharedTargetRatio,
    trialCountNorm,
    clinicalPhaseRaw: clinicalPhase,
    sharedTargetCountRaw: sharedTargetCount,
    trialCountRaw: trialCount,
    geneScoreRaw: geneAssociationScore,
    sources: uniqueSources,
    confidence: confidenceFromSources(uniqueSources),
    compositeScore,
  }
}

export function sortCandidates(candidates: CandidateMolecule[]): CandidateMolecule[] {
  return [...candidates].sort((a, b) => {
    if (b.compositeScore !== a.compositeScore) return b.compositeScore - a.compositeScore
    if (b.sources.length !== a.sources.length) return b.sources.length - a.sources.length
    return a.name.localeCompare(b.name)
  })
}
