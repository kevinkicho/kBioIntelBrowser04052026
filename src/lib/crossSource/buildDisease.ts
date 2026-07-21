/**
 * Pure builder: disease page multi-source glance.
 */

import {
  countActiveSources,
  emptyCrossSourceBundle,
  type CrossSourceBundle,
  type CrossSourceFact,
} from './types'

export interface DiseaseCrossInput {
  diseaseId: string
  diseaseName: string
  geneCount?: number
  geneSource?: string
  trialDrugCount?: number
  moleculeCount?: number
  moleculeSources?: string[]
  orphanetHit?: boolean
  openTargetsHit?: boolean
}

export function buildDiseaseCrossSource(input: DiseaseCrossInput): CrossSourceBundle {
  const facts: CrossSourceFact[] = []

  facts.push({
    id: 'genes',
    label: 'Associated genes',
    value: input.geneCount ?? 0,
    source: input.geneSource || 'Open Targets / DisGeNET',
    kind: 'count',
    tone: 'cyan',
  })

  facts.push({
    id: 'trial-drugs',
    label: 'Trial drugs',
    value: input.trialDrugCount ?? 0,
    source: 'ClinicalTrials.gov',
    kind: 'count',
    tone: 'sky',
  })

  facts.push({
    id: 'molecules',
    label: 'Related molecules',
    value: input.moleculeCount ?? 0,
    source: (input.moleculeSources ?? []).slice(0, 3).join(' · ') || 'Multi-source gather',
    kind: 'count',
    tone: 'emerald',
  })

  if (input.orphanetHit) {
    facts.push({
      id: 'orphanet',
      label: 'Orphanet',
      value: 'linked',
      source: 'Orphanet',
      kind: 'status',
      tone: 'rose',
    })
  }
  if (input.openTargetsHit) {
    facts.push({
      id: 'ot',
      label: 'Open Targets',
      value: 'linked',
      source: 'Open Targets',
      kind: 'status',
      tone: 'indigo',
    })
  }

  const active = new Set(facts.filter((f) => f.value !== 0 && f.value !== '—').map((f) => f.source))
  if (active.size === 0) {
    return emptyCrossSourceBundle(input.diseaseId, input.diseaseName, 'disease', [
      'No multi-source disease evidence loaded yet.',
    ])
  }

  // Normalize status for countActiveSources
  const forCount = facts.map((f) =>
    f.value === 'linked' ? { ...f, value: 1 } : f,
  )

  return {
    subjectId: input.diseaseId,
    subjectLabel: input.diseaseName,
    surface: 'disease',
    facts,
    groups: [
      {
        id: 'disease-join',
        title: 'Joined disease evidence',
        factIds: facts.map((f) => f.id),
      },
    ],
    notes: [
      'Genes, trial interventions, and molecules from free public APIs — each chip keeps its source.',
    ],
    empty: false,
    sourceCount: Math.max(countActiveSources(forCount), active.size),
  }
}
