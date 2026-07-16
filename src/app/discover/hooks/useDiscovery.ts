'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { clientFetch } from '@/lib/clientFetch'
import type { RankResult } from '@/lib/candidateRanker'
import type { DiscoveryPreferences } from '@/lib/discovery/preferences'
import {
  DEFAULT_DISCOVERY_PREFERENCES,
  harvestFlagsFromPreferences,
  loadDiscoveryPreferences,
  mergeDiscoveryPreferences,
  resetDiscoveryPreferences,
  saveDiscoveryPreferences,
  scoreRubricFromPreferences,
  snapshotDiscoveryPreferences,
} from '@/lib/discovery/preferences'
import type { ScoreVector } from '@/lib/domain/score'

/** Progressive stages aligned with design §5.1.2 (cheap shortlist + optional harvest). */
const PROGRESS_STAGES_CHEAP = [
  { label: 'Confirming disease...', progress: 8 },
  { label: 'Identifying disease targets...', progress: 22 },
  { label: 'Gathering candidates...', progress: 40 },
  { label: 'Resolving identity (top 25)...', progress: 58 },
  { label: 'Cheap multi-axis scoring...', progress: 78 },
  { label: 'Ranking shortlist...', progress: 92 },
]

const PROGRESS_STAGES_WITH_HARVEST = [
  ...PROGRESS_STAGES_CHEAP.slice(0, 5),
  { label: 'Harvesting safety & novelty (top-15)...', progress: 88 },
  { label: 'Re-ranking with full axes...', progress: 96 },
]

export interface DiscoveryState {
  query: string
  status: 'idle' | 'loading' | 'success' | 'error'
  progress: number
  progressLabel: string
  result: RankResult | null
  error: string | null
  prefs: DiscoveryPreferences
  /** True after a deferred harvest completed for current result. */
  harvestStatus: 'idle' | 'loading' | 'done' | 'error'
  harvestError: string | null
}

