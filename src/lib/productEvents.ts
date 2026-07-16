/**
 * Product funnel events M1–M9 for discovery workbench analytics (PR16).
 * Best-effort POST to /api/analytics; never blocks UX.
 */

export type ProductEventName =
  | 'discover_search' // M1
  | 'discover_disease_confirm' // M2
  | 'discover_rank_complete' // M3
  | 'discover_stage' // progressive stages
  | 'discover_prefs_change' // M9
  | 'project_create' // M4
  | 'project_add_candidate' // M5
  | 'pack_export' // M6
  | 'decision_mode_open' // M7
  | 'hypothesis_send_to_board' // M8
  | 'board_status_changed' // board triage (M2 depth)
  | 'similarity_expand'
  | 'pack_share'
  | 'source_status_shown' // M6 — SourceStatusStrip
  | 'research_hypothesis_opened'
  | 'ai_response'

export interface ProductEvent {
  name: ProductEventName
  ts: string
  props?: Record<string, string | number | boolean | null | undefined>
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

/**
 * Emit a product event. Fire-and-forget to analytics endpoint.
 * Also mirrors into local queue for offline resilience.
 */
export function emitProductEvent(
  name: ProductEventName,
  props?: ProductEvent['props'],
): void {
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
        duration_ms: 0,
        items_count: typeof props?.count === 'number' ? props.count : 1,
        error: props ? JSON.stringify(props).slice(0, 500) : undefined,
      }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // never throw
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
