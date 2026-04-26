import path from 'path'
import fs from 'fs'

const DB_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DB_DIR, 'analytics.json')

interface MetricRow {
  id: number
  source: string
  endpoint: string
  status: number
  duration_ms: number
  error: string | null
  has_data: number
  items_count: number | null
  timestamp: string
}

export interface SourceSummary {
  source: string
  total_requests: number
  success_count: number
  error_count: number
  empty_count: number
  avg_duration_ms: number
  p50_ms: number
  p95_ms: number
  last_success_at: string | null
  last_error: string | null
  last_error_at: string | null
  success_rate: number
}

export interface ApiSummary extends SourceSummary {
  category: string
  categoryLabel: string
  categoryIcon: string
}

export interface CategoryGroup {
  id: string
  label: string
  icon: string
  apis: ApiSummary[]
  total_requests: number
  success_count: number
  error_count: number
  empty_count: number
  success_rate: number
  avg_duration_ms: number
}

export interface DailySnapshot {
  date: string
  source: string
  total_requests: number
  success_count: number
  error_count: number
  avg_duration_ms: number
}

export interface ApiMetricRow {
  id: number
  source: string
  endpoint: string
  status: number
  duration_ms: number
  error: string | null
  has_data: number
  items_count: number | null
  timestamp: string
}

export interface HourlyBucket {
  hour: string
  total: number
  success: number
  errors: number
  avg_ms: number
}

export interface StatusCodeEntry {
  status: number
  count: number
}

export interface ErrorBucket {
  message: string
  count: number
  last_at: string
}

export interface ApiDetail {
  source: string
  category: { id: string; label: string; icon: string } | null
  total_requests: number
  success_count: number
  error_count: number
  empty_count: number
  success_rate: number
  avg_duration_ms: number
  p50_ms: number
  p95_ms: number
  p99_ms: number
  min_ms: number
  max_ms: number
  consecutive_errors: number
  consecutive_successes: number
  first_seen: string
  last_seen: string
  status_codes: StatusCodeEntry[]
  top_errors: ErrorBucket[]
  hourly_distribution: HourlyBucket[]
  daily_trend: DailySnapshot[]
  recent_calls: ApiMetricRow[]
}

