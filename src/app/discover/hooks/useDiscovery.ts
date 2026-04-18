'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { clientFetch } from '@/lib/clientFetch'
import type { RankResult } from '@/lib/candidateRanker'

const PROGRESS_STAGES = [
  { label: 'Searching diseases...', progress: 10 },
  { label: 'Identifying disease genes...', progress: 25 },
  { label: 'Finding drug candidates...', progress: 45 },
  { label: 'Analyzing clinical trials...', progress: 65 },
  { label: 'Checking indications...', progress: 80 },
  { label: 'Ranking candidates...', progress: 95 },
]

export interface DiscoveryState {
  query: string
  status: 'idle' | 'loading' | 'success' | 'error'
  progress: number
  progressLabel: string
  result: RankResult | null
  error: string | null
}

export function useDiscovery() {
  const [state, setState] = useState<DiscoveryState>({
    query: '',
    status: 'idle',
    progress: 0,
    progressLabel: '',
    result: null,
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
    setState(prev => ({
      ...prev,
      progress: stage.progress,
      progressLabel: stage.label,
    }))
    const delay = 1500 + Math.random() * 1500
    progressRef.current = setTimeout(() => advanceProgress(stageIndex + 1), delay)
  }, [])

  const search = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) return

    const trimmed = query.trim()

    if (abortRef.current) abortRef.current.abort()
    if (progressRef.current) clearTimeout(progressRef.current)

    setState({
      query: trimmed,
      status: 'loading',
      progress: 0,
      progressLabel: PROGRESS_STAGES[0].label,
      result: null,
      error: null,
    })

    advanceProgress(0)

    try {
      const res = await clientFetch(`/api/discover/rank?q=${encodeURIComponent(trimmed)}&limit=15`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? data.message ?? `Request failed (${res.status})`)
      }
      const data: RankResult = await res.json()

      if (progressRef.current) clearTimeout(progressRef.current)

      setState(prev => ({
        ...prev,
        status: 'success',
        progress: 100,
        progressLabel: `Found ${data.candidates.length} candidates for "${data.diseaseName}"`,
        result: data,
        error: null,
      }))
    } catch (err) {
      if (progressRef.current) clearTimeout(progressRef.current)
      if (err instanceof DOMException && err.name === 'AbortError') return

      setState(prev => ({
        ...prev,
        status: 'error',
        progress: 0,
        progressLabel: '',
        result: null,
        error: err instanceof Error ? err.message : 'Search failed',
      }))
    }
  }, [advanceProgress])

  const reset = useCallback(() => {
    if (progressRef.current) clearTimeout(progressRef.current)
    if (abortRef.current) abortRef.current.abort()
    setState({
      query: '',
      status: 'idle',
      progress: 0,
      progressLabel: '',
      result: null,
      error: null,
    })
  }, [])

  return { state, search, reset }
}