/**
 * Retrieval world-model for Copilot Monitor + agent tools.
 * Distinguishes empty (honest no rows) vs timeout/error (actionable) vs pending.
 */

import { CATEGORIES, type CategoryId } from '../categoryConfig'
import type { CategoryLoadState } from '../fetchCategory'
import { sourceStatusForPanel, type SourceStatusLike } from '../panelApiTrace'
import type { DataLoadStatus } from '../dataStatus'

export type PanelRetrievalStatusKind =
  | 'pending'
  | 'fetching'
  | 'success'
  | 'empty'
  | 'error'
  | 'timeout'
  | 'disabled'

export interface PanelRetrievalStatus {
  panelKey: string
  /** categoryConfig panel id when known */
  panelId?: string
  /** Human title for Monitor UI */
  title: string
  status: PanelRetrievalStatusKind
  durationMs?: number
  itemCount?: number
  error?: string
}

export interface CategoryRetrievalHealth {
  categoryId: CategoryId
  label: string
  loadState: CategoryLoadState
  panels: PanelRetrievalStatus[]
  totalPanels: number
  successPanels: number
  emptyPanels: number
  errorPanels: number
  timeoutPanels: number
  disabledPanels: number
  pendingPanels: number
  totalDurationMs: number
  avgDurationMs: number
  /** success / (success+empty+error+timeout+disabled) among loaded categories only */
  completeness: number
  fetchStartedAt?: Date
  fetchCompletedAt?: Date
}

export interface RetrievalSnapshot {
  categories: Record<CategoryId, CategoryRetrievalHealth>
  /** Panel-level success ratio over terminal outcomes (not "categories loaded") */
  overallCompleteness: number
  /** Categories that finished loading (any outcome) / total molecule categories */
  categoryLoadRatio: number
  totalApisCalled: number
  totalApisSucceeded: number
  totalApisErrored: number
  totalApisEmpty: number
  totalApisTimeout: number
  totalApisPending: number
  totalDurationMs: number
  slowestApi: string | null
  gaps: RetrievalGap[]
  anomalies: RetrievalAnomaly[]
  timestamp: string
}

export interface RetrievalGap {
  categoryId: CategoryId
  panelKey: string
  panelId?: string
  title: string
  reason: 'error' | 'timeout' | 'empty' | 'pending' | 'disabled'
  detail?: string
  actionable: boolean
}

export interface RetrievalAnomaly {
  type: 'unexpected_empty' | 'slow_fetch' | 'high_error_rate' | 'data_mismatch' | 'unusual_count'
  severity: 'info' | 'warning' | 'critical'
  panelKey: string
  message: string
}

/** propKey → metadata from categoryConfig */
export interface PanelMeta {
  propKey: string
  panelId: string
  title: string
  categoryId: CategoryId
  categoryLabel: string
}

export function buildPanelMetaIndex(): Map<string, PanelMeta> {
  const map = new Map<string, PanelMeta>()
  for (const cat of CATEGORIES) {
    if (cat.id === 'gene') continue
    for (const p of cat.panels) {
      map.set(p.propKey, {
        propKey: p.propKey,
        panelId: p.id,
        title: p.title,
        categoryId: cat.id,
        categoryLabel: cat.label,
      })
    }
  }
  return map
}

const PANEL_META = buildPanelMetaIndex()

export function panelMetaForPropKey(propKey: string): PanelMeta | undefined {
  return PANEL_META.get(propKey)
}

export function humanPanelTitle(propKey: string): string {
  return PANEL_META.get(propKey)?.title || propKey
}

/** Legacy KNOWN_PANEL_KEYS derived from config so we never drift. */
export function knownPanelKeysByCategory(): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const cat of CATEGORIES) {
    out[cat.id] = cat.panels.map((p) => p.propKey)
  }
  return out
}

function countItems(val: unknown): number {
  if (Array.isArray(val)) return val.length
  if (val && typeof val === 'object') {
    const o = val as Record<string, unknown>
    if ('results' in o && Array.isArray(o.results)) return o.results.length
    if ('data' in o && Array.isArray(o.data)) return o.data.length
    // Non-empty object with real fields
    const keys = Object.keys(o).filter((k) => !k.startsWith('_'))
    if (keys.length === 0) return 0
    return 1
  }
  if (val === null || val === undefined || val === '') return 0
  return 1
}

function mapSourceStatus(
  st: DataLoadStatus | string | undefined,
): PanelRetrievalStatusKind | null {
  if (!st) return null
  if (st === 'loaded') return 'success'
  if (st === 'empty' || st === 'error' || st === 'timeout' || st === 'disabled') {
    return st
  }
  return null
}

