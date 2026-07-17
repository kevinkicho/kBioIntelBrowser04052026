/**
 * Product funnel events for discovery workbench analytics.
 * Canonical names only (dual-emit window closed after V2-09 release).
 * Best-effort POST to /api/analytics; never blocks UX.
 * @see docs/design/discovery-workbench-v2.md §6.10
 */

export type ProductEventName =
  | 'discover_started'
  | 'discover_disease_confirmed'
  | 'discover_rank_completed'
  | 'discover_stage'
  | 'preference_changed'
  | 'project_create'
  | 'board_candidate_added'
  | 'pack_exported'
  | 'pack_opened'
  | 'decision_mode_open'
  | 'hypothesis_send_to_board'
  | 'board_status_changed'
  | 'similarity_expand'
  | 'pack_share'
  | 'source_status_shown'
  | 'research_hypothesis_opened'
  | 'ai_response'
  | 'harvest_safety_done'
  | 'project_opened'
  | 'score_breakdown_opened'
  | 'discover_orphanet_genes'
  | 'rubric_changed'
  | 'preference_tooltip_opened'

/** Success-metric tags from design v1 §1.5 / v2 §6.10. */
export type ProductMetricId = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'M8' | 'M9' | '—'

export const PRODUCT_EVENT_LABELS: Record<ProductEventName, string> = {
  discover_started: 'Discover started',
  discover_disease_confirmed: 'Disease confirmed',
  discover_rank_completed: 'Rank completed',
  discover_stage: 'Discover stage (timing)',
  preference_changed: 'Preference changed',
  project_create: 'Project created',
  board_candidate_added: 'Candidate added to board',
  pack_exported: 'Pack exported',
  pack_opened: 'Pack opened',
  decision_mode_open: 'Decision mode opened',
  hypothesis_send_to_board: 'Hypothesis → board',
  board_status_changed: 'Board status changed',
  similarity_expand: 'Similarity expand',
  pack_share: 'Pack share link',
  source_status_shown: 'Source status shown',
  research_hypothesis_opened: 'Research hypothesis opened',
  ai_response: 'Pack AI response',
  harvest_safety_done: 'Safety harvest done',
  project_opened: 'Project opened',
  score_breakdown_opened: 'Score breakdown opened',
  discover_orphanet_genes: 'Orphanet genes pinned',
  rubric_changed: 'Rubric changed',
  preference_tooltip_opened: 'Preference tooltip opened',
}

export const PRODUCT_EVENT_METRIC: Record<ProductEventName, ProductMetricId> = {
  discover_started: 'M1',
  discover_disease_confirmed: 'M1',
  discover_rank_completed: 'M1',
  discover_stage: 'M7',
  preference_changed: 'M4',
  project_create: 'M8',
  board_candidate_added: 'M1',
  pack_exported: 'M3',
  pack_opened: 'M1',
  decision_mode_open: '—',
  hypothesis_send_to_board: '—',
  board_status_changed: 'M2',
  similarity_expand: '—',
  pack_share: '—',
  source_status_shown: 'M6',
  research_hypothesis_opened: 'M1',
  ai_response: 'M5',
  harvest_safety_done: 'M7',
  project_opened: 'M8',
  score_breakdown_opened: 'M4',
  discover_orphanet_genes: '—',
  rubric_changed: 'M4',
  preference_tooltip_opened: 'M9',
}

export const PRODUCT_METRIC_LABELS: Record<ProductMetricId, string> = {
  M1: 'Loop completion',
  M2: 'Board depth',
  M3: 'Citation density',
  M4: 'Score / preference inspect',
  M5: 'AI refuse-correctness',
  M6: 'Core reliability',
  M7: 'Time-to-shortlist',
  M8: 'Return project',
  M9: 'Preference transparency',
  '—': 'Other',
}

export interface ProductEvent {
  name: ProductEventName
  ts: string
  props?: Record<string, string | number | boolean | null | undefined>
}

