'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { GeneOverview as GeneOverviewType } from '@/lib/categoryFetchers/gene'
import { AICopilot } from '@/components/ai/AICopilot'
import { CATEGORIES, type CategoryId } from '@/lib/categoryConfig'
import { EmptySection, ErrorSection } from '@/components/ui/DataStatus'
import type { SectionStatus } from '@/lib/dataStatus'
import { buildDiscoverHref } from '@/lib/discovery/discoverUrl'
import { DataPoint } from '@/components/ui/DataPoint'
import type { BgeeExpression, GeneExpression, dbSNPVariant } from '@/lib/types'

type CategoryLoadState = 'idle' | 'loading' | 'loaded' | 'error'

/** MyGene / overview may send alias as string | string[] */
function normalizeAliases(value: unknown): string[] {
  if (value == null) return []
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'string' ? v : v != null ? String(v) : ''))
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    const t = value.trim()
    return t ? [t] : []
  }
  return []
}

/** Alias / synonym chip → gene search for that name */
function GeneAliasChip({
  alias,
  size = 'sm',
}: {
  alias: string
  size?: 'sm' | 'xs'
}) {
  const sizeClass =
    size === 'xs'
      ? 'text-[10px] px-1.5 py-0.5'
      : 'text-xs px-1.5 py-0.5'
  return (
    <Link
      href={`/gene?q=${encodeURIComponent(alias)}`}
      className={`${sizeClass} rounded border border-slate-700/60 bg-slate-800 text-slate-400 transition-colors hover:border-indigo-600/50 hover:bg-indigo-950/50 hover:text-indigo-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500`}
      title={`Search genes for “${alias}”`}
    >
      {alias}
    </Link>
  )
}

function buildFullStatus(catId: CategoryId, state: CategoryLoadState): Record<CategoryId, CategoryLoadState> {
  const result = {} as Record<CategoryId, CategoryLoadState>
  for (const cat of CATEGORIES) {
    result[cat.id] = cat.id === catId ? state : 'idle'
  }
  return result
}

interface GeneDetailPageClientProps {
  geneId: string
  symbol: string
  name: string
  summary: string
  chromosome: string
  typeOfGene: string
  aliases: string[]
  ensemblId: string
  uniprotId: string
}

