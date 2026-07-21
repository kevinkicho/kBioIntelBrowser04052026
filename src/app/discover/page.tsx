'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDiscovery } from './hooks/useDiscovery'
import { DiscoveryHero } from './components/DiscoveryHero'
import { DiseasePicker } from './components/DiseasePicker'
import { DiscoveryProgress, EmptyState, ErrorState } from './components/DiscoveryProgress'
import { CandidateCard } from './components/CandidateCard'
import { CompareSelectionTray } from './components/CompareSelectionTray'
import { ExportResults } from './components/ExportResults'
import { GeneTable } from './components/GeneTable'
import { SourceStatusStrip } from './components/SourceStatusStrip'
import { TargetPinPanel } from '@/components/discover/TargetPinPanel'
import { DiscoverRunTelemetry } from '@/components/discover/DiscoverRunTelemetry'
import { SourceHonestyHeatmap } from '@/components/discover/SourceHonestyHeatmap'
import { RubricWhatIfPanel } from '@/components/discover/RubricWhatIfPanel'
import { DiscoverJourneys } from '@/components/discover/DiscoverJourneys'
import { DiscoverySettingsDrawer } from '@/components/discovery/DiscoverySettingsDrawer'
import { OrphanetPinProvenanceStrip } from '@/components/discovery/OrphanetPinProvenanceStrip'
import { RUBRIC_PRESET_LABELS } from '@/lib/discovery/preferences'
import { MAX_DISCOVER_TARGETS, parseTargetsParam } from '@/lib/discovery/discoverUrl'
import { matchDomainCandidate } from '@/lib/discovery/matchDomainCandidate'
import {
  loadDiscoveryPreferences,
  scoreRubricFromPreferences,
  snapshotDiscoveryPreferences,
} from '@/lib/discovery/preferences'
import {
  listDiscoverSessions,
  saveDiscoverSession,
  deleteDiscoverSession,
  type DiscoverSessionSnapshot,
} from '@/lib/discovery/discoverSessions'
import { AiAnalysisView } from '@/components/discover/AiAnalysisView'
import type { AiRankResult } from '@/lib/ai/aiRank'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

