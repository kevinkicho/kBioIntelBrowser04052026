/**
 * Run a single pipeline stage with timeout, retry, and error classification.
 */

import {
  isInsufficientResourcesError,
  markResourcePressure,
} from '@/lib/requestProtocol'
import type {
  PipelineErrorKind,
  PipelineReport,
  PipelineStageResult,
  StageOptions,
} from './types'

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function classifyPipelineError(err: unknown): PipelineErrorKind {
  if (!err) return 'unknown'
  if (
    (err instanceof DOMException && err.name === 'AbortError') ||
    (err instanceof Error && err.name === 'AbortError')
  ) {
    return 'abort'
  }
  const msg = err instanceof Error ? err.message : String(err)
  if (/timed out|timeout/i.test(msg)) return 'timeout'
  if (isInsufficientResourcesError(err) || /INSUFFICIENT_RESOURCES|resource pressure/i.test(msg)) {
    return 'resource'
  }
  if (/HTTP [45]\d\d|upstream|ECONNRESET|fetch failed|network/i.test(msg)) {
    return 'upstream'
  }
  if (/invalid|validation|schema|parse/i.test(msg)) return 'validation'
  return 'unknown'
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, 300)
  return String(err).slice(0, 300)
}

async function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  signal?: AbortSignal,
): Promise<T> {
  if (ms <= 0) return p
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Stage timed out after ${ms}ms`))
    }, ms)
  })
  const onAbort = () => {
    if (timer) clearTimeout(timer)
  }
  signal?.addEventListener('abort', onAbort, { once: true })
  try {
    return await Promise.race([p, timeout])
  } finally {
    if (timer) clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

/**
 * Execute one named stage. Optional stages return status=error but do not throw
 * when `optional: true` (caller continues pipeline).
 */
export async function runStage<T>(
  opts: StageOptions,
  fn: () => Promise<T>,
): Promise<{ value: T | null; stage: PipelineStageResult }> {
  const retries = Math.max(0, opts.retries ?? 0)
  const retryDelayMs = opts.retryDelayMs ?? 400
  const timeoutMs = opts.timeoutMs ?? 0
  const start = Date.now()
  let lastErr: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (opts.signal?.aborted) {
      const stage: PipelineStageResult = {
        id: opts.id,
        status: 'error',
        ms: Date.now() - start,
        error: 'Aborted',
        errorKind: 'abort',
      }
      if (opts.optional) return { value: null, stage }
      throw Object.assign(new DOMException('Aborted', 'AbortError'), {
        stage,
      })
    }
    try {
      const value = await withTimeout(fn(), timeoutMs, opts.signal)
      return {
        value,
        stage: {
          id: opts.id,
          status: 'ok',
          ms: Date.now() - start,
          notes: attempt > 0 ? [`succeeded on attempt ${attempt + 1}`] : undefined,
        },
      }
    } catch (err) {
      lastErr = err
      const kind = classifyPipelineError(err)
      if (kind === 'abort') {
        const stage: PipelineStageResult = {
          id: opts.id,
          status: 'error',
          ms: Date.now() - start,
          error: 'Aborted',
          errorKind: 'abort',
        }
        if (opts.optional) return { value: null, stage }
        throw err
      }
      if (kind === 'resource') {
        markResourcePressure(15_000)
      }
      if (attempt < retries && kind !== 'validation') {
        opts.onRetry?.(attempt + 1, err)
        await sleep(retryDelayMs * 2 ** attempt + Math.random() * 120)
        continue
      }
      const stage: PipelineStageResult = {
        id: opts.id,
        status: kind === 'timeout' ? 'timeout' : 'error',
        ms: Date.now() - start,
        error: errorMessage(err),
        errorKind: kind,
      }
      if (opts.optional) {
        return { value: null, stage }
      }
      const e = new Error(stage.error || 'Stage failed')
      ;(e as Error & { stage: PipelineStageResult }).stage = stage
      throw e
    }
  }

  const stage: PipelineStageResult = {
    id: opts.id,
    status: 'error',
    ms: Date.now() - start,
    error: errorMessage(lastErr),
    errorKind: classifyPipelineError(lastErr),
  }
  if (opts.optional) return { value: null, stage }
  throw new Error(stage.error)
}

export function newPipelineRun(name: string): {
  report: PipelineReport
  addStage: (s: PipelineStageResult) => void
  finish: (ok: boolean, degraded?: boolean) => PipelineReport
} {
  const report: PipelineReport = {
    name,
    runId: `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    startedAt: new Date().toISOString(),
    ok: false,
    degraded: false,
    stages: [],
    attempts: 1,
    warnings: [],
  }
  return {
    report,
    addStage(s) {
      report.stages.push(s)
      if (s.status === 'error' || s.status === 'timeout') {
        if (s.error) report.warnings.push(`${s.id}: ${s.error}`)
      }
      if (s.notes) report.warnings.push(...s.notes.map((n) => `${s.id}: ${n}`))
    },
    finish(ok, degraded = false) {
      report.ok = ok
      report.degraded = degraded
      report.finishedAt = new Date().toISOString()
      return report
    },
  }
}
