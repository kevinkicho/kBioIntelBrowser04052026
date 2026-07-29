'use client'

import type { ApiMeta } from '@/lib/analytics/api-meta'
import { API_METADATA } from '@/lib/analytics/api-meta'
import { StyledTooltip } from '@/components/ui/StyledTooltip'
import { productEventLabel } from '@/lib/productEvents'


export function ApiMetaInfo({ meta }: { meta: ApiMeta }) {
  return (
    <div className="bg-slate-800/40 rounded px-3 py-2 text-xs">
      <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1">Source info</div>
      <div className="space-y-0.5">
        <div className="flex items-start gap-2">
          <span className="text-slate-500 shrink-0 w-14">Org</span>
          <span className="text-slate-200">{meta.organization}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-slate-500 shrink-0 w-14">What</span>
          <span className="text-slate-400">{meta.description}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-slate-500 shrink-0 w-14">Endpoint</span>
          <a href={meta.apiEndpoint} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 break-all font-mono text-[10px]">{meta.apiEndpoint}</a>
        </div>
        {meta.apiDocs && (
          <div className="flex items-start gap-2">
            <span className="text-slate-500 shrink-0 w-14">Docs</span>
            <a href={meta.apiDocs} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 break-all font-mono text-[10px]">{meta.apiDocs}</a>
          </div>
        )}
      </div>
    </div>
  )
}

export interface ApiSummary {
  source: string
  category: string
  categoryLabel: string
  categoryIcon: string
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

export interface StatusCodeEntry { status: number; count: number }
export interface ErrorBucket { message: string; count: number; last_at: string }
export interface HourlyBucket { hour: string; total: number; success: number; errors: number; avg_ms: number }

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

export type ViewMode = 'summary' | 'table' | 'trend' | 'errors'
export type LayoutMode = 'grouped' | 'flat'

export function healthDot(rate: number) {
  if (rate >= 95) return '\uD83D\uDFE2'
  if (rate >= 70) return '\uD83D\uDFE1'
  return '\uD83D\uDD34'
}

export function timeAgo(iso: string | null) {
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

export function fmtMs(ms: number) {
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

export function apiName(source: string) {
  if (source === 'product') return 'Product funnel'
  return API_DISPLAY_NAMES[source] ?? source.replace(/^category:/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/** Label product funnel endpoints (event names) when viewing call rows. */
export function endpointLabel(source: string, endpoint: string) {
  if (source === 'product') return productEventLabel(endpoint)
  return endpoint
}

export function Sparkline({ data, key_ }: { data: number[]; key_: string }) {
  if (data.length === 0) return <span className="text-slate-500 text-xs">no data</span>
  const max = Math.max(...data, 1)
  const w = 4
  return (
    <StyledTooltip content={`${key_} trend`}>
      <div className="flex items-end gap-px">
        {data.map((v, i) => (
          <div key={i} className={`rounded-sm ${key_ === 'errors' ? 'bg-red-500/60' : key_ === 'avg_ms' ? 'bg-indigo-400/60' : 'bg-emerald-400/60'}`} style={{ width: w, height: Math.max(2, (v / max) * 28) }} />
        ))}
      </div>
    </StyledTooltip>
  )
}

export function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  )
}

/**
 * Fixed table layout — same col widths for Search, Other, and every category.
 * (CSS grid arbitrary cols were collapsing in production; table-fixed is reliable.)
 */
export function ApiSummaryList({
  apis,
  onOpen,
  flat,
}: {
  apis: ApiSummary[]
  onOpen: (source: string) => void
  flat?: boolean
}) {
  if (apis.length === 0) {
    return <p className="px-3 py-4 text-center text-sm text-slate-500">No APIs in this group.</p>
  }

  return (
    <div className="w-full overflow-x-auto" data-testid="analytics-api-summary-list">
      <table className="w-full min-w-[56rem] table-fixed border-collapse text-sm">
        <colgroup>
          <col style={{ width: flat ? '18%' : '20%' }} />
          {flat ? <col style={{ width: '12%' }} /> : null}
          <col style={{ width: '8%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: flat ? '14%' : '16%' }} />
        </colgroup>
        <thead>
          <tr className="border-b border-slate-700/80 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2.5 text-left font-semibold">API</th>
            {flat ? <th className="px-2 py-2.5 text-left font-semibold">Category</th> : null}
            <th className="px-2 py-2.5 text-center font-semibold">Health</th>
            <th className="px-2 py-2.5 text-right font-semibold">Reqs</th>
            <th className="px-2 py-2.5 text-right font-semibold">OK</th>
            <th className="px-2 py-2.5 text-right font-semibold">Errors</th>
            <th className="px-2 py-2.5 text-right font-semibold">Empty</th>
            <th className="px-2 py-2.5 text-right font-semibold">Avg</th>
            <th className="px-2 py-2.5 text-right font-semibold">p50</th>
            <th className="px-2 py-2.5 text-right font-semibold">p95</th>
            <th className="px-2 py-2.5 text-right font-semibold">Last OK</th>
            <th className="px-3 py-2.5 text-right font-semibold">Last error</th>
          </tr>
        </thead>
        <tbody>
          {apis.map((api) => (
            <tr
              key={api.source}
              onClick={() => onOpen(api.source)}
              className="cursor-pointer border-b border-slate-800/50 hover:bg-slate-800/35"
              data-testid={`analytics-api-row-${api.source}`}
            >
              <td className="truncate px-3 py-2.5 font-medium text-slate-200" title={apiName(api.source)}>
                {apiName(api.source)}
              </td>
              {flat ? (
                <td className="truncate px-2 py-2.5 text-xs text-slate-400">
                  {api.categoryIcon} {api.categoryLabel}
                </td>
              ) : null}
              <td className="whitespace-nowrap px-2 py-2.5 text-center tabular-nums text-slate-300">
                <span className="mr-1" aria-hidden>
                  {healthDot(api.success_rate)}
                </span>
                {api.success_rate}%
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums text-slate-400">
                {api.total_requests}
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums text-emerald-400">
                {api.success_count}
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums text-red-400">
                {api.error_count}
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums text-yellow-400/80">
                {api.empty_count}
              </td>
              <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-slate-300">
                {fmtMs(api.avg_duration_ms)}
              </td>
              <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-slate-400">
                {fmtMs(api.p50_ms)}
              </td>
              <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-slate-400">
                {fmtMs(api.p95_ms)}
              </td>
              <td className="whitespace-nowrap px-2 py-2.5 text-right text-[11px] text-slate-500">
                {timeAgo(api.last_success_at)}
              </td>
              <td
                className="truncate px-3 py-2.5 text-right text-[11px] text-slate-500"
                title={api.last_error ?? undefined}
              >
                {api.last_error
                  ? `${timeAgo(api.last_error_at)}: ${api.last_error.slice(0, 40)}`
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

