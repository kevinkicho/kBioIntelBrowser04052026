/**
 * Product funnel events for discovery workbench analytics.
 * Dual-emit: legacy names + canonical aliases (V2-09a).
 * Best-effort POST to /api/analytics; never blocks UX.
 * @see docs/design/discovery-workbench-v2.md §6.10
 */

export type ProductEventName =
  | 'discover_search'
  | 'discover_started' // canonical alias of discover_search
  | 'discover_disease_confirm'
  | 'discover_rank_complete'
  | 'discover_rank_completed' // canonical alias
  | 'discover_stage'
  | 'discover_prefs_change'
  | 'preference_changed' // canonical alias of discover_prefs_change
  | 'project_create'
  | 'project_add_candidate'
  | 'board_candidate_added' // canonical alias
  | 'pack_export'
  | 'pack_exported' // canonical alias
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

export interface ProductEvent {
  name: ProductEventName
  ts: string
  props?: Record<string, string | number | boolean | null | undefined>
}

/** Legacy → canonical aliases (emit both during dual-emit window). */
export const PRODUCT_EVENT_ALIASES: Partial<Record<ProductEventName, ProductEventName>> = {
  discover_search: 'discover_started',
  discover_rank_complete: 'discover_rank_completed',
  discover_prefs_change: 'preference_changed',
  project_add_candidate: 'board_candidate_added',
  pack_export: 'pack_exported',
}

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
 * Emit a product event. Dual-emits canonical alias when configured.
 */
export function emitProductEvent(
  name: ProductEventName,
  props?: ProductEvent['props'],
): void {
  postOnce(name, props)
  const alias = PRODUCT_EVENT_ALIASES[name]
  if (alias && alias !== name) {
    postOnce(alias, props)
  }
}

/** Prefer this for new call sites — same as emitProductEvent (aliases included). */
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
