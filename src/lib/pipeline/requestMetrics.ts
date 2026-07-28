/**
 * Client-side operator metrics for request gates and pipeline health.
 * Ring buffer only — no network of its own; never blocks product paths.
 */

import { requestGateSnapshot } from '@/lib/requestProtocol'
import { categorySchedulerSnapshot } from './categoryFetchScheduler'
import { underResourcePressure } from '@/lib/requestProtocol'

export type RequestMetricKind =
  | 'fetch'
  | 'fetch_err'
  | 'fetch_resource'
  | 'category'
  | 'pipeline'
  | 'pressure'

export interface RequestMetricEvent {
  ts: number
  kind: RequestMetricKind
  label: string
  ms?: number
  status?: number
  detail?: string
}

const MAX_EVENTS = 80
const events: RequestMetricEvent[] = []
const listeners = new Set<() => void>()

function notify(): void {
  for (const l of Array.from(listeners)) {
    try {
      l()
    } catch {
      /* ignore */
    }
  }
}

export function recordRequestMetric(
  kind: RequestMetricKind,
  label: string,
  extra?: { ms?: number; status?: number; detail?: string },
): void {
  events.push({
    ts: Date.now(),
    kind,
    label: label.slice(0, 160),
    ms: extra?.ms,
    status: extra?.status,
    detail: extra?.detail?.slice(0, 200),
  })
  while (events.length > MAX_EVENTS) events.shift()
  notify()
}

export function getRequestMetrics(): RequestMetricEvent[] {
  return events.slice()
}

export function clearRequestMetrics(): void {
  events.length = 0
  notify()
}

export function subscribeRequestMetrics(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export interface RequestMetricsSnapshot {
  at: string
  browserGate: { inFlight: number; waiting: number; max: number }
  categoryGate: { inFlight: number; waiting: number; max: number }
  resourcePressure: boolean
  recent: RequestMetricEvent[]
  counts: {
    fetch: number
    fetch_err: number
    fetch_resource: number
    category: number
    pipeline: number
    pressure: number
  }
}

export function snapshotRequestMetrics(): RequestMetricsSnapshot {
  const recent = getRequestMetrics()
  const counts = {
    fetch: 0,
    fetch_err: 0,
    fetch_resource: 0,
    category: 0,
    pipeline: 0,
    pressure: 0,
  }
  for (const e of recent) {
    if (e.kind in counts) counts[e.kind]++
  }
  return {
    at: new Date().toISOString(),
    browserGate: requestGateSnapshot(),
    categoryGate: categorySchedulerSnapshot(),
    resourcePressure: underResourcePressure(),
    recent: recent.slice(-40).reverse(),
    counts,
  }
}
