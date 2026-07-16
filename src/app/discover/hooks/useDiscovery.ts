'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { clientFetch } from '@/lib/clientFetch'
import type { RankResult } from '@/lib/candidateRanker'
import type { DiseaseEntity } from '@/lib/domain/entities'

const PROGRESS_STAGES = [
  { label: 'Searching diseases...', progress: 10 },
  { label: 'Identifying disease genes...', progress: 25 },
  { label: 'Finding drug candidates...', progress: 45 },
  { label: 'Analyzing clinical trials...', progress: 65 },
  { label: 'Checking indications...', progress: 80 },
  { label: 'Ranking candidates...', progress: 95 },
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
  status: DiscoveryStatus
  progress: number
  progressLabel: string
  result: RankResult | null
  /** Multi-hit options when status === 'confirm_disease'. */
  diseaseCandidates: DiseaseEntity[]
  error: string | null
}

export interface SearchOptions {
  diseaseId?: string
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
    status: 'idle',
    progress: 0,
    progressLabel: '',
    result: null,
    diseaseCandidates: [],
    error: null,
  })

  const progressRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const abortCurrent = abortRef
    const progressCurrent = progressRef
    return () => {
      if (progressCurrent.current) clearTimeout(progressCurrent.current)
      if (abortCurrent.current) abortCurrent.current.abort()
    }
  }, [])

  const advanceProgress = useCallback((stageIndex: number) => {
    if (stageIndex >= PROGRESS_STAGES.length) return
    const stage = PROGRESS_STAGES[stageIndex]
    setState((prev) => ({
      ...prev,
      progress: stage.progress,
      progressLabel: stage.label,
    }))
    const delay = 1500 + Math.random() * 1500
    progressRef.current = setTimeout(() => advanceProgress(stageIndex + 1), delay)
  }, [])

  const search = useCallback(
    async (query: string, options?: SearchOptions) => {
      const trimmed = query.trim()
      const diseaseId = options?.diseaseId?.trim() || undefined

      if ((!trimmed || trimmed.length < 2) && !diseaseId) return

      const effectiveQuery = trimmed.length >= 2 ? trimmed : diseaseId!

      if (abortRef.current) abortRef.current.abort()
      if (progressRef.current) clearTimeout(progressRef.current)

      setState({
        query: effectiveQuery,
        diseaseId: diseaseId ?? null,
        status: 'loading',
        progress: 0,
        progressLabel: PROGRESS_STAGES[0].label,
        result: null,
        diseaseCandidates: [],
        error: null,
      })

      advanceProgress(0)

      try {
        const params = new URLSearchParams()
        if (trimmed.length >= 2) params.set('q', trimmed)
        else if (diseaseId) params.set('q', diseaseId)
        params.set('limit', '15')
        if (diseaseId) params.set('diseaseId', diseaseId)

        const res = await clientFetch(`/api/discover/rank?${params.toString()}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? data.message ?? `Request failed (${res.status})`)
        }
        const data: RankResult = await res.json()

        if (progressRef.current) clearTimeout(progressRef.current)

        if (needsConfirmation(data) && !diseaseId) {
          const candidates = extractDiseaseCandidates(data)
          setState((prev) => ({
            ...prev,
            status: 'confirm_disease',
            progress: 100,
            progressLabel: `Select a disease for "${effectiveQuery}"`,
            result: data,
            diseaseCandidates: candidates,
            diseaseId: null,
            error: null,
          }))
          return
        }

        setState((prev) => ({
          ...prev,
          status: 'success',
          progress: 100,
          progressLabel: `Found ${data.candidates.length} candidates for "${data.diseaseName}"`,
          result: data,
          diseaseCandidates: [],
          diseaseId: data.diseaseId ?? diseaseId ?? null,
          error: null,
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
          error: err instanceof Error ? err.message : 'Search failed',
        }))
      }
    },
    [advanceProgress],
  )

  const confirmDisease = useCallback(
    (diseaseId: string) => {
      if (!state.query) return
      return search(state.query, { diseaseId })
    },
    [search, state.query],
  )

  const reset = useCallback(() => {
    if (progressRef.current) clearTimeout(progressRef.current)
    if (abortRef.current) abortRef.current.abort()
    setState({
      query: '',
      diseaseId: null,
      status: 'idle',
      progress: 0,
      progressLabel: '',
      result: null,
      diseaseCandidates: [],
      error: null,
    })
  }, [])

  return { state, search, confirmDisease, reset }
}
