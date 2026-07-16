'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDiscovery } from './hooks/useDiscovery'
import { DiscoveryHero } from './components/DiscoveryHero'
import { DiseasePicker } from './components/DiseasePicker'
import { DiscoveryProgress, EmptyState, ErrorState } from './components/DiscoveryProgress'
import { CandidateCard } from './components/CandidateCard'
import { CompareSelectionTray } from './components/CompareSelectionTray'
import { ExportResults } from './components/ExportResults'
import type { DiseaseGene } from '@/lib/candidateRanker'
import type { DiseaseEntity } from '@/lib/domain/entities'
import { parseTargetsParam } from '@/lib/discovery/discoverUrl'

function GeneTable({ genes }: { genes: DiseaseGene[] }) {
  if (genes.length === 0) return null
  return (
    <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 mb-6">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">
        Disease-Associated Genes <span className="text-slate-500 font-normal">({genes.length})</span>
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
        {genes.slice(0, 20).map((gene) => (
          <Link
            key={gene.symbol}
            href={`/gene/${gene.symbol}`}
            className="flex items-center gap-2 bg-slate-800/50 hover:bg-slate-800/80 rounded-lg px-3 py-1.5 transition-colors"
          >
            <span className="text-sm font-mono font-semibold text-indigo-300 hover:text-indigo-200">
              {gene.symbol}
            </span>
            <span className="text-[10px] text-slate-500">{gene.score.toFixed(2)}</span>
          </Link>
        ))}
        {genes.length > 20 && (
          <div className="flex items-center justify-center text-xs text-slate-500">
            +{genes.length - 20} more
          </div>
        )}
      </div>
    </div>
  )
}

export default function DiscoverPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQuery = searchParams.get('q') ?? ''
  const initialDiseaseId = searchParams.get('diseaseId') ?? undefined
  const initialTargets = parseTargetsParam(searchParams.get('targets'))
  const { state, search, confirmDisease, reset } = useDiscovery()
  const bootstrapped = useRef(false)

  // Deep link: /discover?q=&diseaseId=&targets= — diseaseId skips picker; targets pin genes
  useEffect(() => {
    if (bootstrapped.current) return
    if (!initialQuery && !initialDiseaseId && initialTargets.length === 0) return
    bootstrapped.current = true
    void search(initialQuery || initialDiseaseId || '', {
      diseaseId: initialDiseaseId,
      targets: initialTargets,
    })
  }, [initialQuery, initialDiseaseId, initialTargets, search])

  function handleSearch(query: string) {
    // Fresh text search clears any prior disease pin; keep target pins from deep-link
    const params = new URLSearchParams()
    params.set('q', query)
    if (state.targets.length > 0) params.set('targets', state.targets.join(','))
    router.replace(`/discover?${params.toString()}`, { scroll: false })
    void search(query, { targets: state.targets })
  }

  function handleDiseaseSelect(diseaseId: string, _disease: DiseaseEntity) {
    const params = new URLSearchParams()
    if (state.query) params.set('q', state.query)
    params.set('diseaseId', diseaseId)
    if (state.targets.length > 0) params.set('targets', state.targets.join(','))
    router.replace(`/discover?${params.toString()}`, { scroll: false })
    void confirmDisease(diseaseId)
  }

  function handleCancelConfirm() {
    router.replace('/discover', { scroll: false })
    reset()
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <DiscoveryHero
          onSearch={handleSearch}
          isLoading={state.status === 'loading'}
          initialQuery={initialQuery}
        />

        {state.targets.length > 0 && (
          <div
            className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-800/40 bg-emerald-950/30 px-4 py-2.5"
            data-testid="discover-pinned-targets"
          >
            <span className="text-xs text-slate-400">Pinned targets</span>
            {state.targets.map((symbol) => (
              <Link
                key={symbol}
                href={`/gene?q=${encodeURIComponent(symbol)}`}
                className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-900/40 text-emerald-300 border border-emerald-800/50 hover:border-emerald-500 transition-colors"
              >
                {symbol}
              </Link>
            ))}
            {state.status === 'idle' && !state.query && (
              <span className="text-xs text-slate-500 ml-1">
                Enter a disease above to rank candidates for these targets
              </span>
            )}
          </div>
        )}

        <DiscoveryProgress state={state} />

        {state.status === 'confirm_disease' && state.diseaseCandidates.length > 0 && (
          <DiseasePicker
            query={state.query}
            candidates={state.diseaseCandidates}
            onSelect={handleDiseaseSelect}
            onCancel={handleCancelConfirm}
            isLoading={false}
          />
        )}

        {state.status === 'error' && (
          <ErrorState
            error={state.error ?? 'An unknown error occurred'}
            onRetry={() =>
              search(state.query, {
                diseaseId: state.diseaseId ?? undefined,
                targets: state.targets,
              })
            }
          />
        )}

        {state.status === 'success' && state.result && (
          <>
            {state.result.candidates.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-100">
                      {state.result.diseaseName}
                    </h2>
                    {state.result.diseaseId && (
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                        {state.result.diseaseId}
                      </p>
                    )}
                    {state.result.therapeuticAreas.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {state.result.therapeuticAreas.map((area) => (
                          <span
                            key={area}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/30 text-indigo-300 border border-indigo-800/40"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">
                      {state.result.candidates.length} candidate
                      {state.result.candidates.length !== 1 ? 's' : ''}
                    </span>
                    <ExportResults result={state.result} />
                  </div>
                </div>

                <GeneTable genes={state.result.genes} />

                <CompareSelectionTray
                  candidates={state.result.candidates}
                  diseaseName={state.result.diseaseName}
                />

                <div className="space-y-3">
                  {state.result.candidates.map((candidate, i) => (
                    <CandidateCard
                      key={candidate.name}
                      candidate={candidate}
                      rank={i + 1}
                      diseaseName={state.result?.diseaseName ?? ''}
                      topCandidates={state.result?.candidates ?? []}
                      diseaseGenes={state.result?.genes}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {state.status === 'idle' && (
          <div className="text-center py-12 text-slate-600">
            <p className="text-lg mb-2">Enter a disease to discover candidate molecules</p>
            <p className="text-sm">
              We rank candidates using clinical trial data, genetic evidence, and drug-target
              interactions.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