function GeneOverview({
  overview,
  fetchedAt,
}: {
  overview: GeneOverviewType | null
  fetchedAt?: Date | null
}) {
  if (!overview) return null
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-1">
          <DataPoint sourceKey="mygene" fetchedAt={fetchedAt} label="Gene symbol (MyGene)" recordUrl={overview.url}>
            <h2 className="text-2xl font-bold text-indigo-300">{overview.symbol}</h2>
            <p className="text-sm text-slate-400 mt-0.5">{overview.name}</p>
          </DataPoint>
        </div>
        <div className="flex flex-wrap gap-1.5 shrink-0">
          {overview.typeOfGene && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-800/50">{overview.typeOfGene}</span>
          )}
          {overview.chromosome && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-800/50">chr {overview.chromosome}</span>
          )}
        </div>
      </div>

      {overview.summary && (
        <DataPoint sourceKey="ncbi-gene" fetchedAt={fetchedAt} label="Gene summary" recordUrl={overview.url}>
          <p className="text-sm text-slate-300 leading-relaxed mb-4">{overview.summary}</p>
        </DataPoint>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
        <DataPoint sourceKey="ncbi-gene" fetchedAt={fetchedAt} label="Entrez Gene" recordUrl={overview.url}>
          <div><span className="text-slate-500">Entrez:</span> <a href={overview.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">{overview.geneId}</a></div>
        </DataPoint>
        {overview.ensemblId && (
          <DataPoint
            sourceKey="ensembl"
            fetchedAt={fetchedAt}
            label="Ensembl gene"
            recordUrl={`https://ensembl.org/Homo_sapiens/Gene/Summary?g=${overview.ensemblId}`}
          >
            <div><span className="text-slate-500">Ensembl:</span> <a href={`https://ensembl.org/Homo_sapiens/Gene/Summary?g=${overview.ensemblId}`} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">{overview.ensemblId}</a></div>
          </DataPoint>
        )}
        {overview.uniprotId && (
          <DataPoint
            sourceKey="uniprot"
            fetchedAt={fetchedAt}
            label="UniProt"
            recordUrl={`https://www.uniprot.org/uniprot/${overview.uniprotId}`}
          >
            <div><span className="text-slate-500">UniProt:</span> <a href={`https://www.uniprot.org/uniprot/${overview.uniprotId}`} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">{overview.uniprotId}</a></div>
          </DataPoint>
        )}
      </div>

      {(() => {
        const list = normalizeAliases(overview.aliases)
        if (list.length === 0) return null
        return (
        <div className="mt-3 flex flex-wrap items-center gap-1">
          <span className="text-xs text-slate-500 mr-1">Aliases:</span>
          {list.map((a) => (
            <GeneAliasChip key={a} alias={a} size="xs" />
          ))}
        </div>
        )
      })()}
    </div>
  )
}

function GeneDiseasesPanel({
  data,
  status,
  geneSymbol,
  fetchedAt,
}: {
  data: Record<string, unknown> | null
  status?: SectionStatus
  geneSymbol?: string
  fetchedAt?: Date | null
}) {
  const diseases = (data?.geneDiseases as Record<string, unknown>)?.disgenetAssociations as Array<{ diseaseName: string; score: number; diseaseId: string; source: string; geneSymbol?: string }> | undefined
  if (status?.status === 'error') return <ErrorSection label="disease associations" error={status.error} />
  if (!diseases || diseases.length === 0) return <EmptySection label="disease associations" hint="DisGeNET may not have associations for this gene" />
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-200 mb-3">Associated Diseases ({diseases.length})</h3>
      <p className="text-[10px] text-slate-600 mb-2">Click a row for API source, timestamp, and endpoint.</p>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {diseases.slice(0, 30).map((d, i) => {
          const discoverHref = buildDiscoverHref({
            q: d.diseaseName,
            targets: geneSymbol ? [geneSymbol] : undefined,
          })
          const recordUrl = d.diseaseId
            ? `https://www.disgenet.org/browser/0/1/0/${encodeURIComponent(d.diseaseId)}/`
            : undefined
          return (
            <DataPoint
              key={`${d.diseaseId}-${i}`}
              sourceKey="disgenet"
              fetchedAt={fetchedAt}
              label={d.diseaseName}
              recordUrl={recordUrl}
            >
              <div className="flex items-center justify-between gap-2 py-1.5 px-2 rounded text-sm">
                <Link href={`/disease?q=${encodeURIComponent(d.diseaseName)}`} className="text-indigo-300 hover:text-indigo-200 hover:underline truncate mr-2 min-w-0">{d.diseaseName}</Link>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={discoverHref}
                    className="text-[10px] px-2 py-0.5 rounded border border-emerald-800/50 bg-emerald-900/30 text-emerald-300 hover:border-emerald-500 hover:text-emerald-200 transition-colors"
                    title={`Rank candidates for ${d.diseaseName}${geneSymbol ? ` with target ${geneSymbol}` : ''}`}
                  >
                    Discover
                  </Link>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300">{d.score.toFixed(2)}</span>
                </div>
              </div>
            </DataPoint>
          )
        })}
      </div>
    </div>
  )
}

