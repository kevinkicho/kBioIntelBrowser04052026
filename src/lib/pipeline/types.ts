/**
 * Shared pipeline reliability types — Discover rank, densify, harvest, profile fetch.
 * Stages are deterministic; failures are classified (abort / resource / upstream / logic).
 */

export type PipelineStageStatus =
  | 'pending'
  | 'running'
  | 'ok'
  | 'skipped'
  | 'error'
  | 'timeout'

export type PipelineErrorKind =
  | 'abort'
  | 'resource'
  | 'timeout'
  | 'upstream'
  | 'validation'
  | 'unknown'

export interface PipelineStageResult {
  id: string
  status: PipelineStageStatus
  ms: number
  error?: string
  errorKind?: PipelineErrorKind
  /** Non-fatal notes (partial data, degraded path) */
  notes?: string[]
}

export interface PipelineReport {
  name: string
  runId: string
  startedAt: string
  finishedAt?: string
  ok: boolean
  /** True when result is usable but some stages degraded */
  degraded: boolean
  stages: PipelineStageResult[]
  attempts: number
  warnings: string[]
}

export interface StageOptions {
  id: string
  /** Soft wall-clock for this stage (ms). 0 = no timeout. */
  timeoutMs?: number
  /** Extra attempts after the first (default 0). */
  retries?: number
  /** Base backoff ms (exponential). Default 400. */
  retryDelayMs?: number
  /** If true, stage failure does not fail the whole pipeline. */
  optional?: boolean
  signal?: AbortSignal
  /** Called when a retry is scheduled */
  onRetry?: (attempt: number, err: unknown) => void
}