function resolvePanelStatus(input: {
  loadState: CategoryLoadState
  val: unknown
  itemCount: number
  sourceLike?: SourceStatusLike
}): {
  status: PanelRetrievalStatusKind
  error?: string
  durationMs?: number
} {
  const { loadState, val, itemCount, sourceLike } = input

  if (loadState === 'idle') return { status: 'pending' }
  if (loadState === 'loading') {
    if (val !== undefined && itemCount > 0) return { status: 'success' }
    if (val !== undefined && itemCount === 0) return { status: 'empty' }
    return { status: 'fetching' }
  }

  // Prefer server honesty when present
  const fromSource = mapSourceStatus(sourceLike?.status)
  if (fromSource) {
    return {
      status: fromSource === 'success' && itemCount === 0 ? 'empty' : fromSource,
      error: sourceLike?.error,
      durationMs: sourceLike?.duration_ms,
    }
  }

  if (loadState === 'error') {
    return {
      status: 'error',
      error: sourceLike?.error || 'Category failed to load',
    }
  }

  // loaded
  if (val === undefined || val === null || itemCount === 0) {
    return { status: 'empty' }
  }
  return { status: 'success' }
}

export function buildRetrievalSnapshot(
  categoryData: Partial<Record<CategoryId, Record<string, unknown>>>,
  categoryStatus: Record<CategoryId, CategoryLoadState>,
  fetchedAt: Partial<Record<CategoryId, Date>>,
): RetrievalSnapshot {
  const keysByCat = knownPanelKeysByCategory()
  const categories: Record<CategoryId, CategoryRetrievalHealth> = {} as Record<
    CategoryId,
    CategoryRetrievalHealth
  >
  let totalApisCalled = 0
  let totalApisSucceeded = 0
  let totalApisErrored = 0
  let totalApisEmpty = 0
  let totalApisTimeout = 0
  let totalApisPending = 0
  let totalDurationMs = 0
  let slowestApi: string | null = null
  let slowestDuration = 0
  const gaps: RetrievalGap[] = []
  const anomalies: RetrievalAnomaly[] = []

  const allCategoryIds = Object.keys(keysByCat).filter((id) => id !== 'gene') as CategoryId[]

  for (const catId of allCategoryIds) {
    const loadState = categoryStatus[catId] || 'idle'
    const panelKeys = keysByCat[catId] || []
    const data = categoryData[catId] || {}
    const sourceMap = data._sourceStatus as Record<string, SourceStatusLike> | undefined
    const catDef = CATEGORIES.find((c) => c.id === catId)
    const panels: PanelRetrievalStatus[] = []
    let successCount = 0
    let emptyCount = 0
    let errorCount = 0
    let timeoutCount = 0
    let disabledCount = 0
    let pendingCount = 0
    let catDuration = 0

    for (const key of panelKeys) {
      const meta = PANEL_META.get(key)
      const panelId = meta?.panelId
      const title = meta?.title || key
      const val = data[key]
      const itemCount = countItems(val)
      const sourceLike = panelId ? sourceStatusForPanel(sourceMap, panelId) : undefined
      // Also try propKey / tracker key match
      const sourceLoose =
        sourceLike ||
        (sourceMap
          ? sourceStatusForPanel(sourceMap, key) ||
            sourceMap[key]
          : undefined)

      const resolved = resolvePanelStatus({
        loadState,
        val,
        itemCount,
        sourceLike: sourceLoose,
      })
      const status = resolved.status

      totalApisCalled++
      if (status === 'success') totalApisSucceeded++
      else if (status === 'error') totalApisErrored++
      else if (status === 'empty') totalApisEmpty++
      else if (status === 'timeout') totalApisTimeout++
      else if (status === 'pending' || status === 'fetching') totalApisPending++

      if (status === 'success') successCount++
      else if (status === 'empty') emptyCount++
      else if (status === 'error') errorCount++
      else if (status === 'timeout') timeoutCount++
      else if (status === 'disabled') disabledCount++
      else if (status === 'pending' || status === 'fetching') pendingCount++

      const dur = resolved.durationMs ?? sourceLoose?.duration_ms
      if (typeof dur === 'number') {
        catDuration += dur
        totalDurationMs += dur
        if (dur > slowestDuration) {
          slowestDuration = dur
          slowestApi = title
        }
      }

      // Gaps for everything that is not success/fetching
      if (
        status === 'empty' ||
        status === 'error' ||
        status === 'timeout' ||
        status === 'pending' ||
        status === 'disabled'
      ) {
        const gapReason: RetrievalGap['reason'] =
          status === 'pending' ? 'pending' : status
        const actionable =
          gapReason === 'error' ||
          gapReason === 'timeout' ||
          gapReason === 'pending' ||
          (gapReason === 'empty' && loadState === 'error')
        gaps.push({
          categoryId: catId,
          panelKey: key,
          panelId,
          title,
          reason: gapReason,
          detail:
            resolved.error ||
            (gapReason === 'empty'
              ? 'Source returned no rows for this molecule'
              : gapReason === 'pending'
                ? 'Category not loaded yet'
                : gapReason === 'timeout'
                  ? 'Upstream timed out'
                  : gapReason === 'disabled'
                    ? 'Source disabled'
                    : 'Fetch failed'),
          actionable,
        })
      }

      panels.push({
        panelKey: key,
        panelId,
        title,
        status,
        itemCount: status === 'success' || status === 'empty' ? itemCount : undefined,
        error: resolved.error || sourceLoose?.error,
        durationMs: dur,
      })
    }

    const terminal = successCount + emptyCount + errorCount + timeoutCount + disabledCount
    const completeness = terminal > 0 ? successCount / terminal : 0

    categories[catId] = {
      categoryId: catId,
      label: catDef?.label || catId,
      loadState,
      panels,
      totalPanels: panelKeys.length,
      successPanels: successCount,
      emptyPanels: emptyCount,
      errorPanels: errorCount,
      timeoutPanels: timeoutCount,
      disabledPanels: disabledCount,
      pendingPanels: pendingCount,
      totalDurationMs: catDuration,
      avgDurationMs: panelKeys.length > 0 ? catDuration / panelKeys.length : 0,
      completeness,
      fetchStartedAt: loadState === 'loading' || loadState === 'loaded' ? fetchedAt[catId] : undefined,
    }

    if (loadState === 'loaded' && successCount === 0 && emptyCount === panelKeys.length) {
      anomalies.push({
        type: 'unexpected_empty',
        severity: 'warning',
        panelKey: catId,
        message: `All ${panelKeys.length} panels in ${catDef?.label || catId} are empty — molecule may lack coverage in these sources`,
      })
    }
    if (loadState === 'loaded' && errorCount + timeoutCount >= Math.max(2, Math.floor(panelKeys.length / 2))) {
      anomalies.push({
        type: 'high_error_rate',
        severity: 'critical',
        panelKey: catId,
        message: `${errorCount + timeoutCount}/${panelKeys.length} panels failed or timed out in ${catDef?.label || catId} — try Retry category`,
      })
    }
  }

  if (slowestApi && slowestDuration > 5000) {
    anomalies.push({
      type: 'slow_fetch',
      severity: slowestDuration > 10000 ? 'critical' : 'warning',
      panelKey: slowestApi,
      message: `${slowestApi} took ${Math.round(slowestDuration / 1000)}s`,
    })
  }

  // Prefer actionable gaps first (errors/timeouts/pending), then empty
  gaps.sort((a, b) => {
    const rank = (r: RetrievalGap['reason']) =>
      ({ error: 0, timeout: 1, pending: 2, disabled: 3, empty: 4 }[r] ?? 9)
    return rank(a.reason) - rank(b.reason)
  })

  const terminalAll =
    totalApisSucceeded + totalApisEmpty + totalApisErrored + totalApisTimeout
  const overallCompleteness = terminalAll > 0 ? totalApisSucceeded / terminalAll : 0
  const loadedCats = allCategoryIds.filter((id) => categoryStatus[id] === 'loaded').length
  const categoryLoadRatio = allCategoryIds.length > 0 ? loadedCats / allCategoryIds.length : 0

  return {
    categories,
    overallCompleteness,
    categoryLoadRatio,
    totalApisCalled,
    totalApisSucceeded,
    totalApisErrored,
    totalApisEmpty,
    totalApisTimeout,
    totalApisPending,
    totalDurationMs,
    slowestApi,
    gaps,
    anomalies,
    timestamp: new Date().toISOString(),
  }
}

