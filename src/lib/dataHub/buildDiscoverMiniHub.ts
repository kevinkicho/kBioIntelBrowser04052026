/**
 * Compact of-record fact ledger for one Discover candidate card.
 * Presentation only — does not change of-record rank scores.
 */

import { originSourceDeepLink } from '@/lib/originDeepLinks'
import {
  countDataHubSources,
  isDataHubValueEmpty,
  type DataHubLedger,
  type DataHubRow,
  type DataHubSection,
} from './types'

export interface DiscoverMiniHubInput {
  key: string
  name: string
  cid?: number | null
  chemblId?: string | null
  diseaseName?: string | null
  sources?: string[] | null
  clinicalPhase?: number | null
  trialCount?: number | null
  targetNames?: string[] | null
  geneAssociationScore?: number | null
  compositeScore?: number | null
  identityTrust?: number | null
  evidenceBreadthSources?: string[] | null
}

function row(
  partial: Omit<DataHubRow, 'value'> & { value: string | null | undefined },
): DataHubRow {
  return { ...partial, value: partial.value?.trim() || '—' }
}

function phaseLabel(phase: number | null | undefined): string | null {
  if (phase == null || phase <= 0) return null
  if (phase >= 4) return 'Approved / Phase IV signal'
  if (phase >= 3) return 'Phase III signal'
  if (phase >= 2) return 'Phase II signal'
  return 'Phase I signal'
}

/**
 * 6–10 research-oriented facts for a Discover shortlist card.
 */
export function buildDiscoverMiniHub(input: DiscoverMiniHubInput): DataHubLedger {
  const name = input.name || 'candidate'
  const cid = input.cid ?? null
  const sources = (input.sources ?? []).filter(Boolean)
  const targets = (input.targetNames ?? []).filter(Boolean)
  const all: DataHubRow[] = []

  const ctx = {
    name,
    cid: cid ?? undefined,
    chemblId: input.chemblId,
    diseaseName: input.diseaseName,
  }

  const pubchem = originSourceDeepLink('PubChem', ctx)
  const chembl = originSourceDeepLink('ChEMBL', ctx)
  const ct = originSourceDeepLink('ClinicalTrials', ctx)

  all.push(
    row({
      id: 'm-name',
      fact: 'Candidate name',
      value: name,
      source: sources[0] || 'Discover gather',
      domain: 'identity',
    }),
    row({
      id: 'm-cid',
      fact: 'PubChem CID',
      value: cid != null ? String(cid) : null,
      source: 'PubChem',
      sourceUrl: pubchem.href ?? (cid != null ? `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}` : undefined),
      domain: 'identity',
    }),
    row({
      id: 'm-chembl',
      fact: 'ChEMBL ID',
      value: input.chemblId || null,
      source: 'ChEMBL',
      sourceUrl: chembl.href ?? undefined,
      domain: 'identity',
    }),
    row({
      id: 'm-phase',
      fact: 'Clinical stage signal',
      value: phaseLabel(input.clinicalPhase),
      source: sources.includes('ClinicalTrials') ? 'ClinicalTrials.gov' : sources[0] || 'Gather',
      sourceUrl: ct.href ?? undefined,
      domain: 'clinical',
      detail: 'Gather-time signal — open CT.gov for primary records',
    }),
    row({
      id: 'm-trials',
      fact: 'Trial count (gather)',
      value:
        input.trialCount != null && input.trialCount > 0
          ? String(input.trialCount)
          : null,
      source: 'ClinicalTrials.gov',
      sourceUrl: ct.href ?? undefined,
      domain: 'clinical',
    }),
    row({
      id: 'm-targets',
      fact: 'Targets (sample)',
      value: targets.length ? targets.slice(0, 4).join(', ') : null,
      source:
        sources.find((s) => /dgidb|chembl|open targets/i.test(s)) || 'DGIdb / ChEMBL',
      domain: 'targets',
    }),
    row({
      id: 'm-sources',
      fact: 'Gather sources',
      value: sources.length ? sources.slice(0, 6).join(' · ') : null,
      source: 'Discover gather',
      domain: 'other',
      detail: 'Free public APIs that contributed to this shortlist row',
    }),
    row({
      id: 'm-disease',
      fact: 'Disease context',
      value: input.diseaseName || null,
      source: 'User / Discover',
      domain: 'clinical',
    }),
  )

  if (input.geneAssociationScore != null && input.geneAssociationScore > 0) {
    all.push(
      row({
        id: 'm-gene-score',
        fact: 'Gene association (norm)',
        value: input.geneAssociationScore.toFixed(2),
        source: 'Open Targets / DisGeNET gather',
        domain: 'targets',
        detail: 'Normalized gather axis — inspect Discover score bars for weights',
      }),
    )
  }

  if (input.identityTrust != null && input.identityTrust > 0) {
    all.push(
      row({
        id: 'm-id-trust',
        fact: 'Identity trust',
        value: input.identityTrust.toFixed(2),
        source: 'Identity resolver',
        domain: 'identity',
      }),
    )
  }

  const sections: DataHubSection[] = [
    {
      id: 'mini',
      title: 'Research facts (gather)',
      domain: 'other',
      rowIds: all.map((r) => r.id),
    },
  ]

  const nonEmpty = all.filter((r) => !isDataHubValueEmpty(r.value))
  return {
    subjectId: input.key || (cid != null ? `cid:${cid}` : name),
    subjectLabel: name,
    rows: all,
    sections,
    sourceCount: countDataHubSources(all),
    empty: nonEmpty.length <= 1,
    notes: [
      'Mini hub from Discover gather signals — not a full profile re-query.',
      'Open the molecule profile Data hub for multi-panel public records.',
      'Of-record rank scores are separate; this ledger does not change ranking.',
    ],
  }
}