const API_CATEGORY_MAP: Record<string, { id: string; label: string; icon: string }> = {
  'category:pharmaceutical': { id: 'pharmaceutical', label: 'Pharmaceutical', icon: '💊' },
  'category:clinical-safety': { id: 'clinical-safety', label: 'Clinical & Safety', icon: '🏥' },
  'category:molecular-chemical': { id: 'molecular-chemical', label: 'Molecular & Chemical', icon: '🧪' },
  'category:bioactivity-targets': { id: 'bioactivity-targets', label: 'Bioactivity & Targets', icon: '🎯' },
  'category:protein-structure': { id: 'protein-structure', label: 'Protein & Structure', icon: '🧬' },
  'category:genomics-disease': { id: 'genomics-disease', label: 'Genomics & Disease', icon: '🧫' },
  'category:interactions-pathways': { id: 'interactions-pathways', label: 'Interactions & Pathways', icon: '🔗' },
  'category:nih-high-impact': { id: 'nih-high-impact', label: 'NIH High-Impact', icon: '🏥' },
  'category:research-literature': { id: 'research-literature', label: 'Research & Literature', icon: '📚' },

  openfda: { id: 'pharmaceutical', label: 'Pharmaceutical', icon: '💊' },
  'fda-ndc': { id: 'pharmaceutical', label: 'Pharmaceutical', icon: '💊' },
  orangebook: { id: 'pharmaceutical', label: 'Pharmaceutical', icon: '💊' },
  nadac: { id: 'pharmaceutical', label: 'Pharmaceutical', icon: '💊' },
  rxnorm: { id: 'pharmaceutical', label: 'Pharmaceutical', icon: '💊' },
  dailymed: { id: 'pharmaceutical', label: 'Pharmaceutical', icon: '💊' },
  atc: { id: 'pharmaceutical', label: 'Pharmaceutical', icon: '💊' },
  drugcentral: { id: 'pharmaceutical', label: 'Pharmaceutical', icon: '💊' },
  gsrs: { id: 'pharmaceutical', label: 'Pharmaceutical', icon: '💊' },
  pharmgkb: { id: 'pharmaceutical', label: 'Pharmaceutical', icon: '💊' },
  cpic: { id: 'pharmaceutical', label: 'Pharmaceutical', icon: '💊' },

  clinicaltrials: { id: 'clinical-safety', label: 'Clinical & Safety', icon: '🏥' },
  isrctn: { id: 'clinical-safety', label: 'Clinical & Safety', icon: '🏥' },
  adverseevents: { id: 'clinical-safety', label: 'Clinical & Safety', icon: '🏥' },
  recalls: { id: 'clinical-safety', label: 'Clinical & Safety', icon: '🏥' },
  'chembl-indications': { id: 'clinical-safety', label: 'Clinical & Safety', icon: '🏥' },
  clinvar: { id: 'clinical-safety', label: 'Clinical & Safety', icon: '🏥' },
  'gwas-catalog': { id: 'clinical-safety', label: 'Clinical & Safety', icon: '🏥' },
  toxcast: { id: 'clinical-safety', label: 'Clinical & Safety', icon: '🏥' },
  sider: { id: 'clinical-safety', label: 'Clinical & Safety', icon: '🏥' },
  iris: { id: 'clinical-safety', label: 'Clinical & Safety', icon: '🏥' },
  'fda-drug-shortages': { id: 'clinical-safety', label: 'Clinical & Safety', icon: '🏥' },

  'pubchem-properties': { id: 'molecular-chemical', label: 'Molecular & Chemical', icon: '🧪' },
  'pubchem-hazards': { id: 'molecular-chemical', label: 'Molecular & Chemical', icon: '🧪' },
  chebi: { id: 'molecular-chemical', label: 'Molecular & Chemical', icon: '🧪' },
  comptox: { id: 'molecular-chemical', label: 'Molecular & Chemical', icon: '🧪' },
  'synthesis-routes': { id: 'molecular-chemical', label: 'Molecular & Chemical', icon: '🧪' },
  metabolomics: { id: 'molecular-chemical', label: 'Molecular & Chemical', icon: '🧪' },
  mychem: { id: 'molecular-chemical', label: 'Molecular & Chemical', icon: '🧪' },
  hmdb: { id: 'molecular-chemical', label: 'Molecular & Chemical', icon: '🧪' },
  massbank: { id: 'molecular-chemical', label: 'Molecular & Chemical', icon: '🧪' },
  chemspider: { id: 'molecular-chemical', label: 'Molecular & Chemical', icon: '🧪' },
  metabolights: { id: 'molecular-chemical', label: 'Molecular & Chemical', icon: '🧪' },
  'gnps-library': { id: 'molecular-chemical', label: 'Molecular & Chemical', icon: '🧪' },
  lipidmaps: { id: 'molecular-chemical', label: 'Molecular & Chemical', icon: '🧪' },
  unichem: { id: 'molecular-chemical', label: 'Molecular & Chemical', icon: '🧪' },
  foodb: { id: 'molecular-chemical', label: 'Molecular & Chemical', icon: '🧪' },

  chembl: { id: 'bioactivity-targets', label: 'Bioactivity & Targets', icon: '🎯' },
  bioassay: { id: 'bioactivity-targets', label: 'Bioactivity & Targets', icon: '🎯' },
  'chembl-mechanisms': { id: 'bioactivity-targets', label: 'Bioactivity & Targets', icon: '🎯' },
  iuphar: { id: 'bioactivity-targets', label: 'Bioactivity & Targets', icon: '🎯' },
  bindingdb: { id: 'bioactivity-targets', label: 'Bioactivity & Targets', icon: '🎯' },
  pharos: { id: 'bioactivity-targets', label: 'Bioactivity & Targets', icon: '🎯' },
  dgidb: { id: 'bioactivity-targets', label: 'Bioactivity & Targets', icon: '🎯' },
  opentargets: { id: 'bioactivity-targets', label: 'Bioactivity & Targets', icon: '🎯' },
  ctd: { id: 'bioactivity-targets', label: 'Bioactivity & Targets', icon: '🎯' },
  iedb: { id: 'bioactivity-targets', label: 'Bioactivity & Targets', icon: '🎯' },
  lincs: { id: 'bioactivity-targets', label: 'Bioactivity & Targets', icon: '🎯' },
  ttd: { id: 'bioactivity-targets', label: 'Bioactivity & Targets', icon: '🎯' },

  uniprot: { id: 'protein-structure', label: 'Protein & Structure', icon: '🧬' },
  pdb: { id: 'protein-structure', label: 'Protein & Structure', icon: '🧬' },
  'pdbe-ligands': { id: 'protein-structure', label: 'Protein & Structure', icon: '🧬' },
  pride: { id: 'protein-structure', label: 'Protein & Structure', icon: '🧬' },
  cath: { id: 'protein-structure', label: 'Protein & Structure', icon: '🧬' },
  sabdab: { id: 'protein-structure', label: 'Protein & Structure', icon: '🧬' },
  alphafold: { id: 'protein-structure', label: 'Protein & Structure', icon: '🧬' },
  'protein-atlas': { id: 'protein-structure', label: 'Protein & Structure', icon: '🧬' },
  peptideatlas: { id: 'protein-structure', label: 'Protein & Structure', icon: '🧬' },
  'gene3d': { id: 'protein-structure', label: 'Protein & Structure', icon: '🧬' },

  'ncbi-gene': { id: 'genomics-disease', label: 'Genomics & Disease', icon: '🧫' },
  ensembl: { id: 'genomics-disease', label: 'Genomics & Disease', icon: '🧫' },
  'expression-atlas': { id: 'genomics-disease', label: 'Genomics & Disease', icon: '🧫' },
  gtex: { id: 'genomics-disease', label: 'Genomics & Disease', icon: '🧫' },
  geo: { id: 'genomics-disease', label: 'Genomics & Disease', icon: '🧫' },
  dbsnp: { id: 'genomics-disease', label: 'Genomics & Disease', icon: '🧫' },
  clingen: { id: 'genomics-disease', label: 'Genomics & Disease', icon: '🧫' },
  medgen: { id: 'genomics-disease', label: 'Genomics & Disease', icon: '🧫' },
  monarch: { id: 'genomics-disease', label: 'Genomics & Disease', icon: '🧫' },
  'nci-thesaurus': { id: 'genomics-disease', label: 'Genomics & Disease', icon: '🧫' },
  mesh: { id: 'genomics-disease', label: 'Genomics & Disease', icon: '🧫' },
  disgenet: { id: 'genomics-disease', label: 'Genomics & Disease', icon: '🧫' },
  orphanet: { id: 'genomics-disease', label: 'Genomics & Disease', icon: '🧫' },
  mygene: { id: 'genomics-disease', label: 'Genomics & Disease', icon: '🧫' },
  bgee: { id: 'genomics-disease', label: 'Genomics & Disease', icon: '🧫' },
  omim: { id: 'genomics-disease', label: 'Genomics & Disease', icon: '🧫' },
  'gene-ontology': { id: 'genomics-disease', label: 'Genomics & Disease', icon: '🧫' },
  hpo: { id: 'genomics-disease', label: 'Genomics & Disease', icon: '🧫' },
  ols: { id: 'genomics-disease', label: 'Genomics & Disease', icon: '🧫' },
  biomodels: { id: 'genomics-disease', label: 'Genomics & Disease', icon: '🧫' },
  biosamples: { id: 'genomics-disease', label: 'Genomics & Disease', icon: '🧫' },
  massive: { id: 'genomics-disease', label: 'Genomics & Disease', icon: '🧫' },

  'string-db': { id: 'interactions-pathways', label: 'Interactions & Pathways', icon: '🔗' },
  stitch: { id: 'interactions-pathways', label: 'Interactions & Pathways', icon: '🔗' },
  intact: { id: 'interactions-pathways', label: 'Interactions & Pathways', icon: '🔗' },
  reactome: { id: 'interactions-pathways', label: 'Interactions & Pathways', icon: '🔗' },
  wikipathways: { id: 'interactions-pathways', label: 'Interactions & Pathways', icon: '🔗' },
  'pathway-commons': { id: 'interactions-pathways', label: 'Interactions & Pathways', icon: '🔗' },
  biocyc: { id: 'interactions-pathways', label: 'Interactions & Pathways', icon: '🔗' },
  smpdb: { id: 'interactions-pathways', label: 'Interactions & Pathways', icon: '🔗' },
  kegg: { id: 'interactions-pathways', label: 'Interactions & Pathways', icon: '🔗' },

  europepmc: { id: 'research-literature', label: 'Research & Literature', icon: '📚' },
  nihreporter: { id: 'research-literature', label: 'Research & Literature', icon: '📚' },
  patents: { id: 'research-literature', label: 'Research & Literature', icon: '📚' },
  secedgar: { id: 'research-literature', label: 'Research & Literature', icon: '📚' },
  'semantic-scholar': { id: 'research-literature', label: 'Research & Literature', icon: '📚' },
  openalex: { id: 'research-literature', label: 'Research & Literature', icon: '📚' },
  pubmed: { id: 'research-literature', label: 'Research & Literature', icon: '📚' },
  opencitations: { id: 'research-literature', label: 'Research & Literature', icon: '📚' },
  crossref: { id: 'research-literature', label: 'Research & Literature', icon: '📚' },
  arxiv: { id: 'research-literature', label: 'Research & Literature', icon: '📚' },

  'ncats-translator': { id: 'nih-high-impact', label: 'NIH High-Impact', icon: '🏥' },
  'nci-cadsr': { id: 'nih-high-impact', label: 'NIH High-Impact', icon: '🏥' },
  'nhgri-anvil': { id: 'nih-high-impact', label: 'NIH High-Impact', icon: '🏥' },
  'niaid-immport': { id: 'nih-high-impact', label: 'NIH High-Impact', icon: '🏥' },
  'ninds-neurommsig': { id: 'nih-high-impact', label: 'NIH High-Impact', icon: '🏥' },

  search: { id: 'search', label: 'Search', icon: '🔍' },
  similar: { id: 'search', label: 'Search', icon: '🔍' },
}

