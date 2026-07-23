/**
 * Pure builder: research-lab / org dossier factual multi-source ledger.
 */

import {
  countDataHubSources,
  isDataHubValueEmpty,
  type DataHubDomain,
  type DataHubLedger,
  type DataHubRow,
  type DataHubSection,
} from './types'

export interface OrgDataHubInput {
  id: string
  name: string
  kind?: string | null
  query?: string | null
  builtAt?: string | null
  rorCount?: number
  openAlexCount?: number
  collegeCount?: number
  hospitalCount?: number
  grantCount?: number
  openAireCount?: number
  edgeCount?: number
  worksHint?: number
  sampleRorName?: string | null
  sampleRorId?: string | null
  sampleCollege?: string | null
  sampleHospital?: string | null
  sampleGrant?: string | null
  notes?: string[]
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

export function buildOrgDataHub(input: OrgDataHubInput): DataHubLedger {
  const id = input.id || input.query || 'org'
  const name = input.name || id
  const all: DataHubRow[] = []
  const sections: DataHubSection[] = []

  const identity: DataHubRow[] = [
    row({
      id: 'o-name',
      fact: 'Organization name',
      value: name,
      source: 'Multi-register join',
      domain: 'identity',
    }),
    row({
      id: 'o-kind',
      fact: 'Kind',
      value: input.kind || null,
      source: 'BioIntel classify',
      domain: 'identity',
      detail: 'Heuristic kind from free public bags — not a formal taxonomy',
    }),
    row({
      id: 'o-query',
      fact: 'Query',
      value: input.query || null,
      source: 'User',
      domain: 'identity',
    }),
    row({
      id: 'o-built',
      fact: 'Built at',
      value: input.builtAt
        ? new Date(input.builtAt).toISOString()
        : null,
      source: 'BioIntel',
      domain: 'identity',
    }),
  ]
  all.push(...identity)
  sections.push(section('identity', 'Identity', 'identity', identity))

  const registers: DataHubRow[] = [
    row({
      id: 'o-ror-n',
      fact: 'ROR orgs',
      value: n(input.rorCount),
      source: 'ROR',
      domain: 'other',
    }),
    row({
      id: 'o-ror-sample',
      fact: 'ROR sample',
      value: input.sampleRorName || null,
      source: 'ROR',
      sourceUrl: input.sampleRorId
        ? `https://ror.org/${encodeURIComponent(input.sampleRorId.replace(/^https?:\/\/ror\.org\//, ''))}`
        : undefined,
      domain: 'other',
    }),
    row({
      id: 'o-openalex',
      fact: 'OpenAlex institutions',
      value: n(input.openAlexCount),
      source: 'OpenAlex',
      domain: 'literature',
    }),
    row({
      id: 'o-colleges',
      fact: 'US colleges (Scorecard)',
      value: n(input.collegeCount),
      source: 'College Scorecard',
      domain: 'other',
    }),
    row({
      id: 'o-college-sample',
      fact: 'College (sample)',
      value: input.sampleCollege || null,
      source: 'College Scorecard',
      domain: 'other',
    }),
    row({
      id: 'o-hospitals',
      fact: 'CMS hospitals',
      value: n(input.hospitalCount),
      source: 'CMS Care Compare',
      domain: 'clinical',
    }),
    row({
      id: 'o-hospital-sample',
      fact: 'Hospital (sample)',
      value: input.sampleHospital || null,
      source: 'CMS Care Compare',
      domain: 'clinical',
    }),
  ]
  all.push(...registers)
  sections.push(section('registers', 'Public registers', 'other', registers))

  const research: DataHubRow[] = [
    row({
      id: 'o-grants',
      fact: 'NIH RePORTER grants',
      value: n(input.grantCount),
      source: 'NIH RePORTER',
      domain: 'literature',
    }),
    row({
      id: 'o-grant-sample',
      fact: 'Grant (sample)',
      value: input.sampleGrant || null,
      source: 'NIH RePORTER',
      domain: 'literature',
    }),
    row({
      id: 'o-openaire',
      fact: 'OpenAIRE rows',
      value: n(input.openAireCount),
      source: 'OpenAIRE',
      domain: 'literature',
    }),
    row({
      id: 'o-works',
      fact: 'Works hint',
      value: n(input.worksHint),
      source: 'OpenAlex / OpenAIRE',
      domain: 'literature',
    }),
    row({
      id: 'o-edges',
      fact: 'Affiliation join edges',
      value: n(input.edgeCount),
      source: 'Multi-register join',
      domain: 'other',
      detail: 'Token-overlap joins across free directories — affiliation context only',
    }),
  ]
  all.push(...research)
  sections.push(section('research', 'Research activity', 'literature', research))

  const nonEmpty = all.filter((r) => !isDataHubValueEmpty(r.value))
  return {
    subjectId: id,
    subjectLabel: name,
    rows: all,
    sections,
    sourceCount: countDataHubSources(all),
    empty: nonEmpty.length <= 1,
    notes: [
      'Org dossier facts from free public registers — affiliation context only.',
      ...(input.notes || []),
      'Not for clinical or regulatory decision support.',
    ],
  }
}
