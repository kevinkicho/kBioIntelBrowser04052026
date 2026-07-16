/**
 * Helpers for per-source fetch status on discovery responses.
 */

import type { DataLoadStatus, SourceFetchStatus } from '../dataStatus'

export function makeSourceStatus(
  source: string,
  status: DataLoadStatus,
  opts?: { durationMs?: number; error?: string; hasData?: boolean },
): SourceFetchStatus {
  return {
    source,
    status,
    duration_ms: opts?.durationMs,
    error: opts?.error,
    has_data: opts?.hasData ?? status === 'loaded',
  }
}

/**
 * Run an async gather step and produce a SourceFetchStatus.
 * Never throws — returns fallback on failure.
 */
export async function withSourceStatus<T>(
  source: string,
  fn: () => Promise<T>,
  opts: {
    fallback: T
    hasData: (value: T) => boolean
  },
): Promise<{ value: T; status: SourceFetchStatus }> {
  const start = Date.now()
  try {
    const value = await fn()
    const hasData = opts.hasData(value)
    return {
      value,
      status: makeSourceStatus(source, hasData ? 'loaded' : 'empty', {
        durationMs: Date.now() - start,
        hasData,
      }),
    }
  } catch (err) {
    return {
      value: opts.fallback,
      status: makeSourceStatus(source, 'error', {
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
        hasData: false,
      }),
    }
  }
}

export function hasDataArray(value: unknown[]): boolean {
  return Array.isArray(value) && value.length > 0
}

export function hasDataMap(value: Map<unknown, unknown>): boolean {
  return value instanceof Map && value.size > 0
}