const CATEGORY_ORDER = [
  'pharmaceutical',
  'clinical-safety',
  'molecular-chemical',
  'bioactivity-targets',
  'protein-structure',
  'genomics-disease',
  'interactions-pathways',
  'nih-high-impact',
  'research-literature',
  'gene',
  'search',
]

let _rows: MetricRow[] = []
let _nextId = 1
let _writeTimer: ReturnType<typeof setTimeout> | null = null

const MAX_ROWS = 50000
const PURGE_AGE_DAYS = 30

function maybePurge(): void {
  if (_rows.length <= MAX_ROWS) return
  const cutoff = new Date(Date.now() - PURGE_AGE_DAYS * 86400000).toISOString()
  _rows = _rows.filter(r => r.timestamp >= cutoff)
  if (_rows.length > MAX_ROWS) {
    _rows = _rows.slice(-MAX_ROWS)
  }
}

function load(): MetricRow[] {
  if (_rows.length > 0) return _rows
  try {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8')
      _rows = JSON.parse(raw)
      _nextId = _rows.length > 0 ? Math.max(..._rows.map(r => r.id)) + 1 : 1
    } else {
      _rows = []
      _nextId = 1
    }
  } catch {
    _rows = []
    _nextId = 1
  }
  return _rows
}

function scheduleWrite() {
  if (_writeTimer) clearTimeout(_writeTimer)
  _writeTimer = setTimeout(() => {
    try {
      if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })
      fs.writeFileSync(DB_PATH, JSON.stringify(_rows, null, 2), 'utf-8')
    } catch (err) {
      console.error('[analytics] Failed to write:', err)
    }
  }, 1000)
}

