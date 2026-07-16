'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useDiscovery } from './hooks/useDiscovery'
import { DiscoveryHero } from './components/DiscoveryHero'
import { DiscoveryProgress, EmptyState, ErrorState } from './components/DiscoveryProgress'
import { CandidateCard } from './components/CandidateCard'
import { CompareSelectionTray } from './components/CompareSelectionTray'
import { ExportResults } from './components/ExportResults'
import { DiscoverySettingsDrawer } from '@/components/discovery/DiscoverySettingsDrawer'
import { RUBRIC_PRESET_LABELS } from '@/lib/discovery/preferences'
import type { DiseaseGene } from '@/lib/candidateRanker'

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
  const initialQuery = searchParams.get('q') ?? ''
  const { state, search, updatePrefs, resetPrefs, harvestSafety } = useDiscovery()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const scorePhase = state.result?.v2?.scorePhase ?? 'cheap'
  const showLoadSafety =
    state.status === 'success' &&
    state.result &&
    state.result.candidates.length > 0 &&
    scorePhase !== 'full' &&
    state.harvestStatus !== 'done'

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700/60 text-slate-400 hover:text-indigo-300 hover:border-indigo-600/50 transition-colors"
            aria-label="Open discovery preferences"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
            Preferences
            <span className="text-[10px] text-slate-600 hidden sm:inline">
              · {RUBRIC_PRESET_LABELS[state.prefs.rubricPreset]} ·{' '}
              {state.prefs.harvestTiming === 'rank-time' ? 'rank-time harvest' : 'deferred harvest'}
            </span>
          </button>
        </div>

        <DiscoveryHero
          onSearch={search}
          isLoading={state.status === 'loading'}
          initialQuery={initialQuery}
        />

        <DiscoveryProgress state={state} />

        {state.status === 'error' && (
          <ErrorState
            error={state.error ?? 'An unknown error occurred'}
            onRetry={() => search(state.query)}
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
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/50">
                        Score phase: {scorePhase}
                      </span>
                      {state.result.v2?.preferencesSnapshot && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/50">
                          {state.result.v2.preferencesSnapshot.rubricPreset} ·{' '}
                          {state.result.v2.preferencesSnapshot.aeAggressiveness}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {showLoadSafety && (
                      <button
                        type="button"
                        onClick={() => harvestSafety()}
                        disabled={state.harvestStatus === 'loading'}
                        className="text-xs px-3 py-1.5 rounded-lg bg-amber-900/40 border border-amber-700/50 text-amber-200 hover:bg-amber-900/60 disabled:opacity-50 transition-colors"
                      >
                        {state.harvestStatus === 'loading'
                          ? 'Loading safety…'
                          : 'Load safety scores'}
                      </button>
                    )}
                    {state.harvestStatus === 'error' && (
                      <span className="text-[11px] text-rose-400">{state.harvestError}</span>
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
              Multi-axis ranking: efficacy, clinical stage, safety, novelty, and identity trust.
              Safety harvest is deferred by default — open Preferences to change.
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