export function formatRetrievalSummary(snapshot: RetrievalSnapshot): string {
  const lines: string[] = []
  lines.push(`Data Retrieval Status:`)
  lines.push(
    `- ${snapshot.totalApisSucceeded}/${snapshot.totalApisCalled} sources with data (${Math.round(snapshot.overallCompleteness * 100)}% of terminal)`,
  )
  if (snapshot.totalApisEmpty > 0) {
    lines.push(`- ${snapshot.totalApisEmpty} empty (retrieved, no rows)`)
  }
  if (snapshot.totalApisTimeout > 0) {
    lines.push(`- ${snapshot.totalApisTimeout} timed out`)
  }
  if (snapshot.totalApisErrored > 0) {
    lines.push(`- ${snapshot.totalApisErrored} failed`)
  }
  if (snapshot.totalApisPending > 0) {
    lines.push(`- ${snapshot.totalApisPending} not loaded yet`)
  }
  if (snapshot.gaps.length > 0) {
    lines.push(`Gaps (actionable first):`)
    for (const gap of snapshot.gaps.slice(0, 20)) {
      lines.push(
        `- [${gap.categoryId}] ${gap.title}: ${gap.reason}${gap.detail ? ` — ${gap.detail}` : ''}`,
      )
    }
  }
  if (snapshot.anomalies.length > 0) {
    lines.push(`Anomalies:`)
    for (const a of snapshot.anomalies) {
      lines.push(`- [${a.severity}] ${a.message}`)
    }
  }
  return lines.join('\n')
}

/** Filter gaps for Monitor UI */
export function filterGaps(
  gaps: RetrievalGap[],
  filter: 'all' | 'empty' | 'failed' | 'pending' | 'actionable',
): RetrievalGap[] {
  if (filter === 'all') return gaps
  if (filter === 'empty') return gaps.filter((g) => g.reason === 'empty')
  if (filter === 'failed') {
    return gaps.filter((g) => g.reason === 'error' || g.reason === 'timeout')
  }
  if (filter === 'pending') return gaps.filter((g) => g.reason === 'pending')
  return gaps.filter((g) => g.actionable)
}
