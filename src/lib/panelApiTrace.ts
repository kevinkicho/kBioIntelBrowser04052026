/**
 * API request/response traces for profile panel transparency.
 * Built server-side on category fetch; shown in Panel detail modal.
 */

import { getPanelSource } from '@/lib/panelSources'
import { CATEGORIES, type CategoryId } from '@/lib/categoryConfig'
import type { DataLoadStatus } from '@/lib/dataStatus'

export interface ApiSourceTrace {
  /** Tracker source key (e.g. clinicaltrials) */
  source: string
  /** Related panel id if known */
  panelId?: string
  status: number
  loadStatus: DataLoadStatus | string
  duration_ms: number
  has_data: boolean
  error?: string
  endpoint?: string
  docs?: string
  apiLabel?: string
  organization?: string
}

export interface CategoryApiTrace {
  categoryId: string
  cid: number
  moleculeName?: string
  /** Client → BioIntel category route */
  requestPath: string
  method: 'GET'
  startedAt: string
  finishedAt: string
  duration_ms: number
  fromCache: boolean
  forceRefresh: boolean
  sources: ApiSourceTrace[]
  responseSummary: {
    keys: string[]
    sourceCount: number
    withData: number
    empty: number
    errors: number
    timeouts: number
  }
}

/** Map trackedSafe source keys → panel ids (best-effort). */
const SOURCE_TO_PANEL: Record<string, string> = {
  clinicaltrials: 'clinical-trials',
  adverseevents: 'adverse-events',
  recalls: 'recalls',
  'chembl-indications': 'chembl-indications',
  clinvar: 'clinvar',
  'gwas-catalog': 'gwas',
  toxcast: 'toxcast',
  sider: 'sider',
  iris: 'iris',
  'fda-drug-shortages': 'drug-shortages',
  isrctn: 'isrctn',
  chembl: 'chembl',
  bioassay: 'bioassay',
  'chembl-mechanisms': 'chembl-mechanisms',
  iuphar: 'iuphar',
  bindingdb: 'bindingdb',
  pharos: 'pharos',
  dgidb: 'dgidb',
  opentargets: 'opentargets',
  ctd: 'ctd',
  iedb: 'iedb',
  lincs: 'lincs',
  ttd: 'ttd',
  openfda: 'companies',
  'fda-ndc': 'ndc',
  orangebook: 'orange-book',
  nadac: 'nadac',
  rxnorm: 'drug-interactions',
  dailymed: 'dailymed',
  atc: 'atc',
  drugcentral: 'drugcentral',
  gsrs: 'gsrs',
  pharmgkb: 'pharmgkb',
  cpic: 'cpic',
  'string-db': 'string',
  stitch: 'stitch',
  intact: 'intact',
  reactome: 'reactome',
  wikipathways: 'wikipathways',
  'pathway-commons': 'pathway-commons',
  biocyc: 'biocyc',
  smpdb: 'smpdb',
  kegg: 'kegg',
  uniprot: 'uniprot',
  pdb: 'pdb',
  alphafold: 'alphafold',
  pubmed: 'pubmed',
  europepmc: 'literature',
  'semantic-scholar': 'semantic-scholar',
  openalex: 'open-alex',
  crossref: 'crossref',
  arxiv: 'arxiv',
  patents: 'patents',
  nihreporter: 'nih-reporter',
  secedgar: 'sec',
  'ncbi-gene': 'ncbi-gene',
  ensembl: 'ensembl',
  orphanet: 'orphanet',
  mygene: 'mygene',
  bgee: 'bgee',
  omim: 'omim',
  'pubchem-properties': 'properties',
  'pubchem-hazards': 'hazards',
  chebi: 'chebi',
  comptox: 'comptox',
  hmdb: 'hmdb',
  massbank: 'massbank',
  chemspider: 'chemspider',
}

export function categoryForPanel(panelId: string): CategoryId | null {
  for (const cat of CATEGORIES) {
    if (cat.panels.some((p) => p.id === panelId)) return cat.id
  }
  return null
}

export function enrichSourceTrace(m: {
  source: string
  status: number
  duration_ms: number
  error?: string
  has_data: boolean
  loadStatus: string
}): ApiSourceTrace {
  const panelId = SOURCE_TO_PANEL[m.source] || m.source
  const info = getPanelSource(panelId) || getPanelSource(m.source)
  return {
    source: m.source,
    panelId: SOURCE_TO_PANEL[m.source],
    status: m.status,
    loadStatus: m.loadStatus,
    duration_ms: m.duration_ms,
    has_data: m.has_data,
    error: m.error,
    endpoint: info?.endpoint,
    docs: info?.docs,
    apiLabel: info?.api,
    organization: info?.source,
  }
}

export function buildCategoryApiTrace(input: {
  categoryId: string
  cid: number
  moleculeName?: string
  requestPath: string
  startedAt: string
  finishedAt: string
  fromCache: boolean
  forceRefresh: boolean
  metrics: Array<{
    source: string
    status: number
    duration_ms: number
    error?: string
    has_data: boolean
    loadStatus: string
  }>
  dataKeys: string[]
}): CategoryApiTrace {
  const sources = input.metrics.map(enrichSourceTrace)
  const withData = sources.filter((s) => s.has_data).length
  const empty = sources.filter((s) => s.loadStatus === 'empty' || (!s.has_data && s.loadStatus === 'loaded')).length
  const errors = sources.filter((s) => s.loadStatus === 'error').length
  const timeouts = sources.filter((s) => s.loadStatus === 'timeout').length
  const start = Date.parse(input.startedAt)
  const end = Date.parse(input.finishedAt)
  return {
    categoryId: input.categoryId,
    cid: input.cid,
    moleculeName: input.moleculeName,
    requestPath: input.requestPath,
    method: 'GET',
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    duration_ms: Number.isFinite(end - start) ? end - start : 0,
    fromCache: input.fromCache,
    forceRefresh: input.forceRefresh,
    sources,
    responseSummary: {
      keys: input.dataKeys.filter((k) => !k.startsWith('_')),
      sourceCount: sources.length,
      withData,
      empty,
      errors,
      timeouts,
    },
  }
}

/** Filter category trace to sources relevant to one panel card. */
export function filterTraceForPanel(
  trace: CategoryApiTrace | null | undefined,
  panelId: string,
): CategoryApiTrace | null {
  if (!trace) return null
  const related = trace.sources.filter(
    (s) => s.panelId === panelId || s.source === panelId || s.source.replace(/-/g, '') === panelId.replace(/-/g, ''),
  )
  // If no specific match, show full category trace (honest: category is the fetch unit)
  const sources = related.length > 0 ? related : trace.sources
  return { ...trace, sources }
}