function GeneVariantsPanel({
  data,
  fetchedAt,
}: {
  data: Record<string, unknown> | null
  fetchedAt?: Date | null
}) {
  const clinvarVariants = (data?.geneVariants as Record<string, unknown>)?.clinvarVariants as Array<{ title?: string; clinicalSignificance: string; geneSymbol: string; conditionName?: string; url?: string }> | undefined
  const dbsnpVariants = (data?.geneVariants as Record<string, unknown>)?.dbsnpVariants as dbSNPVariant[] | undefined

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
      <p className="text-[10px] text-slate-600 mb-2">Click a row for API source, timestamp, and endpoint.</p>
      {clinvarVariants && clinvarVariants.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">ClinVar Variants ({clinvarVariants.length})</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {clinvarVariants.slice(0, 20).map((v, i) => (
              <DataPoint
                key={i}
                sourceKey="clinvar"
                fetchedAt={fetchedAt}
                label={v.title || v.clinicalSignificance}
                recordUrl={v.url}
              >
                <div className="py-1.5 px-2 rounded text-sm">
                  <span className="text-slate-300">{v.geneSymbol}</span>
                  <span className="mx-2 text-slate-600">|</span>
                  <span className="text-slate-400">{v.clinicalSignificance}</span>
                  {v.conditionName && <><span className="mx-2 text-slate-600">|</span><span className="text-slate-400">{v.conditionName}</span></>}
                </div>
              </DataPoint>
            ))}
          </div>
        </div>
      )}
      {dbsnpVariants && dbsnpVariants.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-200 mb-3">dbSNP Variants ({dbsnpVariants.length})</h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {dbsnpVariants.slice(0, 20).map((v, i) => {
              const rs = v.rsId || v.refSNPId
              const url = rs
                ? `https://www.ncbi.nlm.nih.gov/snp/${String(rs).replace(/^rs/i, 'rs')}`
                : undefined
              return (
                <DataPoint key={i} sourceKey="dbsnp" fetchedAt={fetchedAt} label={rs || 'dbSNP'} recordUrl={url}>
                  <div className="py-1 px-2 rounded text-sm text-slate-300 font-mono">
                    {rs || '—'}
                    {v.chromosome ? (
                      <span className="ml-2 text-slate-500">
                        chr{v.chromosome}:{v.position}
                      </span>
                    ) : null}
                  </div>
                </DataPoint>
              )
            })}
          </div>
        </div>
      )}
      {(!clinvarVariants || clinvarVariants.length === 0) && (!dbsnpVariants || dbsnpVariants.length === 0) && (
        <div className="text-slate-500 text-sm py-4">No variant data found.</div>
      )}
    </div>
  )
}

