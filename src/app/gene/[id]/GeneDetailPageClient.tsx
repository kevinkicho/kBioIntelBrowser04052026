'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { GeneOverview as GeneOverviewType } from '@/lib/categoryFetchers/gene'
import { AICopilot } from '@/components/ai/AICopilot'
import { CATEGORIES, type CategoryId } from '@/lib/categoryConfig'

type CategoryLoadState = 'idle' | 'loading' | 'loaded' | 'error'

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

function GeneOverview({ overview }: { overview: GeneOverviewType | null }) {
  if (!overview) return null
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-indigo-300">{overview.symbol}</h2>
          <p className="text-sm text-slate-400 mt-0.5">{overview.name}</p>
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
        <p className="text-sm text-slate-300 leading-relaxed mb-4">{overview.summary}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
        <div><span className="text-slate-500">Entrez:</span> <a href={overview.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">{overview.geneId}</a></div>
        {overview.ensemblId && <div><span className="text-slate-500">Ensembl:</span> <a href={`https://ensembl.org/Homo_sapiens/Gene/Summary?g=${overview.ensemblId}`} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">{overview.ensemblId}</a></div>}
        {overview.uniprotId && <div><span className="text-slate-500">UniProt:</span> <a href={`https://www.uniprot.org/uniprot/${overview.uniprotId}`} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">{overview.uniprotId}</a></div>}
      </div>

      {overview.aliases && overview.aliases.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          <span className="text-xs text-slate-500 mr-1">Aliases:</span>
          {overview.aliases.map(a => (
            <span key={a} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/80 text-slate-400">{a}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function GeneDiseasesPanel({ data }: { data: Record<string, unknown> | null }) {
  const diseases = (data?.geneDiseases as Record<string, unknown>)?.disgenetAssociations as Array<{ diseaseName: string; score: number; diseaseId: string; source: string; geneSymbol?: string }> | undefined
  if (!diseases || diseases.length === 0) return <div className="text-slate-500 text-sm py-4">No disease associations found.</div>
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-200 mb-3">Associated Diseases ({diseases.length})</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {diseases.slice(0, 30).map((d, i) => (
          <div key={`${d.diseaseId}-${i}`} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-slate-700/50 text-sm">
            <span className="text-slate-300 truncate mr-2">{d.diseaseName}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 shrink-0">{d.score.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function GeneVariantsPanel({ data }: { data: Record<string, unknown> | null }) {
  const clinvarVariants = (data?.geneVariants as Record<string, unknown>)?.clinvarVariants as Array<{ title?: string; clinicalSignificance: string; geneSymbol: string; conditionName?: string; url?: string }> | undefined
  const dbsnpVariants = (data?.geneVariants as Record<string, unknown>)?.dbsnpVariants as Array<unknown> | undefined

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
      {clinvarVariants && clinvarVariants.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">ClinVar Variants ({clinvarVariants.length})</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {clinvarVariants.slice(0, 20).map((v, i) => (
              <div key={i} className="py-1.5 px-2 rounded hover:bg-slate-700/50 text-sm">
                <span className="text-slate-300">{v.geneSymbol}</span>
                <span className="mx-2 text-slate-600">|</span>
                <span className="text-slate-400">{v.clinicalSignificance}</span>
                {v.conditionName && <><span className="mx-2 text-slate-600">|</span><span className="text-slate-400">{v.conditionName}</span></>}
              </div>
            ))}
          </div>
        </div>
      )}
      {dbsnpVariants && dbsnpVariants.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-200 mb-3">dbSNP Variants ({dbsnpVariants.length})</h3>
        </div>
      )}
      {(!clinvarVariants || clinvarVariants.length === 0) && (!dbsnpVariants || dbsnpVariants.length === 0) && (
        <div className="text-slate-500 text-sm py-4">No variant data found.</div>
      )}
    </div>
  )
}

function GeneExpressionPanel({ data }: { data: Record<string, unknown> | null }) {
  const gtexExps = (data?.geneExpressionData as Record<string, unknown>)?.gtexExpressions as Array<{ tissueName?: string; tpm?: number; geneSymbol?: string }> | undefined
  const bgeeExps = (data?.geneExpressionData as Record<string, unknown>)?.bgeeExpressions as Array<unknown> | undefined
  const atlasData = (data?.geneExpressionData as Record<string, unknown>)?.expressionAtlasData as Array<unknown> | undefined

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
      {gtexExps && gtexExps.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">GTEx Top Tissues</h3>
          <div className="space-y-1.5">
            {gtexExps.slice(0, 10).map((e, i) => (
              <div key={i} className="flex items-center justify-between py-1 px-2 rounded hover:bg-slate-700/50 text-sm">
                <span className="text-slate-300 truncate">{e.tissueName || 'Unknown'}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 shrink-0 ml-2">
                  TPM: {typeof e.tpm === 'number' ? e.tpm.toFixed(1) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {bgeeExps && bgeeExps.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Bgee Expression ({bgeeExps.length})</h3>
        </div>
      )}
      {atlasData && atlasData.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Expression Atlas ({atlasData.length})</h3>
        </div>
      )}
      {(!gtexExps || gtexExps.length === 0) && (!bgeeExps || bgeeExps.length === 0) && (!atlasData || atlasData.length === 0) && (
        <div className="text-slate-500 text-sm py-4">No expression data found.</div>
      )}
    </div>
  )
}

function TargetedDrugsPanel({ data }: { data: Record<string, unknown> | null }) {
  const drugs = (data?.geneDrugs as Array<{ drugName?: string; interactionType?: string; sources?: string[]; score?: number }>) ?? []

  if (drugs.length === 0) return <div className="text-slate-500 text-sm py-4">No targeted drug data found.</div>

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-200 mb-3">Drugs targeting this gene ({drugs.length})</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {drugs.map((d, i) => (
          <div key={`${d.drugName}-${i}`} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-slate-700/50 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              {d.drugName && /^\d+$/.test(String(d.drugName)) === false && (
                <Link
                  href={`/molecule/name/${encodeURIComponent(String(d.drugName))}`}
                  className="text-indigo-400 hover:underline truncate"
                >
                  {d.drugName}
                </Link>
              )}
              {!d.drugName && <span className="text-slate-500">Unknown</span>}
              {d.drugName && /^\d+$/.test(String(d.drugName)) && <span className="text-slate-300">{d.drugName}</span>}
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
        ))}
      </div>
    </div>
  )
}