/** Stable key for discover URL params — used to re-run rank when history changes q/diseaseId/targets. */
function discoverUrlKey(
  q: string,
  diseaseId: string | undefined,
  targets: string[],
  forceRefresh: boolean,
  refreshToken: string | null,
): string {
  const t = [...targets]
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .sort()
    .join(',')
  return [
    q.trim().toLowerCase(),
    (diseaseId ?? '').trim(),
    t,
    forceRefresh ? '1' : '0',
    refreshToken ?? '',
  ].join('|')
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
    rerankWithCurrentPins,
  } = useDiscovery()
  /** Last URL key we already applied a rank for (history / deep-link / same-page nav). */
  const appliedUrlKey = useRef<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sessions, setSessions] = useState<DiscoverSessionSnapshot[]>([])
  const [aiRankResult, setAiRankResult] = useState<AiRankResult | null>(null)
  const [showingAiList, setShowingAiList] = useState(false)

  /** Shared Save-to-project context for of-record + AI analysis lists */
  const baseProjectContext = useMemo(() => {
    if (state.status !== 'success' || !state.result) return undefined
    try {
      const prefs = loadDiscoveryPreferences()
      const rubric = state.result.v2?.rubric ?? scoreRubricFromPreferences(prefs)
      return {
        disease: state.result.v2?.disease ?? null,
        targetIds: state.targets,
        rubric,
        preferencesSnapshot: snapshotDiscoveryPreferences(prefs),
        defaultProjectName: state.result.diseaseName
          ? `${state.result.diseaseName} board`
          : undefined,
        rankedAt: state.result.generatedAt ?? null,
      }
    } catch {
      return {
        disease: state.result.v2?.disease ?? null,
        targetIds: state.targets,
        rankedAt: state.result.generatedAt ?? null,
      }
    }
  }, [state.status, state.result, state.targets])

  useEffect(() => {
    setSessions(listDiscoverSessions())
  }, [state.status, state.targets.length])

  const forceRefresh =
    searchParams.get('refresh') === '1' || searchParams.get('refresh') === 'true'
  const refreshToken = searchParams.get('_t')

  // Deep link + search-history reopen: any change to q / diseaseId / targets must re-rank.
  // Previously a bootstrapped ref only ran once, so history clicks only updated the URL field.
  useEffect(() => {
    if (!initialQuery && !initialDiseaseId && initialTargets.length === 0) return

    const key = discoverUrlKey(
      initialQuery,
      initialDiseaseId,
      initialTargets,
      forceRefresh,
      refreshToken,
    )
    if (appliedUrlKey.current === key) return
    appliedUrlKey.current = key

    void search(initialQuery || initialDiseaseId || '', {
      diseaseId: initialDiseaseId,
      targets: initialTargets,
      forceRefresh,
    }).then(() => {
      if (forceRefresh) {
        const next = new URLSearchParams(searchParams.toString())
        next.delete('refresh')
        next.delete('_t')
        const qs = next.toString()
        router.replace(qs ? `/discover?${qs}` : '/discover', { scroll: false })
      }
    })
  }, [
    initialQuery,
    initialDiseaseId,
    initialTargets,
    search,
    forceRefresh,
    refreshToken,
    router,
    searchParams,
  ])

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

  function handleSearch(query: string, opts?: { diseaseId?: string }) {
    const targets = state.targets
    const params = new URLSearchParams()
    params.set('q', query)
    if (opts?.diseaseId) params.set('diseaseId', opts.diseaseId)
    if (targets.length > 0) params.set('targets', targets.join(','))
    // Mark key applied so the URL effect does not double-fetch
    appliedUrlKey.current = discoverUrlKey(query, opts?.diseaseId, targets, false, null)
    router.replace(`/discover?${params.toString()}`, { scroll: false })
    void search(query, {
      targets,
      diseaseId: opts?.diseaseId,
    })
  }

  function handleDiseaseSelect(diseaseId: string) {
    const params = new URLSearchParams()
    if (state.query) params.set('q', state.query)
    params.set('diseaseId', diseaseId)
    if (state.targets.length > 0) params.set('targets', state.targets.join(','))
    appliedUrlKey.current = discoverUrlKey(
      state.query,
      diseaseId,
      state.targets,
      false,
      null,
    )
    router.replace(`/discover?${params.toString()}`, { scroll: false })
    void confirmDisease(diseaseId)
  }

  function handleCancelConfirm() {
    appliedUrlKey.current = discoverUrlKey('', undefined, [], false, null)
    router.replace('/discover', { scroll: false })
    reset()
  }

  function applyTargets(next: string[]) {
    const capped = next
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, MAX_DISCOVER_TARGETS)
    setTargets(capped)
    syncTargetsUrl(capped)
    return capped
  }

  function handleRemoveTarget(symbol: string) {
    const key = symbol.trim().toUpperCase()
    const next = state.targets.filter((t) => t.trim().toUpperCase() !== key)
    const capped = applyTargets(next)
    if (state.query || state.diseaseId) {
      appliedUrlKey.current = discoverUrlKey(
        state.query,
        state.diseaseId ?? undefined,
        capped,
        false,
        null,
      )
      void search(state.query || state.diseaseId || '', {
        diseaseId: state.diseaseId ?? undefined,
        targets: capped,
      })
    }
  }

  function handleClearTargets() {
    applyTargets([])
    if (state.query || state.diseaseId) {
      appliedUrlKey.current = discoverUrlKey(
        state.query,
        state.diseaseId ?? undefined,
        [],
        false,
        null,
      )
      void search(state.query || state.diseaseId || '', {
        diseaseId: state.diseaseId ?? undefined,
        targets: [],
      })
    }
  }

  /** Pin/unpin from GeneTable — updates state + URL targets= (max 10). Re-rank is optional. */
  function handleTogglePin(symbol: string) {
    const trimmed = symbol.trim()
    if (!trimmed) return
    const key = trimmed.toUpperCase()
    const idx = state.targets.findIndex((t) => t.trim().toUpperCase() === key)
    if (idx >= 0) {
      applyTargets(state.targets.filter((_, i) => i !== idx))
      return
    }
    if (state.targets.length >= MAX_DISCOVER_TARGETS) return
    applyTargets([...state.targets, trimmed])
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="page-canvas">
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

        {state.status === 'idle' && (
          <DiscoverJourneys
            disabled={false}
            onRun={(disease) => handleSearch(disease)}
          />
        )}

        <TargetPinPanel
          targets={state.targets}
          waitingForDisease={state.status === 'idle' && !state.query}
          onRemove={handleRemoveTarget}
          onClear={handleClearTargets}
        />

        {/* Local saved sessions (v2.1) — restore does not auto-rank */}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px]" data-testid="discover-sessions">
          <button
            type="button"
            onClick={() => {
              const s = saveDiscoverSession({
                label: state.query || state.diseaseId || 'Session',
                q: state.query,
                diseaseId: state.diseaseId,
                targets: state.targets,
                orphanet: state.orphanetProvenance
                  ? {
                      orphaCode: state.orphanetProvenance.orphaCode,
                      diseaseName: state.orphanetProvenance.diseaseName,
                      genes: state.orphanetProvenance.genes,
                    }
                  : null,
              })
              setSessions(listDiscoverSessions())
              void s
            }}
            disabled={!state.query && !state.diseaseId && state.targets.length === 0}
            className="rounded border border-slate-700 px-2 py-1 text-slate-400 hover:text-slate-200 disabled:opacity-40"
          >
            Save session
          </button>
          {sessions.slice(0, 5).map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1 rounded border border-slate-800 bg-slate-900/50 px-2 py-1 text-slate-500">
              <StyledTooltip content="Restore this session (re-ranks from URL / cache)">
                <button
                  type="button"
                  className="hover:text-indigo-300"
                  aria-label="Restore this session (re-ranks from URL / cache)"
                  onClick={() => {
                    const params = new URLSearchParams()
                    if (s.q) params.set('q', s.q)
                    if (s.diseaseId) params.set('diseaseId', s.diseaseId)
                    if (s.targets.length) params.set('targets', s.targets.join(','))
                    const qs = params.toString()
                    // Clear applied key so the URL effect always re-ranks this session
                    appliedUrlKey.current = null
                    setTargets(s.targets)
                    router.replace(qs ? `/discover?${qs}` : '/discover', { scroll: false })
                  }}
                >
                  {s.label.slice(0, 28)}
                </button>
              </StyledTooltip>
              <button
                type="button"
                className="text-slate-600 hover:text-red-400"
                aria-label={`Delete session ${s.label}`}
                onClick={() => {
                  deleteDiscoverSession(s.id)
                  setSessions(listDiscoverSessions())
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>

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
                      <p className="mt-1 text-[10px] text-slate-600 flex flex-wrap items-center gap-1">
                        <span>
                          Score phase: {state.result.v2.scorePhase}
                          {state.prefs.harvestTiming === 'board-promote' &&
                            state.result.v2.scorePhase === 'cheap' &&
                            ' · safety deferred until promote/harvest'}
                        </span>
                        <StyledTooltip
                          content={
                            state.result.v2.scorePhase === 'full'
                              ? 'Full phase: cheap multi-axis score plus safety/novelty harvest for top candidates.'
                              : 'Cheap phase: multi-axis shortlist without rank-time AE harvest. Load safety scores or promote to board to fill safety/novelty.'
                          }
                        >
                          <span className="inline-flex cursor-help rounded-full border border-slate-700 px-1.5 py-0.5 text-[9px] text-slate-500">
                            ?
                          </span>
                        </StyledTooltip>
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-slate-600">
                      Rubric:{' '}
                      <span className="text-slate-400">
                        {RUBRIC_PRESET_LABELS[state.prefs.rubricPreset]}
                      </span>
                      {' · '}
                      Ranked with free public APIs (deterministic — not generative AI)
                    </p>
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
                    <ExportResults result={state.result} aiRankResult={aiRankResult} />
                  </div>
                </div>

                <DiscoverRunTelemetry
                  result={state.result}
                  harvestStatus={state.harvestStatus}
                  onOpenPreferences={() => setSettingsOpen(true)}
                />

                {(state.result.sourceStatuses?.length ?? 0) > 0 && (
                  <SourceStatusStrip
                    sourceStatuses={state.result.sourceStatuses ?? []}
                    diseaseName={state.result.diseaseName}
                  />
                )}

                <SourceHonestyHeatmap
                  candidates={state.result.candidates}
                  sourceStatuses={state.result.sourceStatuses ?? []}
                  diseaseName={state.result.diseaseName}
                />

                <OrphanetPinProvenanceStrip
                  provenance={state.orphanetProvenance}
                  onRerank={() => void rerankWithCurrentPins()}
                />

                <p className="mb-3 text-[10px] text-slate-600" data-testid="score-trust-banner">
                  Scores are multi-axis investigation priority (not clinical predictions). Missing
                  axes are never invented — expand a card for weight breakdown.
                </p>

                <RubricWhatIfPanel
                  candidates={state.result.candidates}
                  domainCandidates={state.result.v2?.candidates}
                  baseRubric={state.result.v2?.rubric}
                />

                <GeneTable
                  genes={state.result.genes}
                  pinnedTargets={state.targets}
                  onTogglePin={handleTogglePin}
                />

                <CompareSelectionTray
                  candidates={state.result.candidates}
                  diseaseName={state.result.diseaseName}
                />

                <AiAnalysisView
                  diseaseName={state.result.diseaseName}
                  ofRecordCandidates={state.result.candidates}
                  domainCandidates={state.result.v2?.candidates}
                  diseaseGenes={state.result.genes}
                  rubric={state.result.v2?.rubric}
                  rankedAt={state.result.generatedAt}
                  onResult={setAiRankResult}
                  onShowingAiList={setShowingAiList}
                  projectContext={baseProjectContext}
                />

                <div className="space-y-3" hidden={showingAiList || undefined}>
                  {state.result.candidates.map((candidate, i) => {
                    const domainCandidate = matchDomainCandidate(
                      candidate,
                      i,
                      state.result?.v2?.candidates,
                      state.result?.candidates.length ?? 0,
                    )
                    let projectContext
                    try {
                      const prefs = loadDiscoveryPreferences()
                      const rubric =
                        state.result?.v2?.rubric ?? scoreRubricFromPreferences(prefs)
                      projectContext = {
                        disease: state.result?.v2?.disease ?? null,
                        targetIds: state.targets,
                        rubric,
                        preferencesSnapshot: snapshotDiscoveryPreferences(prefs),
                        defaultProjectName: state.result?.diseaseName
                          ? `${state.result.diseaseName} board`
                          : undefined,
                        /** Freeze score vector at board-add time for reproducibility */
                        scoreSnapshot: domainCandidate?.scores ?? null,
                        rankedAt: state.result?.generatedAt ?? null,
                      }
                    } catch {
                      projectContext = {
                        disease: state.result?.v2?.disease ?? null,
                        targetIds: state.targets,
                        scoreSnapshot: domainCandidate?.scores ?? null,
                        rankedAt: state.result?.generatedAt ?? null,
                      }
                    }
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
                        projectContext={projectContext}
                        rankedAt={state.result?.generatedAt}
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
