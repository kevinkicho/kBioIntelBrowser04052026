import type { CategoryId } from '@/lib/categoryConfig'
import { CATEGORIES, MOLECULE_CATEGORY_IDS } from '@/lib/categoryConfig'
import type { CategoryLoadState } from '@/lib/fetchCategory'
import {
  formatRetrievalSummary,
  humanPanelTitle,
  type RetrievalSnapshot,
} from '@/lib/ai/retrievalMonitor'
import { sessionHistory } from '@/lib/sessionHistory'
import type { CopilotToolName } from './catalog'
import type { ToolCall } from './parse'

export interface CopilotToolContext {
  snapshot: RetrievalSnapshot
  categoryData: Partial<Record<CategoryId, Record<string, unknown>>>
  categoryStatus: Record<CategoryId, CategoryLoadState>
  identity: { name: string; cid: number; geneSymbol?: string }
  refreshCategory?: (categoryId: CategoryId) => void
  loadCategory?: (categoryId: CategoryId) => void
}

export interface ToolResult {
  name: CopilotToolName
  ok: boolean
  summary: string
  data?: unknown
  sideEffect?: 'retry_category' | 'load_category'
  categoryId?: CategoryId
}

function isCategoryId(id: string): id is CategoryId {
  return (MOLECULE_CATEGORY_IDS as string[]).includes(id)
}

function sampleArray(val: unknown, n = 5): unknown[] {
  if (!Array.isArray(val)) return []
  return val.slice(0, n).map((row) => {
    if (!row || typeof row !== 'object') return row
    const o = row as Record<string, unknown>
    const pick: Record<string, unknown> = {}
    let i = 0
    for (const [k, v] of Object.entries(o)) {
      if (k.startsWith('_')) continue
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) continue
      pick[k] = typeof v === 'string' ? v.slice(0, 120) : v
      if (++i >= 8) break
    }
    return pick
  })
}

