'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { clientFetch } from '@/lib/clientFetch'
import type { RankResult } from '@/lib/candidateRanker'
import type { DiseaseEntity } from '@/lib/domain/entities'
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
import {
  MAX_DISCOVER_TARGETS,
  mergeOrphanetGenesIntoTargets,
} from '@/lib/discovery/discoverUrl'
import type { ScoreVector } from '@/lib/domain/score'
import {
  emitDiscoverStagesFromTimingMs,
  emitProductEvent,
} from '@/lib/productEvents'

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

export type DiscoveryStatus =
  | 'idle'
  | 'loading'
  | 'confirm_disease'
  | 'success'
  | 'error'

export interface DiscoveryState {
  query: string
  /** Hard-pinned disease id when set (URL or picker selection). */
  diseaseId: string | null
  /** Gene symbols pinned via `targets=` deep-link (disease/gene CTAs). */
  targets: string[]
  status: DiscoveryStatus
  progress: number
  progressLabel: string
  result: RankResult | null
  /** Multi-hit options when status === 'confirm_disease'. */
  diseaseCandidates: DiseaseEntity[]
  error: string | null
  prefs: DiscoveryPreferences
  harvestStatus: 'idle' | 'loading' | 'done' | 'error'
  harvestError: string | null
}

export interface SearchOptions {
  diseaseId?: string
  /** Gene symbols pinned from disease/gene CTAs (URL `targets=`). */
  targets?: string[]
}

function extractDiseaseCandidates(data: RankResult): DiseaseEntity[] {
  return data.v2?.diseaseCandidates ?? []
}

function needsConfirmation(data: RankResult): boolean {
  return Boolean(data.v2?.needsDiseaseConfirmation)
}

