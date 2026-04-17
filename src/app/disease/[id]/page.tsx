import { searchDiseases, getDiseaseGeneAssociations, deduplicateMolecules } from '@/lib/diseaseSearch'
import { searchClinicalTrialsByCondition, sortTrials, extractDrugInterventions } from '@/lib/api/clinicaltrials'
import { DiseaseIntelligencePanel } from '@/components/disease/DiseaseIntelligencePanel'
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
  let molecules: { name: string; cid: number | null }[] = []

  if (query) {
    try {
      const results = await searchDiseases(query, 25)
      const match = results.find(r => r.id === id || r.name === diseaseName)
      if (match) {
        diseaseName = match.name
        description = match.description
        therapeuticAreas = match.therapeuticAreas ?? []
        molecules = match.molecules ?? []
      }
    } catch {}
  }

  const genes = await getDiseaseGeneAssociations(id, source, diseaseName)
  const dedupedMolecules = deduplicateMolecules([{ id, name: diseaseName, source, molecules }])

  const trials = sortTrials(await searchClinicalTrialsByCondition(diseaseName))
  const drugInterventions = extractDrugInterventions(trials)

  const trialSummary = {
    total: trials.length,
    recruiting: trials.filter(t => t.status === 'RECRUITING').length,
    phases: trials.reduce<Record<string, number>>((acc, t) => {
      const p = t.phase || 'N/A'
      acc[p] = (acc[p] || 0) + 1
      return acc
    }, {}),
  }

  const intelligenceContext = {
    diseaseName,
    description,
    therapeuticAreas,
    genes,
    drugInterventions,
    molecules: dedupedMolecules,
    trialSummary,
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
          <div className="flex items-start gap-4 mb-4">
            <h1 className="text-3xl font-bold text-slate-100 flex-1">{diseaseName}</h1>
            {source && (
              <span className="text-xs px-3 py-1.5 rounded-full bg-slate-700/80 text-slate-300 border border-slate-600/50 whitespace-nowrap self-start mt-1">
                {source}
              </span>
            )}
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

          <div className="flex items-center gap-3 text-xs text-slate-500 mt-4 pt-4 border-t border-slate-800">
            <span>ID: <span className="text-slate-400 font-mono">{id}</span></span>
            {source && <span>Source: <span className="text-slate-400">{source}</span></span>}
          </div>
        </div>

        {genes.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-100 mb-1">Associated Genes</h2>
            <p className="text-sm text-slate-400 mb-4">{genes.length} gene{genes.length !== 1 ? 's' : ''} linked to this disease</p>
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left">
                    <th className="px-4 py-3 text-xs text-slate-500 uppercase tracking-wider font-medium">Gene</th>
                    <th className="px-4 py-3 text-xs text-slate-500 uppercase tracking-wider font-medium">Source</th>
                    <th className="px-4 py-3 text-xs text-slate-500 uppercase tracking-wider font-medium text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {genes.map(g => (
                    <tr key={g.geneSymbol} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30">
                      <td className="px-4 py-2.5">
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
                          <span className="font-mono text-slate-200">{g.geneSymbol}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-700/80 text-slate-400">{g.source}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {g.score > 0 ? (
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${Math.min(g.score * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-400 font-mono w-10 text-right">{g.score.toFixed(2)}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {dedupedMolecules.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-100 mb-1">Related Molecules</h2>
            <p className="text-sm text-slate-400 mb-4">{dedupedMolecules.length} candidate molecule{dedupedMolecules.length !== 1 ? 's' : ''} found</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {dedupedMolecules.map(m => (
                m.cid ? (
                  <Link
                    key={`m-${m.cid}`}
                    href={`/molecule/${m.cid}`}
                    className="block bg-slate-800/80 border border-emerald-800/40 hover:border-emerald-500 rounded-xl p-4 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-emerald-300 group-hover:text-emerald-200 truncate">{m.name}</span>
                      <span className="text-[10px] text-slate-500 ml-2 whitespace-nowrap">CID {m.cid}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {m.sources.map(s => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/80 text-slate-400">{s}</span>
                      ))}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-400 border border-emerald-800/40">View</span>
                    </div>
                  </Link>
                ) : (
                  <div
                    key={`m-${m.name}`}
                    className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-400 truncate">{m.name}</span>
                      <span className="text-[10px] text-slate-600 ml-2 whitespace-nowrap">No CID</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {m.sources.map(s => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/80 text-slate-500">{s}</span>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          </section>
        )}

        {drugInterventions.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-100 mb-1">Drugs in Clinical Trials</h2>
            <p className="text-sm text-slate-400 mb-4">{drugInterventions.length} drug{drugInterventions.length !== 1 ? 's' : ''} being tested for {diseaseName}</p>
            <div className="flex flex-wrap gap-2">
              {drugInterventions.map(d => (
                <span key={d.name} className="px-3 py-1.5 rounded-lg bg-amber-900/30 text-amber-300 border border-amber-800/50 text-sm">
                  {d.name}
                  <span className="text-[10px] text-amber-500 ml-1.5">({d.trialCount} trial{d.trialCount !== 1 ? 's' : ''})</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {trials.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-100 mb-1">Clinical Trials</h2>
            <p className="text-sm text-slate-400 mb-4">{trials.length} clinical trial{trials.length !== 1 ? 's' : ''} for {diseaseName}</p>
            <div className="space-y-3">
              {trials.slice(0, 20).map(t => (
                <div key={t.nctId} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <a
                      href={`https://clinicaltrials.gov/study/${t.nctId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-indigo-400 hover:text-indigo-300"
                    >
                      {t.title}
                    </a>
                    <a
                      href={`https://clinicaltrials.gov/study/${t.nctId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-slate-500 hover:text-slate-400 whitespace-nowrap"
                    >
                      {t.nctId}
                    </a>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {t.phase !== 'N/A' && (
                      <span className="text-xs px-2 py-0.5 rounded bg-violet-900/40 text-violet-300 border border-violet-800/50">{t.phase}</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      t.status === 'RECRUITING' ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-800/50' :
                      t.status === 'COMPLETED' ? 'bg-slate-700/60 text-slate-400 border border-slate-600/50' :
                      'bg-slate-700/40 text-slate-500 border border-slate-600/50'
                    }`}>
                      {t.status}
                    </span>
                    <span className="text-xs text-slate-500">{t.sponsor}</span>
                    {t.enrollment != null && (
                      <span className="text-xs text-slate-600">n={t.enrollment.toLocaleString()}</span>
                    )}
                  </div>
                  {t.interventionDetails && t.interventionDetails.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {t.interventionDetails.map((intv, i) => (
                        <span
                          key={`${intv.name}-${i}`}
                          className={`text-xs px-2 py-0.5 rounded ${
                            intv.type === 'DRUG' || intv.type === 'BIOLOGICAL'
                              ? 'bg-amber-900/30 text-amber-300 border border-amber-800/40'
                              : 'bg-slate-700/40 text-slate-400'
                          }`}
                        >
                          {intv.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {trials.length > 20 && (
                <p className="text-xs text-slate-500 text-center">Showing 20 of {trials.length} trials</p>
              )}
            </div>
          </section>
        )}

        <DiseaseIntelligencePanel context={intelligenceContext} />

        {genes.length === 0 && dedupedMolecules.length === 0 && trials.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-8">No gene, molecule, or clinical trial data available for this disease.</p>
        )}
      </div>
    </main>
  )
}