export function useDiscovery() {
  const [state, setState] = useState<DiscoveryState>({
    query: '',
    status: 'idle',
    progress: 0,
    progressLabel: '',
    result: null,
    error: null,
    prefs: DEFAULT_DISCOVERY_PREFERENCES,
    harvestStatus: 'idle',
    harvestError: null,
  })

  const progressRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const prefsHydrated = useRef(false)

  useEffect(() => {
    if (prefsHydrated.current) return
    prefsHydrated.current = true
    const loaded = loadDiscoveryPreferences()
    setState((prev) => ({ ...prev, prefs: loaded }))
  }, [])

  useEffect(() => {
    const abortCurrent = abortRef
    const progressCurrent = progressRef
    return () => {
      if (progressCurrent.current) clearTimeout(progressCurrent.current)
      if (abortCurrent.current) abortCurrent.current.abort()
    }
  }, [])

  const advanceProgress = useCallback((stages: typeof PROGRESS_STAGES_CHEAP, stageIndex: number) => {
    if (stageIndex >= stages.length) return
    const stage = stages[stageIndex]
    setState((prev) => ({
      ...prev,
      progress: stage.progress,
      progressLabel: stage.label,
    }))
    const delay = 1200 + Math.random() * 1200
    progressRef.current = setTimeout(() => advanceProgress(stages, stageIndex + 1), delay)
  }, [])

  const updatePrefs = useCallback(
    (patch: Partial<Omit<DiscoveryPreferences, 'version'>>) => {
      setState((prev) => {
        const next = mergeDiscoveryPreferences(prev.prefs, patch)
        // When harvestTimingSticky is false, keep timing in session state only —
        // persist other fields with the previously stored timing.
        if (!next.harvestTimingSticky && patch.harvestTiming !== undefined) {
          saveDiscoveryPreferences({
            ...next,
            harvestTiming: prev.prefs.harvestTiming,
          })
        } else {
          saveDiscoveryPreferences(next)
        }
        return { ...prev, prefs: next }
      })
    },
    [],
  )

  const resetPrefs = useCallback(() => {
    const next = resetDiscoveryPreferences()
    setState((prev) => ({ ...prev, prefs: next }))
  }, [])

  const search = useCallback(
    async (query: string, prefsOverride?: DiscoveryPreferences) => {
      if (!query.trim() || query.trim().length < 2) return

      const trimmed = query.trim()
      const prefs = prefsOverride ?? state.prefs
      const flags = harvestFlagsFromPreferences(prefs)
      const stages = flags.runSafetyHarvest
        ? PROGRESS_STAGES_WITH_HARVEST
        : PROGRESS_STAGES_CHEAP

      if (abortRef.current) abortRef.current.abort()
      if (progressRef.current) clearTimeout(progressRef.current)

      const controller = new AbortController()
      abortRef.current = controller

      setState((prev) => ({
        ...prev,
        query: trimmed,
        status: 'loading',
        progress: 0,
        progressLabel: stages[0].label,
        result: null,
        error: null,
        harvestStatus: 'idle',
        harvestError: null,
      }))

      advanceProgress(stages, 0)

      try {
        const rubric = scoreRubricFromPreferences(prefs)
        const body = {
          q: trimmed,
          limit: 15,
          rubric,
          harvestTiming: prefs.harvestTiming,
          runSafetyHarvest: flags.runSafetyHarvest,
          runNoveltyHarvest: flags.runNoveltyHarvest,
          aeAggressiveness: prefs.aeAggressiveness,
          preferencesSnapshot: snapshotDiscoveryPreferences(prefs),
        }

        const res = await clientFetch('/api/discover/rank', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? data.message ?? `Request failed (${res.status})`)
        }
        const data: RankResult = await res.json()

        if (progressRef.current) clearTimeout(progressRef.current)

        setState((prev) => ({
          ...prev,
          status: 'success',
          progress: 100,
          progressLabel: `Found ${data.candidates.length} candidates for "${data.diseaseName}"`,
          result: data,
          error: null,
          harvestStatus:
            data.v2?.scorePhase === 'full' ? 'done' : flags.runSafetyHarvest ? 'done' : 'idle',
        }))
      } catch (err) {
        if (progressRef.current) clearTimeout(progressRef.current)
        if (err instanceof DOMException && err.name === 'AbortError') return

        setState((prev) => ({
          ...prev,
          status: 'error',
          progress: 0,
          progressLabel: '',
          result: null,
          error: err instanceof Error ? err.message : 'Search failed',
        }))
      }
    },
    [advanceProgress, state.prefs],
  )

  /**
   * Deferred harvest for board/promote default: load safety+novelty for current shortlist.
   */
  const harvestSafety = useCallback(async () => {
    if (!state.result?.candidates?.length) return
    if (state.harvestStatus === 'loading') return

    setState((prev) => ({
      ...prev,
      harvestStatus: 'loading',
      harvestError: null,
      progressLabel: 'Loading safety & novelty scores...',
    }))

    try {
      const prefs = state.prefs
      const rubric = scoreRubricFromPreferences(prefs)
      const body = {
        candidates: state.result.candidates.slice(0, 15).map((c, i) => ({
          name: c.name,
          candidateId: state.result?.v2?.candidates[i]?.candidateId,
          scores: state.result?.v2?.candidates[i]?.scores,
          phaseNorm: c.clinicalPhase,
          clinicalStage: state.result?.v2?.candidates[i]?.scores?.axes.clinicalStage ?? c.clinicalPhase,
        })),
        runSafety: true,
        runNovelty: true,
        rubric,
      }

      const res = await clientFetch('/api/discover/harvest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? data.message ?? `Harvest failed (${res.status})`)
      }
      const data = (await res.json()) as {
        candidates: { name: string; scores: ScoreVector }[]
      }

      const scoreByName = new Map(
        data.candidates.map((c) => [c.name.toLowerCase(), c.scores]),
      )

      setState((prev) => {
        if (!prev.result) return { ...prev, harvestStatus: 'done' }
        const nextCandidates = [...prev.result.candidates]
          .map((c) => {
            const s = scoreByName.get(c.name.toLowerCase())
            return s ? { ...c, compositeScore: s.composite } : c
          })
          .sort((a, b) => b.compositeScore - a.compositeScore)

        const nextV2 = prev.result.v2
          ? {
              ...prev.result.v2,
              scorePhase: 'full' as const,
              candidates: prev.result.v2.candidates.map((mc) => {
                const s = scoreByName.get(mc.identity.name.toLowerCase())
                return s ? { ...mc, scores: s } : mc
              }),
            }
          : prev.result.v2

        // Re-order v2 to match
        if (nextV2) {
          const order = new Map(nextCandidates.map((c, i) => [c.name.toLowerCase(), i]))
          nextV2.candidates = [...nextV2.candidates].sort(
            (a, b) =>
              (order.get(a.identity.name.toLowerCase()) ?? 0) -
              (order.get(b.identity.name.toLowerCase()) ?? 0),
          )
        }

        return {
          ...prev,
          harvestStatus: 'done',
          progressLabel: 'Safety & novelty scores loaded',
          result: {
            ...prev.result,
            candidates: nextCandidates,
            v2: nextV2,
          },
        }
      })
    } catch (err) {
      setState((prev) => ({
        ...prev,
        harvestStatus: 'error',
        harvestError: err instanceof Error ? err.message : 'Harvest failed',
      }))
    }
  }, [state.result, state.prefs, state.harvestStatus])

  const reset = useCallback(() => {
    if (progressRef.current) clearTimeout(progressRef.current)
    if (abortRef.current) abortRef.current.abort()
    setState((prev) => ({
      query: '',
      status: 'idle',
      progress: 0,
      progressLabel: '',
      result: null,
      error: null,
      prefs: prev.prefs,
      harvestStatus: 'idle',
      harvestError: null,
    }))
  }, [])

  return {
    state,
    search,
    reset,
    updatePrefs,
    resetPrefs,
    harvestSafety,
  }
}
