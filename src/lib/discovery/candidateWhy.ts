/**
 * Deterministic “why this row” copy for Discover candidates.
 * Evidence-first — no LLM. Uses score axes + sources already on the DTO.
 */

import type { CandidateMolecule } from './types'

const PHASE_LABELS: Record<number, string> = {
  1: 'Phase I',
  2: 'Phase II',
  3: 'Phase III',
  4: 'Approved',
}

/**
 * One-line ranking rationale for a candidate card.
 */
export function buildCandidateWhy(
  candidate: CandidateMolecule,
  diseaseName?: string,
): string {
  const bits: string[] = []
  const disease = diseaseName?.trim() || 'this disease'

  if (candidate.clinicalPhaseRaw > 0) {
    const phase =
      PHASE_LABELS[candidate.clinicalPhaseRaw] ?? `Phase ${candidate.clinicalPhaseRaw}`
    bits.push(`${phase} clinical signal`)
  }

  if (candidate.trialCountRaw > 0) {
    bits.push(
      `${candidate.trialCountRaw} trial${candidate.trialCountRaw === 1 ? '' : 's'} linked to ${disease}`,
    )
  }

  if (candidate.sharedTargetCountRaw > 0) {
    bits.push(
      `${candidate.sharedTargetCountRaw} shared target${
        candidate.sharedTargetCountRaw === 1 ? '' : 's'
      } with disease genes`,
    )
  }

  if (candidate.geneScoreRaw > 0 || candidate.geneAssociationScore > 0) {
    const g =
      candidate.geneScoreRaw > 0
        ? candidate.geneScoreRaw.toFixed(2)
        : candidate.geneAssociationScore.toFixed(2)
    bits.push(`gene-association score ${g}`)
  }

  if (candidate.sources.length > 0) {
    bits.push(`sources: ${candidate.sources.slice(0, 4).join(', ')}`)
  }

  const pct = Math.round((candidate.compositeScore || 0) * 100)
  if (bits.length === 0) {
    return `Ranked #composite ${pct}% from free public APIs for ${disease} (deterministic rubric).`
  }

  return `Why ranked (${pct}% composite): ${bits.join(' · ')}.`
}