export function productEventLabel(name: string): string {
  return PRODUCT_EVENT_LABELS[name as ProductEventName] ?? name.replace(/_/g, ' ')
}

export function productEventMetric(name: string): ProductMetricId {
  return PRODUCT_EVENT_METRIC[name as ProductEventName] ?? '—'
}

export interface ProductEventCount {
  name: ProductEventName | string
  label: string
  metric: ProductMetricId
  count: number
  lastAt: string | null
}

/** Aggregate local queue (and optional server rows) by event name. */
export function summarizeProductEvents(
  events: readonly { name: string; ts?: string }[],
): ProductEventCount[] {
  const map = new Map<string, { count: number; lastAt: string | null }>()
  for (const e of events) {
    const prev = map.get(e.name) ?? { count: 0, lastAt: null }
    prev.count += 1
    if (e.ts && (!prev.lastAt || e.ts > prev.lastAt)) prev.lastAt = e.ts
    map.set(e.name, prev)
  }
  return Array.from(map.entries())
    .map(([name, v]) => ({
      name,
      label: productEventLabel(name),
      metric: productEventMetric(name),
      count: v.count,
      lastAt: v.lastAt,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

/**
 * @deprecated Dual-emit window closed. Empty map kept so older tests / imports
 * do not break; emitProductEvent no longer fans out aliases.
 */
export const PRODUCT_EVENT_ALIASES: Partial<Record<ProductEventName, ProductEventName>> = {}

const QUEUE_KEY = 'biointel-product-events-v1'
const MAX_QUEUED = 100

function canSend(): boolean {
  return typeof window !== 'undefined' && typeof fetch === 'function'
}

function enqueue(ev: ProductEvent): void {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const arr: ProductEvent[] = raw ? (JSON.parse(raw) as ProductEvent[]) : []
    arr.push(ev)
    while (arr.length > MAX_QUEUED) arr.shift()
    localStorage.setItem(QUEUE_KEY, JSON.stringify(arr))
  } catch {
    // ignore
  }
}

function postOnce(name: ProductEventName, props?: ProductEvent['props']): void {
  const ev: ProductEvent = {
    name,
    ts: new Date().toISOString(),
    props,
  }
  if (typeof window !== 'undefined') enqueue(ev)
  if (!canSend()) return

  try {
    void fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'product',
        endpoint: name,
        status: 200,
        duration_ms: typeof props?.ms === 'number' ? props.ms : 0,
        items_count: typeof props?.count === 'number' ? props.count : 1,
        error: props ? JSON.stringify(props).slice(0, 500) : undefined,
      }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // never throw
  }
}

/**
 * Emit a product event (canonical name only — no dual-emit).
 */
export function emitProductEvent(
  name: ProductEventName,
  props?: ProductEvent['props'],
): void {
  postOnce(name, props)
}

/** @deprecated Prefer emitProductEvent — same behavior after clean-cut. */
export function emitProductEventCanonical(
  name: ProductEventName,
  props?: ProductEvent['props'],
): void {
  emitProductEvent(name, props)
}

/**
 * Emit discover_stage entries from rank v2.timingMs (post-hoc only).
 * Never call from fake progress timers.
 */
export function emitDiscoverStagesFromTimingMs(
  timingMs: Partial<Record<string, number>> | undefined | null,
): void {
  if (!timingMs) return
  for (const [stage, ms] of Object.entries(timingMs)) {
    if (stage === 'total' || typeof ms !== 'number') continue
    emitProductEvent('discover_stage', {
      stage,
      ms,
      source: 'rank_timingMs',
    })
  }
}

export function readQueuedProductEvents(): ProductEvent[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? (JSON.parse(raw) as ProductEvent[]) : []
  } catch {
    return []
  }
}

/** Test / debug helper — clears the local product-event queue. */
export function clearQueuedProductEvents(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(QUEUE_KEY)
  } catch {
    // ignore
  }
}