export function recordMetric(metric: {
  source: string
  endpoint: string
  status: number
  duration_ms: number
  error?: string
  has_data?: boolean
  items_count?: number
}): void {
  const rows = load()
  rows.push({
    id: _nextId++,
    source: metric.source,
    endpoint: metric.endpoint,
    status: metric.status,
    duration_ms: metric.duration_ms,
    error: metric.error ?? null,
    has_data: metric.has_data !== false ? 1 : 0,
    items_count: metric.items_count ?? null,
    timestamp: new Date().toISOString(),
  })
  maybePurge()
  scheduleWrite()
}

function summarizeGroup(group: MetricRow[]): SourceSummary {
  const total = group.length
  const success = group.filter(r => r.status >= 200 && r.status < 300).length
  const errors = group.filter(r => r.status >= 400 || r.status === 0).length
  const empty = group.filter(r => r.has_data === 0).length
  const avgMs = total > 0 ? Math.round(group.reduce((s, r) => s + r.duration_ms, 0) / total) : 0
  const sortedDurations = group.map(r => r.duration_ms).sort((a, b) => a - b)
  const successRows = group.filter(r => r.status >= 200 && r.status < 300)
  const errorRows = group.filter(r => r.status >= 400 || r.status === 0)
  return {
    source: group[0].source,
    total_requests: total,
    success_count: success,
    error_count: errors,
    empty_count: empty,
    avg_duration_ms: avgMs,
    p50_ms: percentile(sortedDurations, 50),
    p95_ms: percentile(sortedDurations, 95),
    last_success_at: successRows.length > 0 ? successRows.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0].timestamp : null,
    last_error: errorRows.length > 0 ? (errorRows.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0].error || 'Unknown error') : null,
    last_error_at: errorRows.length > 0 ? errorRows.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0].timestamp : null,
    success_rate: total > 0 ? Math.round((success / total) * 1000) / 10 : 0,
  }
}

