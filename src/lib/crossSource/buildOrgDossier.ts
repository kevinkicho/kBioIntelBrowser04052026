/**
 * Pure builder: research-lab dossier multi-source first look.
 */

import {
  countActiveSources,
  emptyCrossSourceBundle,
  type CrossSourceBundle,
  type CrossSourceFact,
} from './types'

export interface OrgDossierCrossInput {
  id: string
  name: string
  rorCount?: number
  openAlexCount?: number
  collegeCount?: number
  hospitalCount?: number
  grantCount?: number
  affiliationEdgeCount?: number
  literatureCount?: number
}

export function buildOrgDossierCrossSource(input: OrgDossierCrossInput): CrossSourceBundle {
  const facts: CrossSourceFact[] = [
    {
      id: 'ror',
      label: 'ROR orgs',
      value: input.rorCount ?? 0,
      source: 'ROR',
      kind: 'org',
      tone: 'violet',
    },
    {
      id: 'openalex',
      label: 'OpenAlex institutions',
      value: input.openAlexCount ?? 0,
      source: 'OpenAlex',
      kind: 'org',
      tone: 'indigo',
    },
    {
      id: 'scorecard',
      label: 'US colleges',
      value: input.collegeCount ?? 0,
      source: 'College Scorecard',
      kind: 'org',
      tone: 'sky',
    },
    {
      id: 'cms',
      label: 'CMS hospitals',
      value: input.hospitalCount ?? 0,
      source: 'CMS Care Compare',
      kind: 'org',
      tone: 'rose',
    },
    {
      id: 'reporter',
      label: 'NIH grants',
      value: input.grantCount ?? 0,
      source: 'NIH RePORTER',
      kind: 'count',
      tone: 'amber',
    },
    {
      id: 'edges',
      label: 'Affiliation joins',
      value: input.affiliationEdgeCount ?? 0,
      source: 'Multi-register join',
      kind: 'count',
      tone: 'emerald',
      detail: 'Token-overlap edges across free public directories',
    },
    {
      id: 'lit',
      label: 'Literature rows',
      value: input.literatureCount ?? 0,
      source: 'Literature bag',
      kind: 'count',
      tone: 'slate',
    },
  ]

  const sourceCount = countActiveSources(facts)
  if (sourceCount === 0) {
    return emptyCrossSourceBundle(input.id, input.name, 'org', [
      'Dossier harvest empty — run lab pipeline to join free public registers.',
    ])
  }

  return {
    subjectId: input.id,
    subjectLabel: input.name,
    surface: 'org',
    facts,
    groups: [
      {
        id: 'dossier',
        title: 'Joined from free public registers',
        factIds: facts.map((f) => f.id),
      },
    ],
    notes: [
      'ROR · OpenAlex · Scorecard · CMS · RePORTER joined for affiliation context — not admissions or clinical referral.',
    ],
    empty: false,
    sourceCount,
  }
}
