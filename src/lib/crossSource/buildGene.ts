/**
 * Pure builder: gene page multi-source glance (chips per API — not merged tables).
 */

import {
  countActiveSources,
  emptyCrossSourceBundle,
  type CrossSourceBundle,
  type CrossSourceFact,
  type CrossSourceGroup,
} from './types'

function factCount(
  id: string,
  label: string,
  value: number,
  source: string,
  tone: CrossSourceFact['tone'],
  panelId?: string,
): CrossSourceFact {
  return {
    id,
    label,
    value,
    source,
    kind: 'count',
    tone,
    panelId,
  }
}

export interface GeneCrossInput {
  symbol: string
  gtexCount?: number
  bgeeCount?: number
  expressionAtlasCount?: number
  reactomeCount?: number
  wikiPathwaysCount?: number
  goCount?: number
  clinvarCount?: number
  dbsnpCount?: number
  clingenCount?: number
  disgenetCount?: number
  gwasCount?: number
  dgidbDrugCount?: number
  openTargetsCount?: number
}

export function buildGeneCrossSource(input: GeneCrossInput): CrossSourceBundle {
  const facts: CrossSourceFact[] = []
  const groups: CrossSourceGroup[] = []

  const expr: CrossSourceFact[] = [
    factCount('gtex', 'GTEx', input.gtexCount ?? 0, 'GTEx', 'sky', 'gtex'),
    factCount('bgee', 'Bgee', input.bgeeCount ?? 0, 'Bgee', 'cyan', 'bgee'),
    factCount(
      'atlas',
      'Expression Atlas',
      input.expressionAtlasCount ?? 0,
      'Expression Atlas',
      'indigo',
      'expression-atlas',
    ),
  ]
  facts.push(...expr)
  groups.push({ id: 'expression', title: 'Expression', factIds: expr.map((f) => f.id) })

  const path: CrossSourceFact[] = [
    factCount('reactome', 'Reactome', input.reactomeCount ?? 0, 'Reactome', 'violet', 'reactome'),
    factCount(
      'wikipathways',
      'WikiPathways',
      input.wikiPathwaysCount ?? 0,
      'WikiPathways',
      'violet',
      'wikipathways',
    ),
    factCount('go', 'Gene Ontology', input.goCount ?? 0, 'QuickGO', 'slate', 'go'),
  ]
  facts.push(...path)
  groups.push({ id: 'pathways', title: 'Pathways', factIds: path.map((f) => f.id) })

  const variants: CrossSourceFact[] = [
    factCount('clinvar', 'ClinVar', input.clinvarCount ?? 0, 'ClinVar', 'amber', 'clinvar'),
    factCount('dbsnp', 'dbSNP', input.dbsnpCount ?? 0, 'dbSNP', 'amber', 'dbsnp'),
    factCount('clingen', 'ClinGen', input.clingenCount ?? 0, 'ClinGen', 'amber', 'clingen'),
  ]
  facts.push(...variants)
  groups.push({ id: 'variants', title: 'Variants', factIds: variants.map((f) => f.id) })

  const disease: CrossSourceFact[] = [
    factCount('disgenet', 'DisGeNET', input.disgenetCount ?? 0, 'DisGeNET', 'rose', 'disgenet'),
    factCount('gwas', 'GWAS Catalog', input.gwasCount ?? 0, 'GWAS Catalog', 'rose', 'gwas'),
    factCount(
      'ot',
      'Open Targets',
      input.openTargetsCount ?? 0,
      'Open Targets',
      'cyan',
      'opentargets',
    ),
    factCount('dgidb', 'DGIdb drugs', input.dgidbDrugCount ?? 0, 'DGIdb', 'emerald', 'dgidb'),
  ]
  facts.push(...disease)
  groups.push({ id: 'disease', title: 'Disease & drugs', factIds: disease.map((f) => f.id) })

  const sourceCount = countActiveSources(facts)
  if (sourceCount === 0) {
    return emptyCrossSourceBundle(input.symbol, input.symbol, 'gene', [
      'Load gene sections to compare free public sources side-by-side. Tables stay one-API per card.',
    ])
  }

  return {
    subjectId: input.symbol,
    subjectLabel: input.symbol,
    surface: 'gene',
    facts,
    groups,
    notes: [
      `${sourceCount} free public sources with data. Chips open the matching source card — list bodies are not merged.`,
    ],
    empty: false,
    sourceCount,
  }
}
