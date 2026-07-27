/**
 * Deterministic “why this row” copy for Discover candidates.
 * Evidence-first — no LLM. Uses score axes + sources already on the DTO.
 */

import type { MoleculeCandidate, ScoreVector } from '../domain'
import type { CandidateMolecule } from './types'

const PHASE_LABELS: Record<number, string> = {
  1: 'Phase I',
  2: 'Phase II',
  3: 'Phase III',
  4: 'Approved',
}

export interface CandidateWhyChip {
  id: string
  label: string
  /** of-record evidence vs meta */
  tone?: 'evidence' | 'meta' | 'warn'
}

/**
 * Compact evidence chips for Discover cards (deterministic).
 */
export function buildCandidateWhyChips(
  candidate: CandidateMolecule,
  opts?: {
    diseaseName?: string
    scores?: ScoreVector | null
    domain?: MoleculeCandidate | null
    sharedTargetSymbols?: string[]
  },
): CandidateWhyChip[] {
  const chips: CandidateWhyChip[] = []
  const disease = opts?.diseaseName?.trim() || 'disease'
  const scores = opts?.scores ?? opts?.domain?.scores
  const domain = opts?.domain

  if (candidate.cid != null && candidate.cid > 0) {
    chips.push({ id: 'cid', label: `CID ${candidate.cid}`, tone: 'evidence' })
  } else {
    chips.push({ id: 'no-cid', label: 'name-only', tone: 'warn' })
  }

  if (domain?.identity?.inchiKey) {
    chips.push({
      id: 'ik',
      label: 'InChIKey',
      tone: 'evidence',
    })
  }

  if (candidate.clinicalPhaseRaw > 0) {
    const phase =
      PHASE_LABELS[candidate.clinicalPhaseRaw] ?? `Phase ${candidate.clinicalPhaseRaw}`
    chips.push({ id: 'phase', label: phase, tone: 'evidence' })
  }

  if (candidate.trialCountRaw > 0) {
    const matched =
      candidate.clinicalPhaseRaw > 0 ? ` · ${disease.slice(0, 24)}` : ''
    chips.push({
      id: 'trials',
      label: `${candidate.trialCountRaw} trial${candidate.trialCountRaw === 1 ? '' : 's'}${matched}`,
      tone: 'evidence',
    })
  }

  if (candidate.sharedTargetCountRaw > 0) {
    const symbols = (opts?.sharedTargetSymbols || []).slice(0, 3)
    chips.push({
      id: 'targets',
      label: symbols.length
        ? `targets ${symbols.join(', ')}`
        : `${candidate.sharedTargetCountRaw} shared target${candidate.sharedTargetCountRaw === 1 ? '' : 's'}`,
      tone: 'evidence',
    })
  }

  if (candidate.geneScoreRaw > 0 || candidate.geneAssociationScore > 0) {
    const g =
      candidate.geneScoreRaw > 0
        ? candidate.geneScoreRaw.toFixed(2)
        : candidate.geneAssociationScore.toFixed(2)
    chips.push({ id: 'gene', label: `gene ${g}`, tone: 'evidence' })
  }

  // Honest safety status from densify / harvest
  const safetyStatus = scores?.axisStatus?.safety
  if (safetyStatus === 'not-retrieved' || scores?.axes.safety == null) {
    if (scores?.scorePhase === 'cheap' || safetyStatus === 'not-retrieved') {
      chips.push({ id: 'safety', label: 'safety not retrieved', tone: 'warn' })
    } else if (safetyStatus === 'empty') {
      chips.push({ id: 'safety', label: 'safety empty (≠ safe)', tone: 'warn' })
    } else if (safetyStatus === 'error' || safetyStatus === 'timeout') {
      chips.push({ id: 'safety', label: `safety ${safetyStatus}`, tone: 'warn' })
    }
  } else if (scores?.axes.safety != null) {
    chips.push({
      id: 'safety',
      label: `safety ${Math.round(scores.axes.safety * 100)}%`,
      tone: 'evidence',
    })
  }

  if (candidate.sources.length > 0) {
    chips.push({
      id: 'sources',
      label: candidate.sources.slice(0, 3).join(' · '),
      tone: 'meta',
    })
  }

  return chips.slice(0, 8)
}

/**
 * One-line ranking rationale for a candidate card.
 */
export function buildCandidateWhy(
  candidate: CandidateMolecule,
  diseaseName?: string,
  scores?: ScoreVector | null,
): string {
  const chips = buildCandidateWhyChips(candidate, { diseaseName, scores })
  const pct = Math.round((candidate.compositeScore || 0) * 100)
  if (chips.length === 0) {
    return `Ranked #composite ${pct}% from free public APIs (deterministic rubric).`
  }
  return `Why ranked (${pct}%): ${chips.map((c) => c.label).join(' · ')}.`
}
