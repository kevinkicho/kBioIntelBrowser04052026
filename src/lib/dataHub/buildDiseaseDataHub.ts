/**
 * Pure builder: disease page factual multi-source ledger.
 */

import {
  countDataHubSources,
  isDataHubValueEmpty,
  type DataHubDomain,
  type DataHubLedger,
  type DataHubRow,
  type DataHubSection,
} from './types'

export interface DiseaseDataHubInput {
  diseaseId: string
  diseaseName: string
  description?: string | null
  source?: string | null
  therapeuticAreas?: string[]
  geneCount?: number
  geneSource?: string | null
  topGenes?: string[]
  trialDrugCount?: number
  topTrialDrugs?: string[]
  moleculeCount?: number
  moleculeSources?: string[]
  topMolecules?: string[]
  orphanetHit?: boolean
  openTargetsHit?: boolean
  whoGhoCount?: number
}

function row(
  partial: Omit<DataHubRow, 'value'> & { value: string | null | undefined },
): DataHubRow {
  return { ...partial, value: partial.value?.trim() || '—' }
}

function n(v: number | null | undefined): string | null {
  if (v == null || !Number.isFinite(v) || v <= 0) return null
  return String(v)
}

function section(
  id: string,
  title: string,
  domain: DataHubDomain,
  rows: DataHubRow[],
): DataHubSection {
  return { id, title, domain, rowIds: rows.map((r) => r.id) }
}

export function buildDiseaseDataHub(input: DiseaseDataHubInput): DataHubLedger {
  const id = input.diseaseId || 'disease'
  const name = input.diseaseName || id
  const all: DataHubRow[] = []
  const sections: DataHubSection[] = []

  const identity: DataHubRow[] = [
    row({
      id: 'd-name',
      fact: 'Disease name',
      value: name,
      source: input.source || 'Open Targets',
      sourceUrl: id
        ? `https://platform.opentargets.org/disease/${encodeURIComponent(id)}`
        : undefined,
      domain: 'identity',
    }),
    row({
      id: 'd-id',
      fact: 'Disease ID',
      value: id,
      source: input.source || 'Open Targets / EFO',
      sourceUrl: id
        ? `https://platform.opentargets.org/disease/${encodeURIComponent(id)}`
        : undefined,
      domain: 'identity',
    }),
    row({
      id: 'd-desc',
      fact: 'Description',
      value: input.description ? input.description.slice(0, 180) : null,
      source: input.source || 'Open Targets',
      domain: 'identity',
    }),
    row({
      id: 'd-areas',
      fact: 'Therapeutic areas',
      value: input.therapeuticAreas?.length
        ? input.therapeuticAreas.slice(0, 6).join('; ')
        : null,
      source: input.source || 'Open Targets',
      domain: 'clinical',
    }),
    row({
      id: 'd-orphanet',
      fact: 'Orphanet linked',
      value: input.orphanetHit ? 'yes' : null,
      source: 'Orphanet',
      domain: 'clinical',
      detail: 'Presence signal only — open Orphanet for formal rare-disease records',
    }),
    row({
      id: 'd-ot',
      fact: 'Open Targets linked',
      value: input.openTargetsHit ? 'yes' : null,
      source: 'Open Targets',
      domain: 'clinical',
    }),
  ]
  all.push(...identity)
  sections.push(section('identity', 'Identity', 'identity', identity))

  const genes: DataHubRow[] = [
    row({
      id: 'd-gene-n',
      fact: 'Associated genes',
      value: n(input.geneCount),
      source: input.geneSource || 'Open Targets / DisGeNET',
      domain: 'targets',
    }),
    row({
      id: 'd-genes-sample',
      fact: 'Top genes (sample)',
      value: input.topGenes?.length ? input.topGenes.slice(0, 8).join(', ') : null,
      source: input.geneSource || 'Open Targets',
      domain: 'targets',
    }),
  ]
  all.push(...genes)
  sections.push(section('genes', 'Targets / genes', 'targets', genes))

  const clinical: DataHubRow[] = [
    row({
      id: 'd-trial-drugs',
      fact: 'Trial intervention drugs',
      value: n(input.trialDrugCount),
      source: 'ClinicalTrials.gov',
      domain: 'clinical',
    }),
    row({
      id: 'd-trial-sample',
      fact: 'Trial drugs (sample)',
      value: input.topTrialDrugs?.length
        ? input.topTrialDrugs.slice(0, 6).join(', ')
        : null,
      source: 'ClinicalTrials.gov',
      domain: 'clinical',
    }),
    row({
      id: 'd-mol-n',
      fact: 'Related molecules',
      value: n(input.moleculeCount),
      source: (input.moleculeSources ?? []).slice(0, 3).join(' · ') || 'Multi-source gather',
      domain: 'clinical',
    }),
    row({
      id: 'd-mol-sample',
      fact: 'Molecules (sample)',
      value: input.topMolecules?.length
        ? input.topMolecules.slice(0, 6).join(', ')
        : null,
      source: 'Multi-source gather',
      domain: 'clinical',
    }),
    row({
      id: 'd-who',
      fact: 'WHO GHO indicators',
      value: n(input.whoGhoCount),
      source: 'WHO GHO',
      domain: 'clinical',
      detail: 'Population indicators — not molecule-specific efficacy',
    }),
  ]
  all.push(...clinical)
  sections.push(section('clinical', 'Clinical & population', 'clinical', clinical))

  const nonEmpty = all.filter((r) => !isDataHubValueEmpty(r.value))
  return {
    subjectId: id,
    subjectLabel: name,
    rows: all,
    sections,
    sourceCount: countDataHubSources(all),
    empty: nonEmpty.length <= 2,
    notes: [
      'Disease facts joined from free public sources on this page.',
      'Not for clinical or regulatory decision support.',
    ],
  }
}