export function getSummary(since?: string): SourceSummary[] {
  const rows = load()
  const filtered = since ? rows.filter(r => r.timestamp >= since) : rows
  const groups = new Map<string, MetricRow[]>()
  for (const r of filtered) {
    if (!groups.has(r.source)) groups.set(r.source, [])
    groups.get(r.source)!.push(r)
  }
  const result: SourceSummary[] = []
  const sourceNames = Array.from(groups.keys())
  for (const source of sourceNames) {
    result.push(summarizeGroup(groups.get(source)!))
  }
  return result.sort((a, b) => a.source.localeCompare(b.source))
}

export function getCategorizedSummary(since?: string): CategoryGroup[] {
  const rows = load()
  const filtered = since ? rows.filter(r => r.timestamp >= since) : rows

  const byCategory = new Map<string, Map<string, MetricRow[]>>()

  for (const r of filtered) {
    const mapping = API_CATEGORY_MAP[r.source]
    const catId = mapping?.id ?? 'other'
    if (!byCategory.has(catId)) byCategory.set(catId, new Map())
    const catMap = byCategory.get(catId)!
    if (!catMap.has(r.source)) catMap.set(r.source, [])
    catMap.get(r.source)!.push(r)
  }

  const allCategoryIds = new Set<string>()
  byCategory.forEach((_, key) => allCategoryIds.add(key))
  for (const id of CATEGORY_ORDER) allCategoryIds.add(id)
  const orderedIds = CATEGORY_ORDER.filter(id => allCategoryIds.has(id))
  allCategoryIds.forEach(id => {
    if (!orderedIds.includes(id)) orderedIds.push(id)
  })

  const result: CategoryGroup[] = []
  for (const catId of orderedIds) {
    const catMap = byCategory.get(catId)
    if (!catMap) continue
    const sampleMapping = API_CATEGORY_MAP[catMap.keys().next().value!] ?? API_CATEGORY_MAP[`category:${catId}`] ?? { label: catId, icon: '📄' }

    const apis: ApiSummary[] = []
    let catTotalReqs = 0, catSuccess = 0, catErrors = 0, catEmpty = 0, catDurationSum = 0

    const apiSources = Array.from(catMap.keys())
    for (let i = 0; i < apiSources.length; i++) {
      const source = apiSources[i]
      const rows = catMap.get(source)!
      const s = summarizeGroup(rows)
      const mapping = API_CATEGORY_MAP[source] ?? { id: catId, label: sampleMapping.label, icon: sampleMapping.icon }
      apis.push({
        ...s,
        category: mapping.id,
        categoryLabel: mapping.label,
        categoryIcon: mapping.icon,
      })
      catTotalReqs += s.total_requests
      catSuccess += s.success_count
      catErrors += s.error_count
      catEmpty += s.empty_count
      catDurationSum += s.avg_duration_ms * s.total_requests
    }

    apis.sort((a, b) => {
      const aOk = a.success_rate >= 70 ? 0 : a.success_rate >= 40 ? 1 : 2
      const bOk = b.success_rate >= 70 ? 0 : b.success_rate >= 40 ? 1 : 2
      if (aOk !== bOk) return aOk - bOk
      return b.avg_duration_ms - a.avg_duration_ms
    })

    result.push({
      id: catId,
      label: sampleMapping.label,
      icon: sampleMapping.icon,
      apis,
      total_requests: catTotalReqs,
      success_count: catSuccess,
      error_count: catErrors,
      empty_count: catEmpty,
      success_rate: catTotalReqs > 0 ? Math.round((catSuccess / catTotalReqs) * 1000) / 10 : 0,
      avg_duration_ms: catTotalReqs > 0 ? Math.round(catDurationSum / catTotalReqs) : 0,
    })
  }

  return result
}

