/**
 * Allowlisted Copilot agent tools (evidence-bound, free public APIs only).
 * No Discover ranking tools. Deterministic executors; LLM only proposes calls.
 */

import type { CategoryId } from '@/lib/categoryConfig'
import { CATEGORIES, MOLECULE_CATEGORY_IDS } from '@/lib/categoryConfig'
import type { CategoryLoadState } from '@/lib/fetchCategory'
import {
  formatRetrievalSummary,
  humanPanelTitle,
  type RetrievalSnapshot,
} from '@/lib/ai/retrievalMonitor'
import { sessionHistory } from '@/lib/sessionHistory'

export const COPILOT_MAX_TOOL_STEPS = 5

export type CopilotToolName =
  | 'get_retrieval_snapshot'
  | 'get_panel_summary'
  | 'list_loaded_categories'
  | 'retry_category'
  | 'load_category'
  | 'list_session_molecules'
  | 'suggest_next_actions'

export interface CopilotToolDef {
  name: CopilotToolName
  description: string
  parameters: Record<string, string>
}

export const COPILOT_TOOLS: CopilotToolDef[] = [
  {
    name: 'get_retrieval_snapshot',
    description:
      'Get data completeness: with-data / empty / timeout / error / pending counts and top gaps. Call this first when the user asks about missing data or coverage.',
    parameters: {},
  },
  {
    name: 'get_panel_summary',
    description:
      'Summarize one loaded panel by propKey (e.g. clinicalTrials, adverseEvents, chemblActivities). Returns counts and sample rows — does not invent data.',
    parameters: { panelKey: 'string — DTO prop key or panel id' },
  },
  {
    name: 'list_loaded_categories',
    description: 'List molecule profile categories and their load state (idle|loading|loaded|error).',
    parameters: {},
  },
  {
    name: 'retry_category',
    description:
      'Re-fetch a category that failed or timed out (e.g. clinical-safety). Use for actionable gaps only.',
    parameters: { categoryId: 'string — category id' },
  },
  {
    name: 'load_category',
    description: 'Load a category that is still idle/pending so its panels can populate.',
    parameters: { categoryId: 'string — category id' },
  },
  {
    name: 'list_session_molecules',
    description: 'List recently viewed molecules in this browser session (for compare questions).',
    parameters: {},
  },
  {
    name: 'suggest_next_actions',
    description:
      'Deterministic next actions from the retrieval snapshot (retry failed, load idle Core categories). No LLM.',
    parameters: {},
  },
]

export interface CopilotToolContext {
  snapshot: RetrievalSnapshot
  categoryData: Partial<Record<CategoryId, Record<string, unknown>>>
  categoryStatus: Record<CategoryId, CategoryLoadState>
  identity: { name: string; cid: number; geneSymbol?: string }
  /** Soft-refresh category (force re-fetch). */
  refreshCategory?: (categoryId: CategoryId) => void
  /** Initial load for idle categories. */
  loadCategory?: (categoryId: CategoryId) => void
}

export interface ToolCall {
  name: CopilotToolName
  args: Record<string, unknown>
}

export interface ToolResult {
  name: CopilotToolName
  ok: boolean
  summary: string
  data?: unknown
  /** Side-effect requested (UI should have executed via context) */
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

export function executeCopilotTool(
  call: ToolCall,
  ctx: CopilotToolContext,
): ToolResult {
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
        // Find propKey in any category data
        let found: { cat: CategoryId; key: string; val: unknown } | null = null
        for (const catId of MOLECULE_CATEGORY_IDS) {
          const data = ctx.categoryData[catId]
          if (!data) continue
          if (raw in data) {
            found = { cat: catId, key: raw, val: data[raw] }
            break
          }
          // panel id match via category config
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
        // Core first
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

/**
 * Parse a single tool call from model output.
 * Formats supported:
 *   TOOL: name
 *   ARG key=value
 * or fenced:
 *   ```tool
 *   {"name":"...","args":{...}}
 *   ```
 */
export function parseToolCall(text: string): ToolCall | null {
  if (!text?.trim()) return null

  // JSON tool block
  const fence = text.match(/```(?:tool|json)?\s*([\s\S]*?)```/i)
  if (fence) {
    try {
      const parsed = JSON.parse(fence[1].trim()) as { name?: string; args?: Record<string, unknown> }
      if (parsed.name && isToolName(parsed.name)) {
        return { name: parsed.name, args: parsed.args || {} }
      }
    } catch {
      /* fall through */
    }
  }

  // Inline JSON object
  const inline = text.match(
    /\{\s*"name"\s*:\s*"([a-z_]+)"\s*,\s*"args"\s*:\s*(\{[\s\S]*?\})\s*\}/,
  )
  if (inline && isToolName(inline[1])) {
    try {
      return { name: inline[1], args: JSON.parse(inline[2]) as Record<string, unknown> }
    } catch {
      /* fall through */
    }
  }

  // TOOL: name / ARG lines
  const toolLine = text.match(/^\s*TOOL:\s*([a-z_]+)\s*$/im)
  if (toolLine && isToolName(toolLine[1])) {
    const args: Record<string, unknown> = {}
    const argRe = /^\s*ARG\s+([a-zA-Z0-9_]+)\s*=\s*(.+)\s*$/gim
    let m: RegExpExecArray | null
    while ((m = argRe.exec(text)) !== null) {
      args[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
    return { name: toolLine[1], args }
  }

  return null
}

function isToolName(n: string): n is CopilotToolName {
  return COPILOT_TOOLS.some((t) => t.name === n)
}

/** System addendum teaching the model the tool protocol. */
export function buildAgentToolSystemAddendum(): string {
  const catalog = COPILOT_TOOLS.map(
    (t) =>
      `- ${t.name}: ${t.description}${
        Object.keys(t.parameters).length
          ? ` Params: ${Object.entries(t.parameters)
              .map(([k, v]) => `${k} (${v})`)
              .join(', ')}`
          : ''
      }`,
  ).join('\n')

  return `
AGENT TOOLS (optional, evidence-bound only):
You may request ONE tool per assistant turn when you need fresh facts about retrieval state or panel contents.
To call a tool, output ONLY a fenced block and nothing else:

\`\`\`tool
{"name":"get_retrieval_snapshot","args":{}}
\`\`\`

Available tools:
${catalog}

Rules:
1. Prefer tools for "what's missing / empty / failed" questions before free-form guessing.
2. Never invent clinical trials, AE counts, or mechanisms not present in tool results or molecule context.
3. After tool results are provided, answer the user with citations [panel-key].
4. Do NOT request tools for Discover ranking or regulatory conclusions.
5. Max ${COPILOT_MAX_TOOL_STEPS} tool steps per user question — then answer with what you have.
`.trim()
}

export function formatToolObservation(result: ToolResult): string {
  return [
    `[TOOL RESULT: ${result.name}] ${result.ok ? 'OK' : 'FAILED'}`,
    result.summary,
    result.data != null
      ? `JSON: ${JSON.stringify(result.data).slice(0, 2500)}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
}
