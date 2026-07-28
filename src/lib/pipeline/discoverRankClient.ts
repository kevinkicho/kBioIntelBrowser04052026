/**
 * Client Discover rank pipeline — reliable cache → network → validate → store.
 * Single-flight per cache key; resource-pressure aware; never invents candidates.
 */

import { clientFetch } from '@/lib/clientFetch'
import type { RankResult } from '@/lib/candidateRanker'
import {
  clearCachedDiscoverRank,
  getCachedDiscoverRankEntry,
  setCachedDiscoverRank,
} from '@/lib/searchHistory'
import { underResourcePressure } from '@/lib/requestProtocol'
import { classifyPipelineError, newPipelineRun, runStage } from './runStage'
import type { PipelineReport } from './types'

export interface DiscoverRankPipelineInput {
  cacheKey: string
  /** POST body for /api/discover/rank */
  body: Record<string, unknown>
  forceRefresh?: boolean
  signal?: AbortSignal
  /** Soft overall budget (default 55s) */
  overallTimeoutMs?: number
}

export interface DiscoverRankPipelineResult {
  result: RankResult
  fromCache: boolean
  pipeline: PipelineReport
}

function isValidRankPayload(data: unknown): data is RankResult {
  if (!data || typeof data !== 'object') return false
  const d = data as RankResult
  return Array.isArray(d.candidates)
}

/**
 * Run of-record Discover rank with staged reliability:
 * 1. cache_lookup (optional skip on forceRefresh)
 * 2. network_rank (retry on resource/upstream)
 * 3. validate
 * 4. cache_store (best-effort)
 */
export async function runDiscoverRankPipeline(
  input: DiscoverRankPipelineInput,
): Promise<DiscoverRankPipelineResult> {
  const run = newPipelineRun('discover-rank')
  const signal = input.signal
  const overallMs = input.overallTimeoutMs ?? 55_000

  // Overall wall clock
  const overallAbort = new AbortController()
  const overallTimer = setTimeout(() => {
    overallAbort.abort(new DOMException('Discover rank overall timeout', 'AbortError'))
  }, overallMs)
  const onParentAbort = () => overallAbort.abort(signal?.reason)
  signal?.addEventListener('abort', onParentAbort, { once: true })
  const mergedSignal = overallAbort.signal

  try {
    // --- cache ---
    if (!input.forceRefresh) {
      const { value: cached, stage } = await runStage(
        { id: 'cache_lookup', timeoutMs: 2_000, optional: true, signal: mergedSignal },
        async () => {
          const entry = getCachedDiscoverRankEntry(input.cacheKey)
          const data = entry?.data as RankResult | null
          if (data && isValidRankPayload(data)) {
            return {
              data: {
                ...data,
                generatedAt: data.generatedAt || entry?.at || undefined,
              } as RankResult,
              at: entry?.at,
            }
          }
          return null
        },
      )
      run.addStage(stage)
      if (cached?.data) {
        run.finish(true, false)
        return {
          result: cached.data,
          fromCache: true,
          pipeline: run.report,
        }
      }
    } else {
      run.addStage({
        id: 'cache_lookup',
        status: 'skipped',
        ms: 0,
        notes: ['forceRefresh — cache bypassed'],
      })
      try {
        clearCachedDiscoverRank(input.cacheKey)
      } catch {
        /* ignore */
      }
    }

    // Under pressure: wait a beat so other sockets can close before rank
    if (underResourcePressure()) {
      run.report.warnings.push('Browser resource pressure — delaying rank 1.2s')
      await new Promise((r) => setTimeout(r, 1200))
    }

    // --- network ---
    const { value: networkResult, stage: netStage } = await runStage(
      {
        id: 'network_rank',
        timeoutMs: Math.min(overallMs - 5_000, 50_000),
        retries: 2,
        retryDelayMs: 900,
        signal: mergedSignal,
        onRetry: (n) => {
          run.report.attempts = n + 1
          run.report.warnings.push(`network_rank retry ${n}`)
        },
      },
      async () => {
        const res = await clientFetch(
          '/api/discover/rank',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input.body),
            signal: mergedSignal,
          },
          {
            // clientFetch already retries resources once; pipeline adds more
            retries: 0,
            timeoutMs: 50_000,
          },
        )
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          const msg =
            (data as { error?: string; message?: string }).error ??
            (data as { message?: string }).message ??
            `Request failed (${res.status})`
          const err = new Error(msg)
          if (res.status >= 500) (err as Error & { retryable?: boolean }).retryable = true
          throw err
        }
        return (await res.json()) as unknown
      },
    )
    run.addStage(netStage)
    if (!networkResult) {
      throw new Error(netStage.error || 'Rank network stage failed')
    }

    // --- validate ---
    const { value: validated, stage: valStage } = await runStage(
      { id: 'validate', timeoutMs: 1_000, signal: mergedSignal },
      async () => {
        if (!isValidRankPayload(networkResult)) {
          throw new Error('Invalid rank payload: missing candidates array')
        }
        return networkResult
      },
    )
    run.addStage(valStage)
    if (!validated) {
      throw new Error(valStage.error || 'Rank validation failed')
    }

    // --- cache store (optional) ---
    const { stage: storeStage } = await runStage(
      { id: 'cache_store', timeoutMs: 1_500, optional: true, signal: mergedSignal },
      async () => {
        setCachedDiscoverRank(input.cacheKey, validated)
        return true
      },
    )
    run.addStage(storeStage)

    const degraded = run.report.stages.some(
      (s) => s.status === 'error' || s.status === 'timeout' || s.status === 'skipped',
    )
    run.finish(true, degraded && storeStage.status !== 'ok')
    return {
      result: validated,
      fromCache: false,
      pipeline: run.report,
    }
  } catch (err) {
    const kind = classifyPipelineError(err)
    const stage =
      (err as { stage?: { id: string; status: string; ms: number; error?: string } }).stage
    if (stage && !run.report.stages.some((s) => s.id === stage.id)) {
      run.addStage({
        id: stage.id,
        status: stage.status === 'timeout' ? 'timeout' : 'error',
        ms: stage.ms ?? 0,
        error: stage.error || (err instanceof Error ? err.message : String(err)),
        errorKind: kind,
      })
    } else if (!run.report.stages.length || run.report.stages.every((s) => s.status === 'ok' || s.status === 'skipped')) {
      run.addStage({
        id: 'pipeline',
        status: kind === 'timeout' ? 'timeout' : 'error',
        ms: 0,
        error: err instanceof Error ? err.message : String(err),
        errorKind: kind,
      })
    }
    run.finish(false, false)
    const e = err instanceof Error ? err : new Error(String(err))
    ;(e as Error & { pipeline?: PipelineReport }).pipeline = run.report
    throw e
  } finally {
    clearTimeout(overallTimer)
    signal?.removeEventListener('abort', onParentAbort)
  }
}

export function formatPipelineForUi(report: PipelineReport): string {
  const parts = report.stages.map((s) => {
    const t = s.ms > 0 ? ` ${s.ms}ms` : ''
    if (s.status === 'ok') return `${s.id}✓${t}`
    if (s.status === 'skipped') return `${s.id}–`
    return `${s.id}✗`
  })
  return parts.join(' · ')
}