function GeneExpressionPanel({
  data,
  fetchedAt,
}: {
  data: Record<string, unknown> | null
  fetchedAt?: Date | null
}) {
  const gtexExps = (data?.geneExpressionData as Record<string, unknown>)?.gtexExpressions as Array<{ tissueName?: string; tpm?: number; geneSymbol?: string }> | undefined
  const bgeeExps = (data?.geneExpressionData as Record<string, unknown>)?.bgeeExpressions as BgeeExpression[] | undefined
  const atlasData = (data?.geneExpressionData as Record<string, unknown>)?.expressionAtlasData as GeneExpression[] | undefined

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
      <p className="text-[10px] text-slate-600 mb-3">
        Counts sum GTEx + Bgee + Expression Atlas. Click any row for API source, fetch time, endpoint, and URL.
      </p>
      {gtexExps && gtexExps.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">GTEx Top Tissues ({gtexExps.length})</h3>
          <div className="space-y-1.5">
            {gtexExps.slice(0, 15).map((e, i) => (
              <DataPoint
                key={i}
                sourceKey="gtex"
                fetchedAt={fetchedAt}
                label={e.tissueName || 'GTEx tissue'}
                recordUrl={
                  e.geneSymbol
                    ? `https://gtexportal.org/home/gene/${encodeURIComponent(e.geneSymbol)}`
                    : 'https://gtexportal.org/home/'
                }
              >
                <div className="flex items-center justify-between py-1 px-2 rounded text-sm">
                  <span className="text-slate-300 truncate">{e.tissueName || 'Unknown'}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 shrink-0 ml-2">
                    TPM: {typeof e.tpm === 'number' ? e.tpm.toFixed(1) : '—'}
                  </span>
                </div>
              </DataPoint>
            ))}
          </div>
        </div>
      )}
      {bgeeExps && bgeeExps.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Bgee Expression ({bgeeExps.length})</h3>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {bgeeExps.slice(0, 30).map((e, i) => (
              <DataPoint
                key={i}
                sourceKey="bgee"
                fetchedAt={fetchedAt}
                label={e.anatomicalEntityName || 'Bgee'}
                recordUrl={
                  e.geneSymbol
                    ? `https://www.bgee.org/?page=gene&gene_id=${encodeURIComponent(e.geneId || e.geneSymbol)}`
                    : 'https://www.bgee.org/'
                }
              >
                <div className="flex items-center justify-between py-1 px-2 rounded text-sm gap-2">
                  <span className="text-slate-300 truncate">{e.anatomicalEntityName || '—'}</span>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {e.expressionLevel}
                    {typeof e.expressionScore === 'number' && e.expressionScore > 0
                      ? ` · ${e.expressionScore.toFixed(2)}`
                      : ''}
                  </span>
                </div>
              </DataPoint>
            ))}
          </div>
        </div>
      )}
      {atlasData && atlasData.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Expression Atlas ({atlasData.length})</h3>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {atlasData.slice(0, 30).map((e, i) => (
              <DataPoint
                key={i}
                sourceKey="expression-atlas"
                fetchedAt={fetchedAt}
                label={e.experimentDescription || e.experimentType || 'Expression Atlas'}
                recordUrl={e.url}
              >
                <div className="py-1 px-2 rounded text-sm">
                  <span className="text-slate-300 line-clamp-2">
                    {e.experimentDescription || e.experimentType || 'Experiment'}
                  </span>
                  {e.species && (
                    <span className="block text-[10px] text-slate-500 mt-0.5">{e.species}</span>
                  )}
                </div>
              </DataPoint>
            ))}
          </div>
        </div>
      )}
      {(!gtexExps || gtexExps.length === 0) && (!bgeeExps || bgeeExps.length === 0) && (!atlasData || atlasData.length === 0) && (
        <div className="text-slate-500 text-sm py-4">No expression data found.</div>
      )}
    </div>
  )
}

function TargetedDrugsPanel({
  data,
  fetchedAt,
}: {
  data: Record<string, unknown> | null
  fetchedAt?: Date | null
}) {
  const drugs = (data?.geneDrugs as Array<{ drugName?: string; interactionType?: string; sources?: string[]; score?: number }>) ?? []

  if (drugs.length === 0) return <div className="text-slate-500 text-sm py-4">No targeted drug data found.</div>

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-200 mb-1">Drugs targeting this gene ({drugs.length})</h3>
      <p className="text-[10px] text-slate-600 mb-3">Click a row for API source, timestamp, and endpoint.</p>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {drugs.map((d, i) => (
          <DataPoint
            key={`${d.drugName}-${i}`}
            sourceKey="dgidb"
            fetchedAt={fetchedAt}
            label={d.drugName || 'DGIdb interaction'}
            recordUrl={
              d.drugName
                ? `https://www.dgidb.org/results?searchType=drug&searchTerms=${encodeURIComponent(String(d.drugName))}`
                : 'https://www.dgidb.org/'
            }
          >
            <div className="flex items-center justify-between py-1.5 px-2 rounded text-sm">
              <div className="flex items-center gap-2 min-w-0">
                {d.drugName && /^\d+$/.test(String(d.drugName)) === false && (
                  <Link
                    href={`/molecule/name/${encodeURIComponent(String(d.drugName))}`}
                    className="text-indigo-400 hover:underline truncate"
                  >
                    {d.drugName}
                  </Link>
                )}
                {d.drugName && /^\d+$/.test(String(d.drugName)) && (
                  <Link
                    href={`/molecule/${String(d.drugName)}`}
                    className="text-indigo-400 hover:underline truncate font-mono"
                  >
                    CID {d.drugName}
                  </Link>
                )}
                {!d.drugName && <span className="text-slate-500">Unknown</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {d.interactionType && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-violet-900/40 text-violet-300 border border-violet-800/50">{d.interactionType}</span>
                )}
                {Array.isArray(d.sources) && d.sources.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/80 text-slate-400">{d.sources.slice(0, 2).join(', ')}</span>
                )}
              </div>
            </div>
          </DataPoint>
        ))}
      </div>
    </div>
  )
}

