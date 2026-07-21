import { searchDiseases, getDiseaseGeneAssociations, deduplicateMolecules } from '@/lib/diseaseSearch'
import { searchClinicalTrialsByCondition, sortTrials, extractDrugInterventions } from '@/lib/api/clinicaltrials'
import { getWhoGhoContextForDisease } from '@/lib/api/whoGho'
import { DiseaseIntelligencePanel } from '@/components/disease/DiseaseIntelligencePanel'
import { DiseaseDrugsTrialsTable } from '@/components/disease/DiseaseDrugsTrialsTable'
import { DiseaseRelatedMoleculesTable } from '@/components/disease/DiseaseRelatedMoleculesTable'
import { WhoGhoContextStrip } from '@/components/disease/WhoGhoContextStrip'
import { CrossSourceStrip } from '@/components/crossSource/CrossSourceStrip'
import { buildDiseaseCrossSource } from '@/lib/crossSource'
import { buildDiscoverHref } from '@/lib/discovery/discoverUrl'
import { DataPoint } from '@/components/ui/DataPoint'
import Link from 'next/link'

interface DiseasePageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ source?: string; q?: string }>
}

export default async function DiseaseDetailPage({ params, searchParams }: DiseasePageProps) {
  const { id } = await params
  const sp = await searchParams
  const source = sp.source ?? ''
  const query = sp.q ?? ''

  let diseaseName = decodeURIComponent(id).replace(/_/g, ' ')
  let description: string | undefined
  let therapeuticAreas: string[] = []
  let molecules: {
    name: string
    cid: number | null
    reason?: string
    relationKind?: 'known_drug' | 'gene_associated' | 'disease_linked'
  }[] = []

  if (query) {
    try {
      const results = await searchDiseases(query, 25)
      const match = results.find((r) => r.id === id || r.name === diseaseName)
      if (match) {
        diseaseName = match.name
        description = match.description
        therapeuticAreas = match.therapeuticAreas ?? []
        molecules = match.molecules ?? []
      }
    } catch {}
  }

  const fetchedAt = new Date().toISOString()
  const genes = await getDiseaseGeneAssociations(id, source, diseaseName)
  const dedupedMolecules = deduplicateMolecules([
    { id, name: diseaseName, source, molecules },
  ])

  const trials = sortTrials(await searchClinicalTrialsByCondition(diseaseName))
  const drugInterventions = extractDrugInterventions(trials)
  let whoGho: Awaited<ReturnType<typeof getWhoGhoContextForDisease>> = {
    indicators: [],
    facts: [],
  }
  try {
    whoGho = await getWhoGhoContextForDisease(diseaseName)
  } catch {
    /* free API optional */
  }

  const trialSummary = {
    total: trials.length,
    recruiting: trials.filter(t => t.status === 'RECRUITING').length,
    phases: trials.reduce<Record<string, number>>((acc, t) => {
      const p = t.phase || 'N/A'
      acc[p] = (acc[p] || 0) + 1
      return acc
    }, {}),
  }

  const topTargetSymbols = genes
    .slice(0, 5)
    .map((g) => g.geneSymbol)
    .filter(Boolean)

  const discoverHref = buildDiscoverHref({
    q: diseaseName,
    diseaseId: id,
    targets: topTargetSymbols.length > 0 ? topTargetSymbols : undefined,
  })

  const intelligenceContext = {
    diseaseName,
    diseaseId: id,
    description,
    therapeuticAreas,
    genes,
    drugInterventions,
    molecules: dedupedMolecules,
    trialSummary,
  }

  const diseaseCrossSource = buildDiseaseCrossSource({
    diseaseId: id,
    diseaseName,
    geneCount: genes.length,
    geneSource: source || genes[0]?.source || 'Open Targets / DisGeNET',
    trialDrugCount: drugInterventions.length,
    moleculeCount: dedupedMolecules.length,
    moleculeSources: Array.from(
      new Set(
        dedupedMolecules
          .flatMap((m) => [m.relationKind, ...(m.reasons ?? [])])
          .filter(Boolean)
          .map(String),
      ),
    ).slice(0, 6),
    orphanetHit: /orphanet/i.test(source) || therapeuticAreas.some((t) => /orphan/i.test(t)),
    openTargetsHit: /open.?target/i.test(source) || Boolean(id),
  })

  /** Map gene association source label → provenance key */
  const geneSourceKey = (src: string): string => {
    const s = (src || '').toLowerCase()
    if (s.includes('open target')) return 'opentargets'
    if (s.includes('disgenet')) return 'disgenet'
    if (s.includes('orphanet')) return 'orphanet'
    if (s.includes('gwas')) return 'gwas-catalog'
    return s || 'opentargets'
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <nav className="text-sm text-slate-500 mb-6 flex items-center gap-2">
          <Link href="/disease" className="hover:text-slate-300 transition-colors">Disease Search</Link>
          <span>/</span>
          <span className="text-slate-300">{diseaseName}</span>
        </nav>

        <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-8 mb-8">
          <DataPoint
            sourceKey={source || 'opentargets'}
            label={diseaseName}
            fetchedAt={fetchedAt}
            recordUrl={
              id
                ? `https://platform.opentargets.org/disease/${encodeURIComponent(id)}`
                : undefined
            }
            className="mb-2"
          >
            <div className="w-full min-w-0">
              <div className="flex flex-wrap items-start gap-4 mb-4">
                <h1 className="text-3xl font-bold text-slate-100 flex-1 min-w-0">{diseaseName}</h1>
                <div className="flex flex-wrap items-center gap-2 shrink-0 self-start mt-1">
                  {source && (
                    <span className="text-xs px-3 py-1.5 rounded-full bg-slate-700/80 text-slate-300 border border-slate-600/50 whitespace-nowrap">
                      {source}
                    </span>
                  )}
                  <Link
                    href={discoverHref}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700/50 bg-emerald-900/40 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:border-emerald-500 hover:bg-emerald-900/60 hover:text-emerald-200"
                    data-testid="disease-page-discover-cta"
                  >
                    Discover candidates
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>

              {description && (
                <p className="text-slate-400 text-base leading-relaxed mb-4">{description}</p>
              )}

              {therapeuticAreas.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {therapeuticAreas.map(ta => (
                    <span key={ta} className="text-xs px-3 py-1 rounded-full bg-indigo-900/40 text-indigo-300 border border-indigo-800/50">
                      {ta}
                    </span>
                  ))}
                </div>
              )}

              <CrossSourceStrip
                bundle={diseaseCrossSource}
                className="mb-4 mt-2"
                testId="disease-cross-source"
              />

              <div className="flex items-center gap-3 text-xs text-slate-500 mt-4 pt-4 border-t border-slate-800">
                <span>ID: <span className="text-slate-400 font-mono">{id}</span></span>
                {source && <span>Source: <span className="text-slate-400">{source}</span></span>}
                <span className="text-slate-600">· API button for provenance</span>
              </div>
            </div>
          </DataPoint>
        </div>

        <WhoGhoContextStrip
          diseaseName={diseaseName}
          indicators={whoGho.indicators}
          facts={whoGho.facts}
        />

        {genes.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-100 mb-1">Associated Genes</h2>
            <p className="text-sm text-slate-400 mb-4">
              {genes.length} gene{genes.length !== 1 ? 's' : ''} linked to this disease · each row has API provenance
            </p>
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(6rem,0.6fr)_minmax(5rem,0.5fr)_2.5rem] gap-x-2 border-b border-slate-800 px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                <span>Gene</span>
                <span>Source</span>
                <span className="text-right">Score</span>
                <span className="text-right">API</span>
              </div>
              {genes.map(g => {
                const geneHref = g.entrezId
                  ? `https://www.ncbi.nlm.nih.gov/gene/${g.entrezId}`
                  : g.geneSymbol
                    ? `/gene?q=${encodeURIComponent(g.geneSymbol)}`
                    : undefined
                const sk = geneSourceKey(g.source)
                return (
                  <DataPoint
                    key={g.geneSymbol}
                    sourceKey={sk}
                    label={g.geneSymbol}
                    fetchedAt={fetchedAt}
                    recordUrl={geneHref}
                    className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30"
                  >
                    <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(6rem,0.6fr)_minmax(5rem,0.5fr)] items-center gap-x-2 px-4 py-2.5 text-sm">
                      <div className="min-w-0">
                        {g.entrezId ? (
                          <a
                            href={`https://www.ncbi.nlm.nih.gov/gene/${g.entrezId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 font-mono font-medium"
                          >
                            {g.geneSymbol}
                          </a>
                        ) : (
                          <Link
                            href={`/gene?q=${encodeURIComponent(g.geneSymbol)}`}
                            className="font-mono text-indigo-400 hover:text-indigo-300"
                          >
                            {g.geneSymbol}
                          </Link>
                        )}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-700/80 text-slate-400 w-fit">
                        {g.source}
                      </span>
                      <div className="text-right">
                        {g.score > 0 ? (
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${Math.min(g.score * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-400 font-mono w-10 text-right">
                              {g.score.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">-</span>
                        )}
                      </div>
                    </div>
                  </DataPoint>
                )
              })}
            </div>
          </section>
        )}

        {dedupedMolecules.length > 0 && (
          <DiseaseRelatedMoleculesTable
            molecules={dedupedMolecules}
            diseaseName={diseaseName}
            fetchedAt={fetchedAt}
          />
        )}

        {drugInterventions.length > 0 && (
          <DiseaseDrugsTrialsTable
            drugs={drugInterventions}
            diseaseName={diseaseName}
            fetchedAt={fetchedAt}
          />
        )}

        {/* Orphan trials with no drug/biological intervention still listed flat */}
        {trials.length > 0 && drugInterventions.length === 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-100 mb-1">Clinical Trials</h2>
            <p className="text-sm text-slate-400 mb-4">
              {trials.length} clinical trial{trials.length !== 1 ? 's' : ''} for {diseaseName}
            </p>
            <div className="space-y-1">
              {trials.slice(0, 30).map(t => (
                <DataPoint
                  key={t.nctId}
                  sourceKey="clinical-trials"
                  label={t.nctId}
                  fetchedAt={fetchedAt}
                  recordUrl={`https://clinicaltrials.gov/study/${t.nctId}`}
                  endpointOverride="https://clinicaltrials.gov/api/v2/studies"
                  className="rounded-xl border border-slate-700/50 bg-slate-900/60"
                >
                  <div className="p-3">
                    <a
                      href={`https://clinicaltrials.gov/study/${t.nctId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-indigo-400 hover:text-indigo-300"
                    >
                      {t.title}
                    </a>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="font-mono">{t.nctId}</span>
                      {t.phase !== 'N/A' && <span>{t.phase}</span>}
                      <span>{t.status}</span>
                      <span>{t.sponsor}</span>
                    </div>
                  </div>
                </DataPoint>
              ))}
            </div>
          </section>
        )}

        <DiseaseIntelligencePanel context={intelligenceContext} />

        {genes.length === 0 && dedupedMolecules.length === 0 && trials.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-8">
            No gene, molecule, or clinical trial data available for this disease.
          </p>
        )}
      </div>
    </main>
  )
}
