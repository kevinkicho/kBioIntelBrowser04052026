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
export const SOURCE_TO_PANEL: Record<string, string> = {
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

/** Panel id for a tracked source key (or the key itself if already a panel id). */
export function panelIdForSource(sourceKey: string): string {
  return SOURCE_TO_PANEL[sourceKey] || sourceKey
}

export type SourceStatusLike = {
  status?: string
  error?: string
  has_data?: boolean
  duration_ms?: number
}

/**
 * Resolve `_sourceStatus` for a profile panel id.
 * Server keys are tracker sources (e.g. `clinicaltrials`); panel ids use hyphens (`clinical-trials`).
 */
export function sourceStatusForPanel(
  map: Record<string, SourceStatusLike> | null | undefined,
  panelId: string,
): SourceStatusLike | undefined {
  if (!map) return undefined
  if (map[panelId]) return map[panelId]
  // Direct reverse: find any tracker key that maps to this panel
  for (const [source, pid] of Object.entries(SOURCE_TO_PANEL)) {
    if (pid === panelId && map[source]) return map[source]
  }
  // Loose match (strip hyphens)
  const compact = panelId.replace(/-/g, '')
  for (const [key, val] of Object.entries(map)) {
    if (key.replace(/-/g, '') === compact) return val
  }
  return undefined
}

/**
 * Worst-case load status for a *single* panel from category API traces.
 * Never falls back to the whole category — that made every unmapped card inherit
 * another source's timeout/error (false Retry/error badges until a lone refresh).
 */
export function loadStatusFromPanelTrace(
  sources: Array<{ loadStatus?: string; panelId?: string; source?: string }>,
  panelId: string,
): DataLoadStatus | undefined {
  if (!panelId) return undefined
  const compactPanel = panelId.replace(/-/g, '')
  const related = sources.filter(
    (s) =>
      s.panelId === panelId ||
      s.source === panelId ||
      (s.panelId && s.panelId.replace(/-/g, '') === compactPanel) ||
      (s.source && s.source.replace(/-/g, '') === compactPanel),
  )
  if (related.length === 0) return undefined
  const ranks: DataLoadStatus[] = ['timeout', 'error', 'disabled', 'empty', 'loaded']
  let worst: DataLoadStatus | undefined
  for (const s of related) {
    const st = s.loadStatus as DataLoadStatus | undefined
    if (!st || !ranks.includes(st)) continue
    if (!worst || ranks.indexOf(st) < ranks.indexOf(worst)) worst = st
  }
  return worst
}

/** Prefer durable client stamp, then server API trace finish time. */
export function resolveCategoryFetchedAt(data: Record<string, unknown> | null | undefined): Date {
  if (!data) return new Date()
  const client = data._clientFetchedAt
  if (typeof client === 'string') {
    const t = Date.parse(client)
    if (Number.isFinite(t)) return new Date(t)
  }
  const trace = data._apiTrace as { finishedAt?: string } | undefined
  if (trace?.finishedAt) {
    const t = Date.parse(trace.finishedAt)
    if (Number.isFinite(t)) return new Date(t)
  }
  return new Date()
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

/**
 * Filter category trace to sources relevant to one panel card.
 * Prefer panel-matched sources only so status badges stay accurate.
 * When nothing matches, return an empty sources list (caller can still show
 * category path/timing from the outer trace fields).
 */
export function filterTraceForPanel(
  trace: CategoryApiTrace | null | undefined,
  panelId: string,
): CategoryApiTrace | null {
  if (!trace) return null
  const compactPanel = panelId.replace(/-/g, '')
  const related = trace.sources.filter(
    (s) =>
      s.panelId === panelId ||
      s.source === panelId ||
      (s.panelId && s.panelId.replace(/-/g, '') === compactPanel) ||
      (s.source && s.source.replace(/-/g, '') === compactPanel),
  )
  return { ...trace, sources: related }
}
