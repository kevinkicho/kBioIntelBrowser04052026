/**
 * Pure builder: Discover candidate multi-source evidence chips.
 * Presentation only — does not change of-record scores.
 */

import {
  countActiveSources,
  emptyCrossSourceBundle,
  type CrossSourceBundle,
  type CrossSourceFact,
} from './types'

export interface DiscoverCandidateCrossInput {
  key: string
  name: string
  sources?: string[] | null
  clinicalPhase?: number | null
  trialCount?: number | null
  targetNames?: string[] | null
  evidenceBreadthSources?: string[] | null
  safetyLoaded?: boolean
  geneAssociationScore?: number | null
  compositeScore?: number | null
}

function phaseLabel(phase: number | null | undefined): string {
  if (phase == null || phase <= 0) return '—'
  if (phase >= 4) return 'Approved / P4'
  if (phase >= 3) return 'Phase III'
  if (phase >= 2) return 'Phase II'
  return 'Phase I'
}

/**
 * Build cross-source chips for one Discover shortlist card.
 */
export function buildDiscoverCandidateCrossSource(
  input: DiscoverCandidateCrossInput,
): CrossSourceBundle {
  const sources = (input.sources ?? []).filter(Boolean)
  const facts: CrossSourceFact[] = []

  for (const s of sources.slice(0, 8)) {
    facts.push({
      id: `src-${s}`,
      label: s,
      value: 'seen',
      source: s,
      kind: 'status',
      tone: 'slate',
      detail: 'Gather hit this free public source for the candidate name',
    })
  }

  if (input.trialCount != null && input.trialCount > 0) {
    facts.push({
      id: 'trials',
      label: 'Trials (gather)',
      value: input.trialCount,
      source: 'ClinicalTrials.gov',
      kind: 'count',
      tone: 'sky',
    })
  }

  if (input.clinicalPhase != null && input.clinicalPhase > 0) {
    facts.push({
      id: 'phase',
      label: 'Stage signal',
      value: phaseLabel(input.clinicalPhase),
      source: sources.includes('ClinicalTrials')
        ? 'ClinicalTrials.gov'
        : sources[0] || 'Gather',
      kind: 'axis',
      tone: 'sky',
    })
  }

  const targets = (input.targetNames ?? []).filter(Boolean).slice(0, 3)
  if (targets.length) {
    facts.push({
      id: 'targets',
      label: 'Targets',
      value: targets.join(', '),
      source: sources.find((s) => /dgidb|chembl|open targets/i.test(s)) || 'Gather',
      kind: 'entity',
      tone: 'violet',
    })
  }

  for (const s of (input.evidenceBreadthSources ?? []).slice(0, 4)) {
    if (facts.some((f) => f.source === s || f.id === `eb-${s}`)) continue
    facts.push({
      id: `eb-${s}`,
      label: s,
      value: 'breadth',
      source: s,
      kind: 'status',
      tone: 'cyan',
    })
  }

  if (input.safetyLoaded) {
    facts.push({
      id: 'safety',
      label: 'Safety harvest',
      value: 'loaded',
      source: 'openFDA / literature',
      kind: 'status',
      tone: 'amber',
      detail: 'Post-shortlist harvest; not of-record until scores merge',
    })
  }

  const sourceCount = countActiveSources(
    facts.map((f) =>
      f.value === 'seen' || f.value === 'breadth' || f.value === 'loaded'
        ? { ...f, value: 1 }
        : f,
    ),
  )

  // Treat status chips as active
  const activeSources = new Set(facts.map((f) => f.source))
  const empty = facts.length === 0

  if (empty) {
    return emptyCrossSourceBundle(input.key, input.name, 'discover', [
      'No multi-source gather hits yet for this candidate.',
    ])
  }

  return {
    subjectId: input.key,
    subjectLabel: input.name,
    surface: 'discover',
    facts,
    groups: [
      {
        id: 'gather',
        title: 'Sources that contributed',
        factIds: facts.map((f) => f.id),
      },
    ],
    notes: [
      `${activeSources.size} free-API sources contribute to this shortlist row. Of-record scores stay deterministic.`,
    ],
    empty: false,
    sourceCount: Math.max(sourceCount, activeSources.size),
  }
}