function GenePathwaysPanel({ data }: { data: Record<string, unknown> | null }) {
  const reactome = (data?.genePathways as Record<string, unknown>)?.reactomePathways as Array<{ name?: string; stId?: string; url?: string }> | undefined
  const wikipathways = (data?.genePathways as Record<string, unknown>)?.wikiPathways as Array<{ name?: string; id?: string; url?: string }> | undefined
  const goTerms = (data?.genePathways as Record<string, unknown>)?.goTerms as Array<unknown> | undefined

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
      {reactome && reactome.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Reactome Pathways</h3>
          <div className="space-y-1.5">
            {reactome.slice(0, 10).map((p, i) => (
              <div key={p.stId || i} className="py-1 px-2 rounded hover:bg-slate-700/50 text-sm text-slate-300">
                {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-indigo-400">{p.name}</a> : p.name}
              </div>
            ))}
          </div>
        </div>
      )}
      {wikipathways && wikipathways.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">WikiPathways</h3>
          <div className="space-y-1.5">
            {wikipathways.slice(0, 10).map((p, i) => (
              <div key={p.id || i} className="py-1 px-2 rounded hover:bg-slate-700/50 text-sm text-slate-300">
                {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-indigo-400">{p.name}</a> : p.name}
              </div>
            ))}
          </div>
        </div>
      )}
      {goTerms && goTerms.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Gene Ontology Terms ({goTerms.length})</h3>
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

function GeneDetailPageClientInner({ geneId, symbol, name, summary, chromosome, typeOfGene, aliases, ensemblId, uniprotId }: GeneDetailPageClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = searchParams.get('tab') || 'gene-overview'

  const [activePanel, setActivePanel] = useState<string>(initialTab)
  const [categoryData, setCategoryData] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  const categoryDataMap: Partial<Record<CategoryId, Record<string, unknown>>> = loaded ? { gene: categoryData } : {}
  const categoryStatusMap = buildFullStatus('gene', loaded ? 'loaded' : loading ? 'loading' : 'error')
  const fetchedAtMap: Partial<Record<CategoryId, Date>> = loaded ? { gene: new Date() } : {}

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

  const displaySymbol = overview?.symbol || symbol
  const displayName = overview?.name || name
  const displaySummary = overview?.summary || summary
  const displayChromosome = overview?.chromosome || chromosome
  const displayType = overview?.typeOfGene || typeOfGene
  const displayAliases = overview?.aliases || aliases
  const displayEnsemblId = overview?.ensemblId || ensemblId
  const displayUniprotId = overview?.uniprotId || uniprotId
  const displayUrl = overview?.url || `https://www.ncbi.nlm.nih.gov/gene/${geneId}`

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

        <div className="mb-6">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h1 className="text-3xl font-bold text-slate-100">{displaySymbol}</h1>
              <p className="text-base text-slate-400">{displayName}</p>
            </div>
            <a
              href={displayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:border-indigo-500 transition-colors shrink-0"
            >
              NCBI Gene ↗
            </a>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2">
            {displayType && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-800/50">{displayType}</span>
            )}
            {displayChromosome && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-800/50">chr {displayChromosome}</span>
            )}
            {displayEnsemblId && (
              <a href={`https://ensembl.org/Homo_sapiens/Gene/Summary?g=${displayEnsemblId}`} target="_blank" rel="noopener noreferrer" className="text-[10px] px-2 py-0.5 rounded bg-violet-900/40 text-violet-300 border border-violet-800/50 hover:underline">Ensembl: {displayEnsemblId}</a>
            )}
            {displayUniprotId && (
              <a href={`https://www.uniprot.org/uniprot/${displayUniprotId}`} target="_blank" rel="noopener noreferrer" className="text-[10px] px-2 py-0.5 rounded bg-cyan-900/40 text-cyan-300 border border-cyan-800/50 hover:underline">UniProt: {displayUniprotId}</a>
            )}
          </div>

          {displaySummary && (
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">{displaySummary}</p>
          )}

          {displayAliases.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {displayAliases.map(a => (
                <span key={a} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{a}</span>
              ))}
            </div>
          )}
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
            {activePanel === 'gene-overview' && <GeneOverview overview={overview} />}
            {activePanel === 'gene_drugs' && <TargetedDrugsPanel data={categoryData} />}
            {activePanel === 'gene-diseases' && <GeneDiseasesPanel data={categoryData} />}
            {activePanel === 'gene-variants' && <GeneVariantsPanel data={categoryData} />}
            {activePanel === 'gene-expression' && <GeneExpressionPanel data={categoryData} />}
            {activePanel === 'gene-pathways' && <GenePathwaysPanel data={categoryData} />}
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