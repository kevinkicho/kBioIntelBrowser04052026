'use client'

import { useState, useEffect, useCallback } from 'react'

interface ApiSummary {
  source: string
  category: string
  categoryLabel: string
  categoryIcon: string
  total_requests: number
  success_count: number
  error_count: number
  empty_count: number
  avg_duration_ms: number
  last_success_at: string | null
  last_error: string | null
  last_error_at: string | null
  success_rate: number
}

interface CategoryGroup {
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

interface DailySnapshot {
  date: string
  source: string
  total_requests: number
  success_count: number
  error_count: number
  avg_duration_ms: number
}

interface ApiMetricRow {
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

interface StatusCodeEntry { status: number; count: number }
interface ErrorBucket { message: string; count: number; last_at: string }
interface HourlyBucket { hour: string; total: number; success: number; errors: number; avg_ms: number }

interface ApiDetail {
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

type ViewMode = 'summary' | 'trend' | 'errors'

function healthDot(rate: number) {
  if (rate >= 95) return '\uD83D\uDFE2'
  if (rate >= 70) return '\uD83D\uDFE1'
  return '\uD83D\uDD34'
}

function timeAgo(iso: string | null) {
  if (!iso) return '\u2014'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function fmtMs(ms: number) {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

const API_DISPLAY_NAMES: Record<string, string> = {
  openfda: 'OpenFDA',
  'fda-ndc': 'FDA NDC',
  orangebook: 'Orange Book',
  nadac: 'NADAC',
  rxnorm: 'RxNorm',
  dailymed: 'DailyMed',
  atc: 'ATC',
  drugcentral: 'DrugCentral',
  gsrs: 'GSRS (UNII)',
  pharmgkb: 'PharmGKB',
  cpic: 'CPIC',
  clinicaltrials: 'ClinicalTrials.gov',
  isrctn: 'ISRCTN',
  adverseevents: 'OpenFDA Adverse Events',
  recalls: 'FDA Recalls',
  'chembl-indications': 'ChEMBL Indications',
  clinvar: 'ClinVar',
  'gwas-catalog': 'GWAS Catalog',
  toxcast: 'ToxCast',
  sider: 'SIDER',
  iris: 'EPA IRIS',
  'fda-drug-shortages': 'FDA Drug Shortages',
  'pubchem-properties': 'PubChem Properties',
  'pubchem-hazards': 'PubChem GHS Hazards',
  chebi: 'ChEBI',
  comptox: 'EPA CompTox',
  'synthesis-routes': 'KEGG/Rhea Synthesis',
  metabolomics: 'Metabolomics Workbench',
  mychem: 'MyChem.info',
  hmdb: 'HMDB',
  massbank: 'MassBank',
  chemspider: 'ChemSpider',
  metabolights: 'MetaboLights',
  'gnps-library': 'GNPS',
  lipidmaps: 'LIPID MAPS',
  unichem: 'UniChem',
  foodb: 'FooDB',
  chembl: 'ChEMBL',
  bioassay: 'PubChem BioAssay',
  'chembl-mechanisms': 'ChEMBL Mechanisms',
  iuphar: 'IUPHAR',
  bindingdb: 'BindingDB',
  pharos: 'Pharos',
  dgidb: 'DGIdb',
  opentargets: 'Open Targets',
  ctd: 'CTD',
  iedb: 'IEDB',
  lincs: 'LINCS L1000',
  ttd: 'TTD',
  uniprot: 'UniProt',
  pdb: 'PDB',
  'pdbe-ligands': 'PDBe Ligands',
  pride: 'PRIDE',
  cath: 'CATH',
  sabdab: 'SAbDab',
  alphafold: 'AlphaFold',
  'protein-atlas': 'Protein Atlas',
  peptideatlas: 'PeptideAtlas',
  gene3d: 'Gene3D',
  'ncbi-gene': 'NCBI Gene',
  ensembl: 'Ensembl',
  'expression-atlas': 'Expression Atlas',
  gtex: 'GTEx',
  geo: 'GEO',
  dbsnp: 'dbSNP',
  clingen: 'ClinGen',
  medgen: 'MedGen',
  monarch: 'Monarch',
  'nci-thesaurus': 'NCI Thesaurus',
  mesh: 'MeSH',
  disgenet: 'DisGeNET',
  orphanet: 'Orphanet',
  mygene: 'MyGene.info',
  bgee: 'Bgee',
  omim: 'OMIM',
  'gene-ontology': 'Gene Ontology',
  hpo: 'HPO',
  ols: 'OLS',
  biomodels: 'BioModels',
  biosamples: 'BioSamples',
  massive: 'MassIVE',
  'string-db': 'STRING',
  stitch: 'STITCH',
  intact: 'IntAct',
  reactome: 'Reactome',
  wikipathways: 'WikiPathways',
  'pathway-commons': 'Pathway Commons',
  biocyc: 'BioCyc',
  smpdb: 'SMPDB',
  kegg: 'KEGG',
  europepmc: 'Europe PMC',
  nihreporter: 'NIH Reporter',
  patents: 'PatentsView',
  secedgar: 'SEC EDGAR',
  'semantic-scholar': 'Semantic Scholar',
  openalex: 'OpenAlex',
  pubmed: 'PubMed',
  opencitations: 'OpenCitations',
  crossref: 'CrossRef',
  arxiv: 'arXiv',
  'ncats-translator': 'NCATS Translator',
  'nci-cadsr': 'NCI caDSR',
  'nhgri-anvil': 'NHGRI AnVIL',
  'niaid-immport': 'NIAID ImmPort',
  'ninds-neurommsig': 'NINDS NeuroMMSig',
  search: 'Search',
  similar: 'Similar Molecules',
}

function apiName(source: string) {
  return API_DISPLAY_NAMES[source] ?? source.replace(/^category:/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function Sparkline({ data, key_ }: { data: number[]; key_: string }) {
  if (data.length === 0) return <span className="text-slate-500 text-xs">no data</span>
  const max = Math.max(...data, 1)
  const w = 4
  return (
    <div className="flex items-end gap-px" title={`${key_} trend`}>
      {data.map((v, i) => (
        <div key={i} className={`rounded-sm ${key_ === 'errors' ? 'bg-red-500/60' : key_ === 'avg_ms' ? 'bg-indigo-400/60' : 'bg-emerald-400/60'}`} style={{ width: w, height: Math.max(2, (v / max) * 28) }} />
      ))}
    </div>
  )
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  )
}

export default function AnalyticsPage() {
  const [view, setView] = useState<ViewMode>('summary')
  const [since, setSince] = useState('7d')
  const [categories, setCategories] = useState<CategoryGroup[]>([])
  const [trend, setTrend] = useState<DailySnapshot[]>([])
  const [errors, setErrors] = useState<ApiMetricRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [detailSource, setDetailSource] = useState<string | null>(null)
  const [detail, setDetail] = useState<ApiDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const sinceParam = since === '7d'
    ? new Date(Date.now() - 7 * 86400000).toISOString()
    : since === '30d'
      ? new Date(Date.now() - 30 * 86400000).toISOString()
      : since === '90d'
        ? new Date(Date.now() - 90 * 86400000).toISOString()
        : undefined

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ since: sinceParam || '' })
    if (view === 'summary') {
      params.set('view', 'categorized')
      fetch(`/api/analytics/summary?${params}`)
        .then(r => r.json())
        .then((data: CategoryGroup[]) => {
          setCategories(data)
          const newExpanded = new Set<string>(data.map(c => c.id))
          setExpanded(newExpanded)
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    } else if (view === 'trend') {
      params.set('view', 'trend')
      fetch(`/api/analytics/summary?${params}`)
        .then(r => r.json())
        .then(setTrend)
        .catch(() => {})
        .finally(() => setLoading(false))
    } else if (view === 'errors') {
      params.set('view', 'errors')
      fetch(`/api/analytics/summary?${params}`)
        .then(r => r.json())
        .then(setErrors)
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [view, since]) // eslint-disable-line react-hooks/exhaustive-deps

  const openDetail = useCallback((source: string) => {
    setDetailSource(source)
    setDetailLoading(true)
    setDetail(null)
    const params = new URLSearchParams({ view: 'detail', source, since: sinceParam || '' })
    fetch(`/api/analytics/summary?${params}`)
      .then(r => r.json())
      .then((data: ApiDetail) => setDetail(data))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false))
  }, [sinceParam])

  const closeDetail = useCallback(() => {
    setDetailSource(null)
    setDetail(null)
  }, [])

  function toggleCategory(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">API Analytics</h1>
            <p className="text-slate-400 mt-1">Monitor API health, response times, and data availability</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={since}
              onChange={e => setSince(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
            <a href="/" className="text-indigo-400 hover:text-indigo-300 text-sm">Back to app</a>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {(['summary', 'trend', 'errors'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === v
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500 animate-pulse">Loading analytics...</div>
        ) : view === 'summary' ? (
          <div>
            {categories.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                No API calls recorded yet. Browse some molecules to start collecting data.
              </div>
            )}
            {categories.map(cat => (
              <div key={cat.id} className="mb-3">
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-xl transition-colors ${
                    expanded.has(cat.id)
                      ? 'bg-slate-800/80 border border-slate-700/50'
                      : 'bg-slate-800/40 border border-slate-700/30 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{cat.icon}</span>
                    <span className="font-semibold text-white text-lg">{cat.label}</span>
                    <span className="text-slate-400 text-sm">
                      {cat.success_count}/{cat.total_requests} OK
                    </span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-sm text-slate-400">{healthDot(cat.success_rate)} {cat.success_rate}%</span>
                    <span className="text-sm text-slate-400">{cat.avg_duration_ms}ms avg</span>
                    <span className="text-sm">
                      {cat.error_count > 0 && <span className="text-red-400">{cat.error_count} errors</span>}
                      {cat.empty_count > 0 && cat.error_count > 0 && <span className="text-slate-600"> {'\u00B7'} </span>}
                      {cat.empty_count > 0 && <span className="text-yellow-400/70">{cat.empty_count} empty</span>}
                    </span>
                    <svg
                      className={`w-5 h-5 text-slate-400 transition-transform ${expanded.has(cat.id) ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {expanded.has(cat.id) && (
                  <div className="mt-1 ml-6 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-800/50">
                          <th className="text-left py-2 px-3 font-medium">API</th>
                          <th className="text-center py-2 px-3 font-medium">Health</th>
                          <th className="text-right py-2 px-3 font-medium">Reqs</th>
                          <th className="text-right py-2 px-3 font-medium">OK</th>
                          <th className="text-right py-2 px-3 font-medium">Errors</th>
                          <th className="text-right py-2 px-3 font-medium">Empty</th>
                          <th className="text-right py-2 px-3 font-medium">Avg Time</th>
                          <th className="text-right py-2 px-3 font-medium">Last OK</th>
                          <th className="text-right py-2 px-3 font-medium">Last Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.apis.map(api => (
                          <tr
                            key={api.source}
                            onClick={() => openDetail(api.source)}
                            className="border-b border-slate-800/30 hover:bg-slate-800/20 cursor-pointer group"
                          >
                            <td className="py-2 px-3 font-medium text-slate-200 group-hover:text-indigo-300 transition-colors">
                              {apiName(api.source)}
                              <span className="ml-1.5 text-indigo-400/0 group-hover:text-indigo-400/60 text-xs transition-colors">click for details</span>
                            </td>
                            <td className="py-2 px-3 text-center">{healthDot(api.success_rate)} {api.success_rate}%</td>
                            <td className="py-2 px-3 text-right text-slate-400">{api.total_requests}</td>
                            <td className="py-2 px-3 text-right text-emerald-400">{api.success_count}</td>
                            <td className="py-2 px-3 text-right text-red-400">{api.error_count}</td>
                            <td className="py-2 px-3 text-right text-yellow-400/70">{api.empty_count}</td>
                            <td className="py-2 px-3 text-right text-slate-300">{api.avg_duration_ms}ms</td>
                            <td className="py-2 px-3 text-right text-slate-400 text-xs">{timeAgo(api.last_success_at)}</td>
                            <td className="py-2 px-3 text-right text-slate-400 text-xs">
                              {api.last_error ? `${timeAgo(api.last_error_at)}: ${api.last_error.slice(0, 40)}` : '\u2014'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : view === 'errors' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="text-left py-3 px-4">Time</th>
                  <th className="text-left py-3 px-4">Source</th>
                  <th className="text-center py-3 px-4">Status</th>
                  <th className="text-right py-3 px-4">Duration</th>
                  <th className="text-left py-3 px-4">Error</th>
                </tr>
              </thead>
              <tbody>
                {errors.map(e => (
                  <tr
                    key={e.id}
                    onClick={() => openDetail(e.source)}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer"
                  >
                    <td className="py-2 px-4 text-slate-400">{new Date(e.timestamp).toLocaleString()}</td>
                    <td className="py-2 px-4 hover:text-indigo-300">{apiName(e.source)}</td>
                    <td className="py-2 px-4 text-center text-red-400">{e.status}</td>
                    <td className="py-2 px-4 text-right text-slate-300">{e.duration_ms}ms</td>
                    <td className="py-2 px-4 text-red-300 text-xs">{e.error || '\u2014'}</td>
                  </tr>
                ))}
                {errors.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      No errors recorded. Everything looks good!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Source</th>
                  <th className="text-right py-3 px-4">Requests</th>
                  <th className="text-right py-3 px-4">Success</th>
                  <th className="text-right py-3 px-4">Errors</th>
                  <th className="text-right py-3 px-4">Avg Time</th>
                </tr>
              </thead>
              <tbody>
                {trend.map((t, i) => (
                  <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-2 px-4 text-slate-400">{t.date}</td>
                    <td className="py-2 px-4">{apiName(t.source)}</td>
                    <td className="py-2 px-4 text-right text-slate-300">{t.total_requests}</td>
                    <td className="py-2 px-4 text-right text-emerald-400">{t.success_count}</td>
                    <td className="py-2 px-4 text-right text-red-400">{t.error_count}</td>
                    <td className="py-2 px-4 text-right text-slate-300">{Math.round(t.avg_duration_ms)}ms</td>
                  </tr>
                ))}
                {trend.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No trend data yet. Browse some molecules over a few days to see patterns.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailSource && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={closeDetail} />
          <div className="relative w-full max-w-2xl bg-slate-900 border-l border-slate-700 overflow-y-auto">
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-bold text-white">{apiName(detailSource)}</h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">source: {detailSource}</p>
              </div>
              <button onClick={closeDetail} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {detailLoading ? (
              <div className="p-12 text-center text-slate-500 animate-pulse">Loading details...</div>
            ) : detail ? (
              <div className="p-6 space-y-6">

                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Total', value: detail.total_requests, color: 'text-white' },
                    { label: 'Success', value: detail.success_count, color: 'text-emerald-400' },
                    { label: 'Errors', value: detail.error_count, color: 'text-red-400' },
                    { label: 'Empty', value: detail.empty_count, color: 'text-yellow-400' },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-1">{s.label}</div>
                      <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">Success Rate</h3>
                  <div className="flex items-center gap-4">
                    <span className={`text-3xl font-bold ${detail.success_rate >= 95 ? 'text-emerald-400' : detail.success_rate >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {detail.success_rate}%
                    </span>
                    <div className="flex-1">
                      <MiniBar pct={detail.success_rate} color={detail.success_rate >= 95 ? 'bg-emerald-500' : detail.success_rate >= 70 ? 'bg-yellow-500' : 'bg-red-500'} />
                    </div>
                  </div>
                  <div className="flex gap-4 mt-3 text-xs text-slate-400">
                    <span>Consecutive OK: <span className="text-emerald-400">{detail.consecutive_successes}</span></span>
                    <span>Consecutive errors: <span className="text-red-400">{detail.consecutive_errors}</span></span>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">Response Time Distribution</h3>
                  <div className="grid grid-cols-5 gap-3">
                    {[
                      { label: 'Min', value: detail.min_ms },
                      { label: 'P50', value: detail.p50_ms },
                      { label: 'Avg', value: detail.avg_duration_ms },
                      { label: 'P95', value: detail.p95_ms },
                      { label: 'P99', value: detail.p99_ms },
                    ].map(t => (
                      <div key={t.label} className="text-center">
                        <div className="text-xs text-slate-400 mb-1">{t.label}</div>
                        <div className={`text-lg font-semibold ${t.label === 'P95' || t.label === 'P99' ? 'text-orange-400' : 'text-slate-200'}`}>
                          {fmtMs(t.value)}
                        </div>
                      </div>
                    ))}
                  </div>
                  {detail.max_ms > detail.p95_ms * 2 && (
                    <div className="mt-2 text-xs text-orange-400/70">
                      Max: {fmtMs(detail.max_ms)} {'\u2014'} significant tail latency
                    </div>
                  )}
                </div>

                {detail.status_codes.length > 0 && (
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">Status Code Distribution</h3>
                    <div className="space-y-2">
                      {detail.status_codes.map(sc => (
                        <div key={sc.status} className="flex items-center gap-3">
                          <span className={`font-mono text-sm w-12 ${sc.status >= 200 && sc.status < 300 ? 'text-emerald-400' : sc.status >= 400 ? 'text-red-400' : 'text-yellow-400'}`}>
                            {sc.status}
                          </span>
                          <div className="flex-1">
                            <MiniBar pct={(sc.count / detail.total_requests) * 100} color={sc.status >= 200 && sc.status < 300 ? 'bg-emerald-500' : sc.status >= 400 ? 'bg-red-500' : 'bg-yellow-500'} />
                          </div>
                          <span className="text-xs text-slate-400 w-16 text-right">{sc.count} ({Math.round((sc.count / detail.total_requests) * 100)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detail.top_errors.length > 0 && (
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">Top Errors</h3>
                    <div className="space-y-2">
                      {detail.top_errors.map((e, i) => (
                        <div key={i} className="bg-red-950/20 border border-red-900/30 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-red-300 text-xs font-medium">{e.count}x</span>
                            <span className="text-slate-500 text-xs">{timeAgo(e.last_at)}</span>
                          </div>
                          <code className="text-xs text-red-400/80 break-all">{e.message}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detail.hourly_distribution.length > 1 && (
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">Request Volume (hourly)</h3>
                    <Sparkline data={detail.hourly_distribution.map(h => h.total)} key_="total" />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>{detail.hourly_distribution[0]?.hour.slice(11)}</span>
                      <span>{detail.hourly_distribution[detail.hourly_distribution.length - 1]?.hour.slice(11)}</span>
                    </div>
                  </div>
                )}

                {detail.daily_trend.length > 1 && (
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">Daily Trend</h3>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Volume</div>
                        <Sparkline data={detail.daily_trend.map(d => d.total_requests)} key_="total" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Avg Latency</div>
                        <Sparkline data={detail.daily_trend.map(d => d.avg_duration_ms)} key_="avg_ms" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Errors</div>
                        <Sparkline data={detail.daily_trend.map(d => d.error_count)} key_="errors" />
                      </div>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-700/50">
                          <th className="text-left py-1.5 px-2">Date</th>
                          <th className="text-right py-1.5 px-2">Reqs</th>
                          <th className="text-right py-1.5 px-2">OK</th>
                          <th className="text-right py-1.5 px-2">Errors</th>
                          <th className="text-right py-1.5 px-2">Avg ms</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.daily_trend.map((d, i) => (
                          <tr key={i} className="border-b border-slate-800/30">
                            <td className="py-1.5 px-2 text-slate-300">{d.date}</td>
                            <td className="py-1.5 px-2 text-right text-slate-400">{d.total_requests}</td>
                            <td className="py-1.5 px-2 text-right text-emerald-400">{d.success_count}</td>
                            <td className="py-1.5 px-2 text-right text-red-400">{d.error_count}</td>
                            <td className="py-1.5 px-2 text-right text-slate-300">{Math.round(d.avg_duration_ms)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {detail.recent_calls.length > 0 && (
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">Recent Calls (last {detail.recent_calls.length})</h3>
                    <div className="space-y-1.5">
                      {detail.recent_calls.map(call => (
                        <div key={call.id} className={`rounded-lg px-3 py-2 text-xs ${call.status >= 400 || call.status === 0 ? 'bg-red-950/20 border border-red-900/20' : 'bg-slate-800/40'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`font-mono ${call.status >= 400 ? 'text-red-400' : 'text-emerald-400'}`}>{call.status}</span>
                              <span className="text-slate-300">{fmtMs(call.duration_ms)}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${call.has_data ? 'bg-emerald-900/40 text-emerald-400' : 'bg-yellow-900/40 text-yellow-400'}`}>
                                {call.has_data ? 'data' : 'empty'}
                              </span>
                            </div>
                            <span className="text-slate-500">{timeAgo(call.timestamp)}</span>
                          </div>
                          {call.error && (
                            <div className="mt-1 text-red-400/80 break-all">{call.error.slice(0, 120)}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-slate-800/50 rounded-lg p-4 text-xs text-slate-500">
                  <div className="grid grid-cols-2 gap-2">
                    <div>First seen: {detail.first_seen ? new Date(detail.first_seen).toLocaleString() : '\u2014'}</div>
                    <div>Last seen: {detail.last_seen ? new Date(detail.last_seen).toLocaleString() : '\u2014'}</div>
                    {detail.category && (
                      <>
                        <div>Category: {detail.category.icon} {detail.category.label}</div>
                        <div>Category ID: {detail.category.id}</div>
                      </>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-12 text-center text-slate-500">No detailed data available for this source.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}