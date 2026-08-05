/**
 * Golden disease / molecule beachhead paths (v3 E4).
 * Pure catalog for CI, campaign spine, CLI, and demo honesty.
 * Free public APIs only — never invent associations.
 */

export type GoldenPathId =
  | 'attr'
  | 'egfr-nsclc'
  | 'cf'
  | 't2d'
  | 'aspirin-control'

export interface GoldenPath {
  id: GoldenPathId
  label: string
  diseaseQuery: string
  /** Suggested gene pins (Discover). */
  targets: string[]
  /** Example PubChem CID for profile / kit smoke (null = disease-first only). */
  exampleCid: number | null
  exampleName: string | null
  persona: 'repurposing' | 'rare-disease' | 'competitive' | 'lab-affiliation'
  campaignTemplateId: string
  playbookId: string
  /** Why this path is a beachhead anchor. */
  notes: string
  /** Rank fixture under __tests__/fixtures/discovery when present. */
  rankFixture?: string
  /** Kit expectation file under docs/golden/ when present. */
  kitExpectation?: string
  discoverHref: string
  moleculeHref: string | null
}

/** Canonical golden paths — keep in sync with docs/golden/README.md */
export const GOLDEN_PATHS: readonly GoldenPath[] = [
  {
    id: 'attr',
    label: 'ATTR amyloidosis',
    diseaseQuery: 'ATTR amyloidosis',
    targets: ['TTR'],
    exampleCid: 208901,
    exampleName: 'Tafamidis',
    persona: 'rare-disease',
    campaignTemplateId: 'campaign-rare',
    playbookId: 'rare_disease_depth',
    notes: 'Rare + repurposing story; north-star e2e fixture.',
    rankFixture: 'rank-result-attr-like.json',
    kitExpectation: 'kit-attr-smoke.json',
    discoverHref: '/discover?q=ATTR%20amyloidosis&targets=TTR',
    moleculeHref: '/molecule/208901?view=research',
  },
  {
    id: 'egfr-nsclc',
    label: 'EGFR-driven NSCLC framing',
    diseaseQuery: 'non-small cell lung cancer',
    targets: ['EGFR'],
    exampleCid: 176870,
    exampleName: 'Gefitinib',
    persona: 'repurposing',
    campaignTemplateId: 'campaign-repurposing',
    playbookId: 'disease_to_shortlist',
    notes: 'Dense public chem + trials; competitive framing.',
    rankFixture: 'rank-result-egfr-like.json',
    kitExpectation: 'kit-egfr-smoke.json',
    discoverHref: '/discover?q=non-small%20cell%20lung%20cancer&targets=EGFR',
    moleculeHref: '/molecule/176870?view=research',
  },
  {
    id: 'cf',
    label: 'Cystic fibrosis',
    diseaseQuery: 'cystic fibrosis',
    targets: ['CFTR'],
    exampleCid: null,
    exampleName: null,
    persona: 'rare-disease',
    campaignTemplateId: 'campaign-rare',
    playbookId: 'rare_disease_depth',
    notes: 'Orphanet gene pins; sparse honest empties expected.',
    kitExpectation: 'kit-cf-smoke.json',
    discoverHref: '/discover?q=cystic%20fibrosis&targets=CFTR',
    moleculeHref: null,
  },
  {
    id: 't2d',
    label: 'Type 2 diabetes mellitus',
    diseaseQuery: 'type 2 diabetes',
    targets: ['INS', 'GLP1R'],
    exampleCid: 4091,
    exampleName: 'Metformin',
    persona: 'repurposing',
    campaignTemplateId: 'campaign-repurposing',
    playbookId: 'disease_to_shortlist',
    notes: 'High public density; aspirin (2244) only as control empty gene.',
    kitExpectation: 'kit-t2d-smoke.json',
    discoverHref: '/discover?q=type%202%20diabetes&targets=INS,GLP1R',
    moleculeHref: '/molecule/4091?view=research',
  },
  {
    id: 'aspirin-control',
    label: 'Aspirin small-molecule control',
    diseaseQuery: '',
    targets: [],
    exampleCid: 2244,
    exampleName: 'Aspirin',
    persona: 'repurposing',
    campaignTemplateId: 'campaign-repurposing',
    playbookId: 'cid_evidence_deep_dive',
    notes: 'Gene leaves often EMPTY (expected control).',
    kitExpectation: 'kit-aspirin-smoke.json',
    discoverHref: '/molecule/2244?view=research',
    moleculeHref: '/molecule/2244?view=research',
  },
] as const

export function goldenPathById(id: string): GoldenPath | undefined {
  return GOLDEN_PATHS.find((p) => p.id === id)
}

export function goldenPathsByPersona(
  persona: GoldenPath['persona'],
): GoldenPath[] {
  return GOLDEN_PATHS.filter((p) => p.persona === persona)
}

/** Campaign spine chips: disease → gene → molecule → org */
export interface CampaignSpineLink {
  kind: 'disease' | 'gene' | 'molecule' | 'org' | 'campaign' | 'playbook'
  label: string
  href: string
}

export function spineLinksForGoldenPath(path: GoldenPath): CampaignSpineLink[] {
  const links: CampaignSpineLink[] = []
  if (path.diseaseQuery) {
    links.push({
      kind: 'disease',
      label: path.label,
      href: path.discoverHref,
    })
  }
  for (const t of path.targets.slice(0, 4)) {
    links.push({
      kind: 'gene',
      label: t,
      href: `/gene/${encodeURIComponent(t)}`,
    })
  }
  if (path.moleculeHref && path.exampleName) {
    links.push({
      kind: 'molecule',
      label: path.exampleName,
      href: path.moleculeHref,
    })
  }
  links.push({
    kind: 'org',
    label: 'Labs / orgs',
    href: '/orgs',
  })
  links.push({
    kind: 'campaign',
    label: 'Campaign',
    href: `/campaign?persona=${encodeURIComponent(path.persona)}&path=${encodeURIComponent(path.id)}`,
  })
  links.push({
    kind: 'playbook',
    label: path.playbookId,
    href: `/how-it-works#tools`,
  })
  return links
}