function GenePathwaysPanel({
  data,
  fetchedAt,
}: {
  data: Record<string, unknown> | null
  fetchedAt?: Date | null
}) {
  const reactome = (data?.genePathways as Record<string, unknown>)?.reactomePathways as Array<{ name?: string; stId?: string; url?: string }> | undefined
  const wikipathways = (data?.genePathways as Record<string, unknown>)?.wikiPathways as Array<{ name?: string; id?: string; url?: string }> | undefined
  const goTerms = (data?.genePathways as Record<string, unknown>)?.goTerms as Array<{ id?: string; name?: string; url?: string } | string> | undefined

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
      <p className="text-[10px] text-slate-600 mb-3">Click a row for API source, timestamp, and endpoint.</p>
      {reactome && reactome.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Reactome Pathways ({reactome.length})</h3>
          <div className="space-y-1.5">
            {reactome.slice(0, 15).map((p, i) => (
              <DataPoint
                key={p.stId || i}
                sourceKey="reactome"
                fetchedAt={fetchedAt}
                label={p.name || p.stId || 'Reactome'}
                recordUrl={p.url || (p.stId ? `https://reactome.org/content/detail/${p.stId}` : undefined)}
              >
                <div className="py-1 px-2 rounded text-sm text-slate-300">
                  {p.url ? (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-indigo-400">
                      {p.name}
                    </a>
                  ) : (
                    p.name
                  )}
                </div>
              </DataPoint>
            ))}
          </div>
        </div>
      )}
      {wikipathways && wikipathways.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">WikiPathways ({wikipathways.length})</h3>
          <div className="space-y-1.5">
            {wikipathways.slice(0, 15).map((p, i) => (
              <DataPoint
                key={p.id || i}
                sourceKey="wikipathways"
                fetchedAt={fetchedAt}
                label={p.name || p.id || 'WikiPathways'}
                recordUrl={p.url || (p.id ? `https://www.wikipathways.org/pathways/${p.id}` : undefined)}
              >
                <div className="py-1 px-2 rounded text-sm text-slate-300">
                  {p.url ? (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-indigo-400">
                      {p.name}
                    </a>
                  ) : (
                    p.name
                  )}
                </div>
              </DataPoint>
            ))}
          </div>
        </div>
      )}
      {goTerms && goTerms.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Gene Ontology Terms ({goTerms.length})</h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {goTerms.slice(0, 20).map((t, i) => {
              const term = typeof t === 'string' ? { name: t } : t
              const id = term.id
              const url =
                term.url ||
                (id ? `https://www.ebi.ac.uk/QuickGO/term/${encodeURIComponent(id)}` : undefined)
              return (
                <DataPoint
                  key={id || i}
                  sourceKey="go"
                  fetchedAt={fetchedAt}
                  label={term.name || id || 'GO term'}
                  recordUrl={url}
                >
                  <div className="py-1 px-2 rounded text-sm text-slate-300">
                    {id && <span className="font-mono text-[10px] text-slate-500 mr-2">{id}</span>}
                    {term.name || '—'}
                  </div>
                </DataPoint>
              )
            })}
          </div>
        </div>
      )}
      {(!reactome || reactome.length === 0) && (!wikipathways || wikipathways.length === 0) && (!goTerms || goTerms.length === 0) && (
        <div className="text-slate-500 text-sm py-4">No pathway data found.</div>
      )}
    </div>
  )
}