export function getDailyTrend(since: string): DailySnapshot[] {
  const rows = load()
  const filtered = rows.filter(r => r.timestamp >= since)
  const groups = new Map<string, MetricRow[]>()
  for (const r of filtered) {
    const day = r.timestamp.slice(0, 10)
    const key = `${day}|${r.source}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(r)
  }
  const result: DailySnapshot[] = []
  const groupKeys = Array.from(groups.keys())
  for (const key of groupKeys) {
    const group = groups.get(key)!
    const day = group[0].timestamp.slice(0, 10)
    const total = group.length
    const success = group.filter(r => r.status >= 200 && r.status < 300).length
    const errors = group.filter(r => r.status >= 400 || r.status === 0).length
    const avgMs = total > 0 ? group.reduce((s, r) => s + r.duration_ms, 0) / total : 0
    result.push({
      date: day,
      source: group[0].source,
      total_requests: total,
      success_count: success,
      error_count: errors,
      avg_duration_ms: avgMs,
    })
  }
  return result.sort((a, b) => a.date.localeCompare(b.date) || a.source.localeCompare(b.source))
}

export function getRecentErrors(limit = 50): ApiMetricRow[] {
  const rows = load()
  return rows
    .filter(r => r.status >= 400 || r.status === 0)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit)
}

export function purgeOldMetrics(maxAgeDays = 90): number {
  const rows = load()
  const cutoff = new Date(Date.now() - maxAgeDays * 86400000).toISOString()
  const before = rows.length
  const kept = rows.filter(r => r.timestamp >= cutoff)
  _rows = kept
  const removed = before - kept.length
  if (removed > 0) scheduleWrite()
  return removed
}

export function getDbStatus(): Record<string, unknown> {
  const rows = load()
  return {
    dbOpen: true,
    dbType: 'json',
    dbPath: DB_PATH,
    totalRows: rows.length,
    recentRows: rows.slice(-5).map(r => ({ source: r.source, timestamp: r.timestamp })),
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

export function getDetailedApiMetrics(source: string, since?: string): ApiDetail | null {
  const rows = load()
  const filtered = rows.filter(r => r.source === source && (!since || r.timestamp >= since))
  if (filtered.length === 0) return null

  const category = API_CATEGORY_MAP[source] ?? null

  const total = filtered.length
  const success = filtered.filter(r => r.status >= 200 && r.status < 300).length
  const errors = filtered.filter(r => r.status >= 400 || r.status === 0).length
  const empty = filtered.filter(r => r.has_data === 0).length
  const durations = filtered.map(r => r.duration_ms).sort((a, b) => a - b)
  const avgMs = total > 0 ? Math.round(durations.reduce((s, v) => s + v, 0) / total) : 0

  const sorted = filtered.slice().sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  let consecutiveErrors = 0
  let consecutiveSuccesses = 0
  let tmpErr = 0, tmpOk = 0
  for (let i = sorted.length - 1; i >= 0; i--) {
    const r = sorted[i]
    if (r.status >= 400 || r.status === 0) {
      tmpErr++
      tmpOk = 0
    } else {
      tmpOk++
      tmpErr = 0
    }
    if (i === sorted.length - 1) {
      consecutiveErrors = tmpErr
      consecutiveSuccesses = tmpOk
    }
  }

  const statusMap = new Map<number, number>()
  for (const r of filtered) {
    statusMap.set(r.status, (statusMap.get(r.status) ?? 0) + 1)
  }
  const statusCodes: StatusCodeEntry[] = []
  statusMap.forEach((count, status) => { statusCodes.push({ status, count }) })
  statusCodes.sort((a, b) => b.count - a.count)

  const errorMap = new Map<string, { count: number; last_at: string }>()
  for (const r of filtered) {
    if (r.error) {
      const existing = errorMap.get(r.error)
      if (existing) {
        existing.count++
        if (r.timestamp > existing.last_at) existing.last_at = r.timestamp
      } else {
        errorMap.set(r.error, { count: 1, last_at: r.timestamp })
      }
    }
  }
  const topErrors: ErrorBucket[] = []
  errorMap.forEach((v, message) => { topErrors.push({ message, count: v.count, last_at: v.last_at }) })
  topErrors.sort((a, b) => b.count - a.count)

  const hourlyMap = new Map<string, { total: number; success: number; errors: number; durationSum: number }>()
  for (const r of filtered) {
    const hour = r.timestamp.slice(0, 13)
    const bucket = hourlyMap.get(hour)
    if (bucket) {
      bucket.total++
      bucket.durationSum += r.duration_ms
      if (r.status >= 200 && r.status < 300) bucket.success++
      if (r.status >= 400 || r.status === 0) bucket.errors++
    } else {
      hourlyMap.set(hour, {
        total: 1,
        success: (r.status >= 200 && r.status < 300) ? 1 : 0,
        errors: (r.status >= 400 || r.status === 0) ? 1 : 0,
        durationSum: r.duration_ms,
      })
    }
  }
  const hourlyDistribution: HourlyBucket[] = []
  const hourKeys = Array.from(hourlyMap.keys()).sort()
  for (const hour of hourKeys) {
    const b = hourlyMap.get(hour)!
    hourlyDistribution.push({
      hour,
      total: b.total,
      success: b.success,
      errors: b.errors,
      avg_ms: b.total > 0 ? Math.round(b.durationSum / b.total) : 0,
    })
  }

  const dailyMap = new Map<string, { total: number; success: number; errors: number; durationSum: number }>()
  for (const r of filtered) {
    const day = r.timestamp.slice(0, 10)
    const bucket = dailyMap.get(day)
    if (bucket) {
      bucket.total++
      bucket.durationSum += r.duration_ms
      if (r.status >= 200 && r.status < 300) bucket.success++
      if (r.status >= 400 || r.status === 0) bucket.errors++
    } else {
      dailyMap.set(day, {
        total: 1,
        success: (r.status >= 200 && r.status < 300) ? 1 : 0,
        errors: (r.status >= 400 || r.status === 0) ? 1 : 0,
        durationSum: r.duration_ms,
      })
    }
  }
  const dailyTrend: DailySnapshot[] = []
  const dayKeys = Array.from(dailyMap.keys()).sort()
  for (const day of dayKeys) {
    const b = dailyMap.get(day)!
    dailyTrend.push({
      date: day,
      source,
      total_requests: b.total,
      success_count: b.success,
      error_count: b.errors,
      avg_duration_ms: b.total > 0 ? Math.round(b.durationSum / b.total) : 0,
    })
  }

  const recentCalls = sorted.slice(-50).reverse().map(r => ({
    id: r.id,
    source: r.source,
    endpoint: r.endpoint,
    status: r.status,
    duration_ms: r.duration_ms,
    error: r.error,
    has_data: r.has_data,
    items_count: r.items_count,
    timestamp: r.timestamp,
  }))

  return {
    source,
    category,
    total_requests: total,
    success_count: success,
    error_count: errors,
    empty_count: empty,
    success_rate: total > 0 ? Math.round((success / total) * 1000) / 10 : 0,
    avg_duration_ms: avgMs,
    p50_ms: percentile(durations, 50),
    p95_ms: percentile(durations, 95),
    p99_ms: percentile(durations, 99),
    min_ms: durations[0] ?? 0,
    max_ms: durations[durations.length - 1] ?? 0,
    consecutive_errors: consecutiveErrors,
    consecutive_successes: consecutiveSuccesses,
    first_seen: sorted[0]?.timestamp ?? '',
    last_seen: sorted[sorted.length - 1]?.timestamp ?? '',
    status_codes: statusCodes,
    top_errors: topErrors.slice(0, 10),
    hourly_distribution: hourlyDistribution,
    daily_trend: dailyTrend,
    recent_calls: recentCalls,
  }
}