export function executeCopilotTool(call: ToolCall, ctx: CopilotToolContext): ToolResult {
  const { name, args } = call
  try {
    switch (name) {
      case 'get_retrieval_snapshot': {
        const s = ctx.snapshot
        return {
          name,
          ok: true,
          summary: formatRetrievalSummary(s),
          data: {
            overallCompleteness: s.overallCompleteness,
            categoryLoadRatio: s.categoryLoadRatio,
            withData: s.totalApisSucceeded,
            empty: s.totalApisEmpty,
            timeout: s.totalApisTimeout,
            error: s.totalApisErrored,
            pending: s.totalApisPending,
            gaps: s.gaps.slice(0, 25).map((g) => ({
              title: g.title,
              categoryId: g.categoryId,
              reason: g.reason,
              actionable: g.actionable,
              detail: g.detail,
            })),
          },
        }
      }
      case 'list_loaded_categories': {
        const rows = MOLECULE_CATEGORY_IDS.map((id) => ({
          categoryId: id,
          label: CATEGORIES.find((c) => c.id === id)?.label || id,
          status: ctx.categoryStatus[id] || 'idle',
          completeness: ctx.snapshot.categories[id]?.completeness ?? 0,
          success: ctx.snapshot.categories[id]?.successPanels ?? 0,
          empty: ctx.snapshot.categories[id]?.emptyPanels ?? 0,
          failed:
            (ctx.snapshot.categories[id]?.errorPanels ?? 0) +
            (ctx.snapshot.categories[id]?.timeoutPanels ?? 0),
        }))
        return {
          name,
          ok: true,
          summary: rows
            .map(
              (r) =>
                `${r.label}: ${r.status} (data ${r.success}, empty ${r.empty}, fail ${r.failed})`,
            )
            .join('\n'),
          data: rows,
        }
      }
      case 'get_panel_summary': {
        const raw = String(args.panelKey || args.panel || '').trim()
        if (!raw) {
          return { name, ok: false, summary: 'Missing panelKey argument' }
        }
        let found: { cat: CategoryId; key: string; val: unknown } | null = null
        for (const catId of MOLECULE_CATEGORY_IDS) {
          const data = ctx.categoryData[catId]
          if (!data) continue
          if (raw in data) {
            found = { cat: catId, key: raw, val: data[raw] }
            break
          }
          const cat = CATEGORIES.find((c) => c.id === catId)
          const panel = cat?.panels.find((p) => p.id === raw || p.propKey === raw)
          if (panel && panel.propKey in data) {
            found = { cat: catId, key: panel.propKey, val: data[panel.propKey] }
            break
          }
        }
        if (!found) {
          return {
            name,
            ok: false,
            summary: `Panel "${raw}" not found in loaded category data. Load the parent category first.`,
          }
        }
        const count = Array.isArray(found.val)
          ? found.val.length
          : found.val == null
            ? 0
            : 1
        const samples = sampleArray(found.val, 5)
        const title = humanPanelTitle(found.key)
        return {
          name,
          ok: true,
          summary: `${title} (${found.key}) in ${found.cat}: ${count} item(s). Sample: ${JSON.stringify(samples).slice(0, 1200)}`,
          data: { categoryId: found.cat, panelKey: found.key, title, count, samples },
        }
      }
      case 'retry_category': {
        const id = String(args.categoryId || '').trim()
        if (!isCategoryId(id)) {
          return {
            name,
            ok: false,
            summary: `Invalid categoryId "${id}". Use one of: ${MOLECULE_CATEGORY_IDS.join(', ')}`,
          }
        }
        if (!ctx.refreshCategory) {
          return {
            name,
            ok: false,
            summary: 'retry_category is not available in this view (no profile refresh hook).',
          }
        }
        ctx.refreshCategory(id)
        return {
          name,
          ok: true,
          summary: `Requested soft re-fetch of category "${id}". Panels will update when the request completes.`,
          sideEffect: 'retry_category',
          categoryId: id,
        }
      }
      case 'load_category': {
        const id = String(args.categoryId || '').trim()
        if (!isCategoryId(id)) {
          return {
            name,
            ok: false,
            summary: `Invalid categoryId "${id}". Use one of: ${MOLECULE_CATEGORY_IDS.join(', ')}`,
          }
        }
        if (!ctx.loadCategory) {
          return {
            name,
            ok: false,
            summary: 'load_category is not available in this view.',
          }
        }
        ctx.loadCategory(id)
        return {
          name,
          ok: true,
          summary: `Requested load of category "${id}" (if idle).`,
          sideEffect: 'load_category',
          categoryId: id,
        }
      }
      case 'list_session_molecules': {
        const recent = sessionHistory.getRecentMolecules(8).map((m) => ({
          name: m.name,
          searchedAt: m.searchedAt,
        }))
        return {
          name,
          ok: true,
          summary:
            recent.length === 0
              ? 'No recent molecules in session history.'
              : recent.map((m) => `${m.name} (${m.searchedAt})`).join('; '),
          data: recent,
        }
      }
      case 'suggest_next_actions': {
        const actions: string[] = []
        const failedCats = new Set<CategoryId>()
        for (const g of ctx.snapshot.gaps) {
          if (g.reason === 'error' || g.reason === 'timeout') failedCats.add(g.categoryId)
        }
        failedCats.forEach((id) => {
          actions.push(`retry_category:${id}`)
        })
        for (const id of MOLECULE_CATEGORY_IDS) {
          if ((ctx.categoryStatus[id] || 'idle') === 'idle') {
            actions.push(`load_category:${id}`)
          }
        }
        const coreOrder = ['clinical-safety', 'bioactivity-targets', 'pharmaceutical']
        actions.sort((a, b) => {
          const ca = coreOrder.findIndex((c) => a.includes(c))
          const cb = coreOrder.findIndex((c) => b.includes(c))
          return (ca === -1 ? 99 : ca) - (cb === -1 ? 99 : cb)
        })
        const uniq = Array.from(new Set(actions)).slice(0, 8)
        return {
          name,
          ok: true,
          summary:
            uniq.length === 0
              ? 'No pending loads or failed categories — explore Insights or Ask a science question.'
              : `Suggested: ${uniq.join('; ')}`,
          data: uniq,
        }
      }
      default:
        return { name, ok: false, summary: `Unknown tool: ${name}` }
    }
  } catch (err) {
    return {
      name,
      ok: false,
      summary: err instanceof Error ? err.message : String(err),
    }
  }
}

export function formatToolObservation(result: ToolResult): string {
  return [
    `[TOOL RESULT: ${result.name}] ${result.ok ? 'OK' : 'FAILED'}`,
    result.summary,
    result.data != null ? `JSON: ${JSON.stringify(result.data).slice(0, 2500)}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
