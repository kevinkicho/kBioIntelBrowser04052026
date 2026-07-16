'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDiscovery } from './hooks/useDiscovery'
import { DiscoveryHero } from './components/DiscoveryHero'
import { DiseasePicker } from './components/DiseasePicker'
import { DiscoveryProgress, EmptyState, ErrorState } from './components/DiscoveryProgress'
import { CandidateCard } from './components/CandidateCard'
import { CompareSelectionTray } from './components/CompareSelectionTray'
import { ExportResults } from './components/ExportResults'
import { TargetPinPanel } from '@/components/discover/TargetPinPanel'
import { DiscoverySettingsDrawer } from '@/components/discovery/DiscoverySettingsDrawer'
import { RUBRIC_PRESET_LABELS } from '@/lib/discovery/preferences'
import type { DiseaseGene } from '@/lib/candidateRanker'
import type { DiseaseEntity } from '@/lib/domain/entities'
import { parseTargetsParam } from '@/lib/discovery/discoverUrl'
import type { CandidateMolecule } from '@/lib/candidateRanker'
import type { MoleculeCandidate } from '@/lib/domain'

/**
 * Pair legacy rank DTO with domain v2 candidate.
 * Primary: index-aligned when lengths match; fallback: CID then normalized name.
 * @see docs/design/discovery-workbench-v2.md §6.2.2
 */
export function matchDomainCandidate(
  legacy: CandidateMolecule,
  index: number,
  v2Candidates: MoleculeCandidate[] | undefined,
  legacyCount: number,
): MoleculeCandidate | undefined {
  if (!v2Candidates?.length) return undefined
  if (v2Candidates.length === legacyCount) {
    return v2Candidates[index]
  }
  // Fallback: CID then normalized name (never invent scores)
  if (legacy.cid != null) {
    const byCid = v2Candidates.find((c) => c.identity.pubchemCid === legacy.cid)
    if (byCid) return byCid
  }
  const nameKey = legacy.name.trim().toLowerCase()
  return v2Candidates.find((c) => c.identity.name.trim().toLowerCase() === nameKey)
}

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
  const {
    state,
    search,
    confirmDisease,
    reset,
    updatePrefs,
    resetPrefs,
    harvestSafety,
    setTargets,
  } = useDiscovery()
  const bootstrapped = useRef(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

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

  const scorePhase = state.result?.v2?.scorePhase ?? 'cheap'
  const showLoadSafety =
    state.status === 'success' &&
    !!state.result &&
    state.result.candidates.length > 0 &&
    scorePhase !== 'full' &&
    state.harvestStatus !== 'done'

  function syncTargetsUrl(nextTargets: string[]) {
    const params = new URLSearchParams()
    if (state.query) params.set('q', state.query)
    if (state.diseaseId) params.set('diseaseId', state.diseaseId)
    if (nextTargets.length > 0) params.set('targets', nextTargets.join(','))
    const qs = params.toString()
    router.replace(qs ? `/discover?${qs}` : '/discover', { scroll: false })
  }

  function handleSearch(query: string) {
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

  function handleRemoveTarget(symbol: string) {
    const next = state.targets.filter((t) => t !== symbol)
    setTargets(next)
    syncTargetsUrl(next)
    if (state.query || state.diseaseId) {
      void search(state.query || state.diseaseId || '', {
        diseaseId: state.diseaseId ?? undefined,
        targets: next,
      })
    }
  }

  function handleClearTargets() {
    setTargets([])
    syncTargetsUrl([])
    if (state.query || state.diseaseId) {
      void search(state.query || state.diseaseId || '', {
        diseaseId: state.diseaseId ?? undefined,
        targets: [],
      })
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/60 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-indigo-600/50 hover:text-indigo-300"
            aria-label="Open discovery preferences"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
            Preferences
            <span className="hidden text-[10px] text-slate-600 sm:inline">
              · {RUBRIC_PRESET_LABELS[state.prefs.rubricPreset]} ·{' '}
              {state.prefs.harvestTiming === 'rank-time' ? 'rank-time harvest' : 'deferred harvest'}
            </span>
          </button>
        </div>

        <DiscoveryHero
          onSearch={handleSearch}
          isLoading={state.status === 'loading'}
          initialQuery={initialQuery}
        />

        <TargetPinPanel
          targets={state.targets}
          waitingForDisease={state.status === 'idle' && !state.query}
          onRemove={handleRemoveTarget}
          onClear={handleClearTargets}
        />

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
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-100">
                      {state.result.diseaseName}
                    </h2>
                    {state.result.diseaseId && (
                      <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                        {state.result.diseaseId}
                      </p>
                    )}
                    {state.result.therapeuticAreas.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {state.result.therapeuticAreas.map((area) => (
                          <span
                            key={area}
                            className="rounded-full border border-indigo-800/40 bg-indigo-900/30 px-2 py-0.5 text-[10px] text-indigo-300"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    )}
                    {state.result.v2?.scorePhase && (
                      <p className="mt-1 text-[10px] text-slate-600">
                        Score phase: {state.result.v2.scorePhase}
                        {state.prefs.harvestTiming === 'board-promote' &&
                          state.result.v2.scorePhase === 'cheap' &&
                          ' · safety deferred until promote/harvest'}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {showLoadSafety && (
                      <button
                        type="button"
                        onClick={() => void harvestSafety()}
                        disabled={state.harvestStatus === 'loading'}
                        className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-900/40 disabled:opacity-50"
                      >
                        {state.harvestStatus === 'loading'
                          ? 'Loading safety…'
                          : 'Load safety & novelty scores'}
                      </button>
                    )}
                    {state.harvestStatus === 'error' && state.harvestError && (
                      <span className="text-[10px] text-red-400">{state.harvestError}</span>
                    )}
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
                  {state.result.candidates.map((candidate, i) => {
                    const domainCandidate = matchDomainCandidate(
                      candidate,
                      i,
                      state.result?.v2?.candidates,
                      state.result?.candidates.length ?? 0,
                    )
                    return (
                      <CandidateCard
                        key={candidate.name}
                        candidate={candidate}
                        rank={i + 1}
                        diseaseName={state.result?.diseaseName ?? ''}
                        topCandidates={state.result?.candidates ?? []}
                        diseaseGenes={state.result?.genes}
                        domainCandidate={domainCandidate}
                        rubric={state.result?.v2?.rubric}
                      />
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}

        {state.status === 'idle' && (
          <div className="py-12 text-center text-slate-600">
            <p className="mb-2 text-lg">Enter a disease to discover candidate molecules</p>
            <p className="text-sm">
              We rank candidates using clinical trial data, genetic evidence, and drug-target
              interactions. Open Preferences to set scoring rubric, AE mode, and harvest timing.
            </p>
          </div>
        )}
      </div>

      <DiscoverySettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        prefs={state.prefs}
        onChange={updatePrefs}
        onReset={resetPrefs}
      />
    </main>
  )
}