const GENE_PANELS = [
  { id: 'gene-overview', label: 'Overview' },
  { id: 'gene_drugs', label: 'Targeted Drugs' },
  { id: 'gene-diseases', label: 'Diseases' },
  { id: 'gene-variants', label: 'Variants' },
  { id: 'gene-expression', label: 'Expression' },
  { id: 'gene-pathways', label: 'Pathways' },
] as const

export function GeneDetailPageClient(props: GeneDetailPageClientProps) {
  return (
    <Suspense fallback={<div className="animate-pulse h-96 bg-slate-800/50 rounded-xl" />}>
      <GeneDetailPageClientInner {...props} />
    </Suspense>
  )
}

function GeneDetailPageClientInner({
  geneId,
  symbol,
  name,
  chromosome,
  typeOfGene,
  ensemblId,
  uniprotId,
}: GeneDetailPageClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = searchParams.get('tab') || 'gene-overview'

  const [activePanel, setActivePanel] = useState<string>(initialTab)
  const [categoryData, setCategoryData] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null)

  const categoryDataMap: Partial<Record<CategoryId, Record<string, unknown>>> = loaded ? { gene: categoryData } : {}
  const categoryStatusMap = buildFullStatus('gene', loaded ? 'loaded' : loading ? 'loading' : 'error')
  const fetchedAtMap: Partial<Record<CategoryId, Date>> = fetchedAt ? { gene: fetchedAt } : {}

  const geneIdParam = `${geneId}-${symbol}`

  const loadGeneCategory = useCallback(async () => {
    if (loading || loaded) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/gene/${geneIdParam}/category/gene`)
      if (!res.ok) {
        throw new Error(`Failed to load gene data: ${res.status}`)
      }
      const data = await res.json()
      setCategoryData(data)
      setFetchedAt(new Date())
      setLoaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gene data')
    } finally {
      setLoading(false)
    }
  }, [geneIdParam, loading, loaded])

  useEffect(() => {
    loadGeneCategory()
  }, [loadGeneCategory])

  useEffect(() => {
    const params = new URLSearchParams()
    if (activePanel !== 'gene-overview') params.set('tab', activePanel)
    const search = params.toString()
    router.replace(search ? `?${search}` : '?', { scroll: false })
  }, [activePanel, router])

  const overview = categoryData?.geneOverview as GeneOverviewType | null ?? null
  const sectionStatus = (categoryData?._sectionStatus ?? {}) as Record<string, SectionStatus>

  const displaySymbol = overview?.symbol || symbol
  const displayName = overview?.name || name
  const displayChromosome = overview?.chromosome || chromosome
  const displayType = overview?.typeOfGene || typeOfGene
  const displayMapLocation = overview?.mapLocation || ''
  const displayEnsemblId = overview?.ensemblId || ensemblId
  const displayUniprotId = overview?.uniprotId || uniprotId
  const displayUrl = overview?.url || `https://www.ncbi.nlm.nih.gov/gene/${geneId}`

  // Panel counts for at-a-glance strip (real loaded category data only)
  const drugCount = Array.isArray(categoryData?.geneDrugs)
    ? (categoryData.geneDrugs as unknown[]).length
    : 0
  const diseaseCount = (
    (categoryData?.geneDiseases as { disgenetAssociations?: unknown[] } | undefined)
      ?.disgenetAssociations ?? []
  ).length
  const clinvarCount = (
    (categoryData?.geneVariants as { clinvarVariants?: unknown[] } | undefined)?.clinvarVariants ??
    []
  ).length
  const dbsnpCount = (
    (categoryData?.geneVariants as { dbsnpVariants?: unknown[] } | undefined)?.dbsnpVariants ?? []
  ).length
  const variantCount = clinvarCount + dbsnpCount
  const exprBundle = categoryData?.geneExpressionData as
    | {
        gtexExpressions?: unknown[]
        bgeeExpressions?: unknown[]
        expressionAtlasData?: unknown[]
      }
    | undefined
  const gtexCount = exprBundle?.gtexExpressions?.length ?? 0
  const bgeeCount = exprBundle?.bgeeExpressions?.length ?? 0
  const atlasCount = exprBundle?.expressionAtlasData?.length ?? 0
  /** Align glance strip with all expression panels (was GTEx-only — caused 0 vs 30/20). */
  const expressionCount = gtexCount + bgeeCount + atlasCount
  const pathwayBundle = categoryData?.genePathways as
    | {
        reactomePathways?: unknown[]
        wikiPathways?: unknown[]
        goTerms?: unknown[]
      }
    | undefined
  const pathwayCount =
    (pathwayBundle?.reactomePathways?.length ?? 0) +
    (pathwayBundle?.wikiPathways?.length ?? 0) +
    (pathwayBundle?.goTerms?.length ?? 0)

  const glanceTiles: {
    id: (typeof GENE_PANELS)[number]['id']
    label: string
    count: number | null
    hint: string
  }[] = [
    {
      id: 'gene_drugs',
      label: 'Targeted drugs',
      count: loaded ? drugCount : null,
      hint: 'DGIdb interactions',
    },
    {
      id: 'gene-diseases',
      label: 'Diseases',
      count: loaded ? diseaseCount : null,
      hint: 'DisGeNET associations',
    },
    {
      id: 'gene-variants',
      label: 'Variants',
      count: loaded ? variantCount : null,
      hint: 'ClinVar + dbSNP',
    },
    {
      id: 'gene-expression',
      label: 'Expression',
      count: loaded ? expressionCount : null,
      hint:
        loaded && expressionCount > 0
          ? `GTEx ${gtexCount} · Bgee ${bgeeCount} · Atlas ${atlasCount}`
          : 'GTEx + Bgee + Expression Atlas',
    },
    {
      id: 'gene-pathways',
      label: 'Pathways',
      count: loaded ? pathwayCount : null,
      hint: 'Reactome / Wiki / GO',
    },
  ]

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">
      <main className="flex-1 px-4 sm:px-6 py-4 max-w-6xl mx-auto w-full">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
          <Link href="/" className="text-slate-500 hover:text-slate-300">Home</Link>
          <span className="text-slate-700">/</span>
          <Link href="/gene" className="text-slate-500 hover:text-slate-300">Gene</Link>
          <span className="text-slate-700">/</span>
          <span className="text-indigo-300/80">{displaySymbol}</span>
        </div>

        {/* Compact identity — full summary/aliases live only in Overview tab */}
        <div className="mb-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h1 className="text-3xl font-bold text-slate-100">{displaySymbol}</h1>
              <p className="text-base text-slate-400">{displayName}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link
                href={buildDiscoverHref({ targets: displaySymbol })}
                className="text-xs px-3 py-1.5 rounded-lg border border-emerald-700/50 bg-emerald-900/40 text-emerald-300 hover:border-emerald-500 hover:bg-emerald-900/60 hover:text-emerald-200 transition-colors"
                data-testid="gene-page-discover-cta"
                title={`Pin ${displaySymbol} as a discover target`}
              >
                Discover with target →
              </Link>
              <a
                href={displayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:border-indigo-500 transition-colors"
              >
                NCBI Gene ↗
              </a>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2">
            {displayType && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-800/50">{displayType}</span>
            )}
            {displayChromosome && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-800/50">chr {displayChromosome}</span>
            )}
            {displayMapLocation && displayMapLocation !== displayChromosome && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700" title="Map location">
                {displayMapLocation}
              </span>
            )}
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
              Entrez {geneId}
            </span>
            {displayEnsemblId && (
              <a href={`https://ensembl.org/Homo_sapiens/Gene/Summary?g=${displayEnsemblId}`} target="_blank" rel="noopener noreferrer" className="text-[10px] px-2 py-0.5 rounded bg-violet-900/40 text-violet-300 border border-violet-800/50 hover:underline">Ensembl: {displayEnsemblId}</a>
            )}
            {displayUniprotId && (
              <a href={`https://www.uniprot.org/uniprot/${displayUniprotId}`} target="_blank" rel="noopener noreferrer" className="text-[10px] px-2 py-0.5 rounded bg-cyan-900/40 text-cyan-300 border border-cyan-800/50 hover:underline">UniProt: {displayUniprotId}</a>
            )}
          </div>
        </div>

        {/* At-a-glance: jump into evidence panels (replaces duplicate overview body) */}
        <div
          className="mb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2"
          data-testid="gene-at-a-glance"
        >
          {glanceTiles.map((tile) => (
            <button
              key={tile.id}
              type="button"
              onClick={() => setActivePanel(tile.id)}
              disabled={!loaded && tile.count === null}
              className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                activePanel === tile.id
                  ? 'border-indigo-600/50 bg-indigo-950/40'
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-800/60'
              } disabled:opacity-60`}
              title={tile.hint}
            >
              <p className="text-[10px] uppercase tracking-wide text-slate-500">{tile.label}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-100">
                {loading && tile.count === null ? (
                  <span className="inline-block h-5 w-8 animate-pulse rounded bg-slate-700" />
                ) : (
                  tile.count ?? '—'
                )}
              </p>
              <p className="mt-0.5 text-[9px] text-slate-600 truncate">{tile.hint}</p>
            </button>
          ))}
        </div>

        <div className="flex gap-1 mb-4 overflow-x-auto no-scrollbar border-b border-slate-800/60 pb-px">
          {GENE_PANELS.map(p => (
            <button
              key={p.id}
              className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${
                activePanel === p.id
                  ? 'bg-slate-800/80 text-indigo-300 border-b-2 border-indigo-500'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
              }`}
              onClick={() => setActivePanel(p.id)}
            >
              {p.label}
              {p.id !== 'gene-overview' && loaded && (
                <span className="ml-1 text-[10px] font-normal text-slate-600">
                  {p.id === 'gene_drugs' && drugCount > 0 ? drugCount : ''}
                  {p.id === 'gene-diseases' && diseaseCount > 0 ? diseaseCount : ''}
                  {p.id === 'gene-variants' && variantCount > 0 ? variantCount : ''}
                  {p.id === 'gene-expression' && expressionCount > 0 ? expressionCount : ''}
                  {p.id === 'gene-pathways' && pathwayCount > 0 ? pathwayCount : ''}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading && !loaded && (
          <div className="space-y-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 animate-pulse">
              <div className="h-6 bg-slate-700 rounded w-1/4 mb-3" />
              <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
              <div className="h-4 bg-slate-700 rounded w-1/2" />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300 mb-4">
            <p>{error}</p>
            <button onClick={loadGeneCategory} className="mt-2 text-xs underline text-red-200 hover:text-white">Retry</button>
          </div>
        )}

        {loaded && (
          <div>
            {activePanel === 'gene-overview' && (
              <GeneOverview overview={overview} fetchedAt={fetchedAt} />
            )}
            {activePanel === 'gene_drugs' && (
              <TargetedDrugsPanel data={categoryData} fetchedAt={fetchedAt} />
            )}
            {activePanel === 'gene-diseases' && (
              <GeneDiseasesPanel
                data={categoryData}
                status={sectionStatus.diseases}
                geneSymbol={displaySymbol}
                fetchedAt={fetchedAt}
              />
            )}
            {activePanel === 'gene-variants' && (
              <GeneVariantsPanel data={categoryData} fetchedAt={fetchedAt} />
            )}
            {activePanel === 'gene-expression' && (
              <GeneExpressionPanel data={categoryData} fetchedAt={fetchedAt} />
            )}
            {activePanel === 'gene-pathways' && (
              <GenePathwaysPanel data={categoryData} fetchedAt={fetchedAt} />
            )}
          </div>
        )}
        <AICopilot
          categoryData={categoryDataMap}
          categoryStatus={categoryStatusMap}
          fetchedAt={fetchedAtMap}
          identity={{ name: symbol, cid: 0, geneSymbol: symbol }}
        />
      </main>
    </div>
  )
}