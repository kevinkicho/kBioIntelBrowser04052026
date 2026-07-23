/**
 * Pure builder: gene page factual multi-source ledger.
 */

import {
  countDataHubSources,
  isDataHubValueEmpty,
  type DataHubDomain,
  type DataHubLedger,
  type DataHubRow,
  type DataHubSection,
} from './types'

export interface GeneDataHubInput {
  symbol: string
  geneId?: string | null
  name?: string | null
  description?: string | null
  organism?: string | null
  /** Counts / samples already loaded on the gene page */
  gtexCount?: number
  bgeeCount?: number
  expressionAtlasCount?: number
  topTissue?: string | null
  reactomeCount?: number
  wikiPathwaysCount?: number
  goCount?: number
  topPathway?: string | null
  clinvarCount?: number
  dbsnpCount?: number
  clingenCount?: number
  topClinvar?: string | null
  disgenetCount?: number
  gwasCount?: number
  openTargetsCount?: number
  topDisease?: string | null
  dgidbDrugCount?: number
  topDrug?: string | null
  uniprotAccession?: string | null
  ensemblId?: string | null
  ncbiGeneId?: string | null
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

export function buildGeneDataHub(input: GeneDataHubInput): DataHubLedger {
  const symbol = (input.symbol || '').trim() || 'gene'
  const all: DataHubRow[] = []
  const sections: DataHubSection[] = []

  const identity: DataHubRow[] = [
    row({
      id: 'g-symbol',
      fact: 'Gene symbol',
      value: symbol,
      source: 'NCBI Gene / HGNC',
      sourceUrl: input.ncbiGeneId
        ? `https://www.ncbi.nlm.nih.gov/gene/${encodeURIComponent(input.ncbiGeneId)}`
        : `https://www.ncbi.nlm.nih.gov/gene/?term=${encodeURIComponent(symbol)}[sym]`,
      domain: 'identity',
    }),
    row({
      id: 'g-name',
      fact: 'Gene name',
      value: input.name || null,
      source: 'NCBI Gene',
      domain: 'identity',
    }),
    row({
      id: 'g-ncbi',
      fact: 'NCBI Gene ID',
      value: input.ncbiGeneId || input.geneId || null,
      source: 'NCBI Gene',
      sourceUrl: (input.ncbiGeneId || input.geneId)
        ? `https://www.ncbi.nlm.nih.gov/gene/${encodeURIComponent(String(input.ncbiGeneId || input.geneId))}`
        : undefined,
      domain: 'identity',
    }),
    row({
      id: 'g-ensembl',
      fact: 'Ensembl ID',
      value: input.ensemblId || null,
      source: 'Ensembl',
      sourceUrl: input.ensemblId
        ? `https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${encodeURIComponent(input.ensemblId)}`
        : undefined,
      domain: 'identity',
    }),
    row({
      id: 'g-uniprot',
      fact: 'UniProt accession',
      value: input.uniprotAccession || null,
      source: 'UniProt',
      sourceUrl: input.uniprotAccession
        ? `https://www.uniprot.org/uniprotkb/${encodeURIComponent(input.uniprotAccession)}`
        : undefined,
      domain: 'identity',
    }),
    row({
      id: 'g-organism',
      fact: 'Organism',
      value: input.organism || 'Homo sapiens',
      source: 'NCBI Gene',
      domain: 'identity',
    }),
    row({
      id: 'g-desc',
      fact: 'Description',
      value: input.description ? input.description.slice(0, 160) : null,
      source: 'NCBI Gene',
      domain: 'identity',
    }),
  ]
  all.push(...identity)
  sections.push(section('identity', 'Identity', 'identity', identity))

  const expr: DataHubRow[] = [
    row({
      id: 'g-gtex',
      fact: 'GTEx expression rows',
      value: n(input.gtexCount),
      source: 'GTEx',
      panelId: 'gtex',
      domain: 'other',
    }),
    row({
      id: 'g-bgee',
      fact: 'Bgee expression rows',
      value: n(input.bgeeCount),
      source: 'Bgee',
      panelId: 'bgee',
      domain: 'other',
    }),
    row({
      id: 'g-atlas',
      fact: 'Expression Atlas rows',
      value: n(input.expressionAtlasCount),
      source: 'Expression Atlas',
      panelId: 'expression-atlas',
      domain: 'other',
    }),
    row({
      id: 'g-tissue',
      fact: 'Top tissue (sample)',
      value: input.topTissue || null,
      source: 'GTEx / Bgee',
      domain: 'other',
    }),
  ]
  all.push(...expr)
  sections.push(section('expression', 'Expression', 'other', expr))

  const path: DataHubRow[] = [
    row({
      id: 'g-reactome',
      fact: 'Reactome pathways',
      value: n(input.reactomeCount),
      source: 'Reactome',
      panelId: 'reactome',
      domain: 'targets',
    }),
    row({
      id: 'g-wp',
      fact: 'WikiPathways',
      value: n(input.wikiPathwaysCount),
      source: 'WikiPathways',
      panelId: 'wikipathways',
      domain: 'targets',
    }),
    row({
      id: 'g-go',
      fact: 'Gene Ontology terms',
      value: n(input.goCount),
      source: 'QuickGO',
      panelId: 'go',
      domain: 'targets',
    }),
    row({
      id: 'g-pathway-sample',
      fact: 'Pathway (sample)',
      value: input.topPathway || null,
      source: 'Reactome / WikiPathways',
      domain: 'targets',
    }),
  ]
  all.push(...path)
  sections.push(section('pathways', 'Pathways & ontology', 'targets', path))

  const varRows: DataHubRow[] = [
    row({
      id: 'g-clinvar',
      fact: 'ClinVar variants',
      value: n(input.clinvarCount),
      source: 'ClinVar',
      panelId: 'clinvar',
      domain: 'clinical',
    }),
    row({
      id: 'g-dbsnp',
      fact: 'dbSNP variants',
      value: n(input.dbsnpCount),
      source: 'dbSNP',
      panelId: 'dbsnp',
      domain: 'clinical',
    }),
    row({
      id: 'g-clingen',
      fact: 'ClinGen rows',
      value: n(input.clingenCount),
      source: 'ClinGen',
      panelId: 'clingen',
      domain: 'clinical',
    }),
    row({
      id: 'g-clinvar-sample',
      fact: 'ClinVar sample',
      value: input.topClinvar || null,
      source: 'ClinVar',
      domain: 'clinical',
    }),
  ]
  all.push(...varRows)
  sections.push(section('variants', 'Variants', 'clinical', varRows))

  const dis: DataHubRow[] = [
    row({
      id: 'g-disgenet',
      fact: 'DisGeNET associations',
      value: n(input.disgenetCount),
      source: 'DisGeNET',
      panelId: 'disgenet',
      domain: 'clinical',
    }),
    row({
      id: 'g-gwas',
      fact: 'GWAS Catalog hits',
      value: n(input.gwasCount),
      source: 'GWAS Catalog',
      panelId: 'gwas',
      domain: 'clinical',
    }),
    row({
      id: 'g-ot',
      fact: 'Open Targets associations',
      value: n(input.openTargetsCount),
      source: 'Open Targets',
      panelId: 'opentargets',
      domain: 'clinical',
    }),
    row({
      id: 'g-disease-sample',
      fact: 'Disease (sample)',
      value: input.topDisease || null,
      source: 'DisGeNET / Open Targets',
      domain: 'clinical',
    }),
  ]
  all.push(...dis)
  sections.push(section('disease', 'Disease associations', 'clinical', dis))

  const drugs: DataHubRow[] = [
    row({
      id: 'g-dgidb',
      fact: 'DGIdb drugs',
      value: n(input.dgidbDrugCount),
      source: 'DGIdb',
      panelId: 'dgidb',
      domain: 'targets',
    }),
    row({
      id: 'g-drug-sample',
      fact: 'Drug (sample)',
      value: input.topDrug || null,
      source: 'DGIdb',
      domain: 'targets',
    }),
  ]
  all.push(...drugs)
  sections.push(section('drugs', 'Drug interactions', 'targets', drugs))

  const nonEmpty = all.filter((r) => !isDataHubValueEmpty(r.value))
  return {
    subjectId: symbol,
    subjectLabel: symbol,
    rows: all,
    sections,
    sourceCount: countDataHubSources(all),
    empty: nonEmpty.length <= 2,
    notes: [
      'Gene facts from free public APIs loaded on this page — not model-generated.',
      'Counts are session samples. Open source panels for full tables.',
      'Not for clinical decision support.',
    ],
  }
}