export function useDiscovery() {
  const [state, setState] = useState<DiscoveryState>({
    query: '',
    diseaseId: null,
    targets: [],
    status: 'idle',
    progress: 0,
    progressLabel: '',
    result: null,
    diseaseCandidates: [],
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

  /** UX-only progress animation — never emits product analytics (V2-09a). */
  const advanceProgress = useCallback(
    (stages: typeof PROGRESS_STAGES_CHEAP, stageIndex: number) => {
      if (stageIndex >= stages.length) return
      const stage = stages[stageIndex]
      setState((prev) => ({
        ...prev,
        progress: stage.progress,
        progressLabel: stage.label,
      }))
      const delay = 1200 + Math.random() * 1200
      progressRef.current = setTimeout(() => advanceProgress(stages, stageIndex + 1), delay)
    },
    [],
  )

  const updatePrefs = useCallback(
    (patch: Partial<Omit<DiscoveryPreferences, 'version'>>) => {
      setState((prev) => {
        const next = mergeDiscoveryPreferences(prev.prefs, patch)
        if (!next.harvestTimingSticky && patch.harvestTiming !== undefined) {
          saveDiscoveryPreferences({
            ...next,
            harvestTiming: prev.prefs.harvestTiming,
          })
        } else {
          saveDiscoveryPreferences(next)
        }
        emitProductEvent('preference_changed', {
          keys: Object.keys(patch).join(','),
          rubricPreset: next.rubricPreset,
          harvestTiming: next.harvestTiming,
          aeAggressiveness: next.aeAggressiveness,
          collaborationMode: next.collaborationMode,
        })
        return { ...prev, prefs: next }
      })
    },
    [],
  )

  const resetPrefs = useCallback(() => {
    const next = resetDiscoveryPreferences()
    emitProductEvent('preference_changed', { keys: 'reset' })
    setState((prev) => ({ ...prev, prefs: next }))
  }, [])

  const search = useCallback(
    async (query: string, options?: SearchOptions) => {
      const trimmed = query.trim()
      const diseaseId = options?.diseaseId?.trim() || undefined
      const targets = (options?.targets ?? state.targets)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, MAX_DISCOVER_TARGETS)

      // Targets-only deep-link: park pins in state and wait for a disease query
      if ((!trimmed || trimmed.length < 2) && !diseaseId) {
        if (targets.length > 0) {
          setState((prev) => ({
            ...prev,
            query: '',
            diseaseId: null,
            targets,
            status: 'idle',
            progress: 0,
            progressLabel: '',
            result: null,
            diseaseCandidates: [],
            error: null,
            harvestStatus: 'idle',
            harvestError: null,
          }))
        }
        return
      }

      const effectiveQuery = trimmed.length >= 2 ? trimmed : diseaseId!
      const prefs = state.prefs
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
        query: effectiveQuery,
        diseaseId: diseaseId ?? null,
        targets,
        status: 'loading',
        progress: 0,
        progressLabel: stages[0].label,
        result: null,
        diseaseCandidates: [],
        error: null,
        harvestStatus: 'idle',
        harvestError: null,
      }))

      advanceProgress(stages, 0)
      emitProductEvent('discover_started', {
        hasDiseaseId: Boolean(diseaseId),
        targetCount: targets.length,
      })

      try {
        const rubric = scoreRubricFromPreferences(prefs)
        const body = {
          q: trimmed.length >= 2 ? trimmed : undefined,
          diseaseId,
          targets: targets.length > 0 ? targets : undefined,
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

        if (needsConfirmation(data) && !diseaseId) {
          const candidates = extractDiseaseCandidates(data)
          emitProductEvent('discover_started', {
            multiHit: true,
            count: candidates.length,
          })
          setState((prev) => ({
            ...prev,
            status: 'confirm_disease',
            progress: 100,
            progressLabel: `Select a disease for "${effectiveQuery}"`,
            result: data,
            diseaseCandidates: candidates,
            diseaseId: null,
            targets,
            error: null,
          }))
          return
        }

        emitProductEvent('discover_rank_completed', {
          count: data.candidates.length,
          diseaseId: data.diseaseId ?? diseaseId ?? null,
          scorePhase: data.v2?.scorePhase ?? 'cheap',
        })
        // Post-hoc stages from real engine timingMs only (never fake timer labels)
        emitDiscoverStagesFromTimingMs(data.v2?.timingMs)

        // Rare-disease boost: merge Orphanet genes into pins (opt-in; free Orphadata)
        let mergedTargets = targets
        if (prefs.rareDiseaseBoost && data.diseaseName) {
          try {
            const geneRes = await clientFetch(
              `/api/orphanet/genes?q=${encodeURIComponent(data.diseaseName)}`,
              { signal: controller.signal },
            )
            if (geneRes.ok) {
              const body = (await geneRes.json()) as { genes?: unknown }
              const genes = Array.isArray(body.genes)
                ? body.genes.filter((g): g is string => typeof g === 'string')
                : []
              mergedTargets = mergeOrphanetGenesIntoTargets(targets, genes, MAX_DISCOVER_TARGETS)
              if (mergedTargets.length > targets.length) {
                emitProductEvent('discover_orphanet_genes', {
                  diseaseName: data.diseaseName,
                  added: mergedTargets.length - targets.length,
                  total: mergedTargets.length,
                })
              }
            }
          } catch {
            // Non-fatal: ranking already succeeded
          }
        }

        setState((prev) => ({
          ...prev,
          status: 'success',
          progress: 100,
          progressLabel: `Found ${data.candidates.length} candidates for "${data.diseaseName}"`,
          result: data,
          diseaseCandidates: [],
          diseaseId: data.diseaseId ?? diseaseId ?? null,
          targets: mergedTargets,
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
          diseaseCandidates: [],
          targets,
          error: err instanceof Error ? err.message : 'Search failed',
        }))
      }
    },
    [advanceProgress, state.prefs, state.targets],
  )

  const confirmDisease = useCallback(
    (diseaseId: string) => {
      if (!state.query) return
      emitProductEvent('discover_disease_confirmed', { diseaseId })
      return search(state.query, { diseaseId, targets: state.targets })
    },
    [search, state.query, state.targets],
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
          clinicalStage:
            state.result?.v2?.candidates[i]?.scores?.axes.clinicalStage ?? c.clinicalPhase,
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

  const setTargets = useCallback((targets: string[]) => {
    setState((prev) => ({
      ...prev,
      targets: targets.map((t) => t.trim()).filter(Boolean).slice(0, MAX_DISCOVER_TARGETS),
    }))
  }, [])

  const reset = useCallback(() => {
    if (progressRef.current) clearTimeout(progressRef.current)
    if (abortRef.current) abortRef.current.abort()
    setState((prev) => ({
      query: '',
      diseaseId: null,
      targets: [],
      status: 'idle',
      progress: 0,
      progressLabel: '',
      result: null,
      diseaseCandidates: [],
      error: null,
      prefs: prev.prefs,
      harvestStatus: 'idle',
      harvestError: null,
    }))
  }, [])

  return {
    state,
    search,
    confirmDisease,
    reset,
    updatePrefs,
    resetPrefs,
    harvestSafety,
    setTargets,
  }
}
