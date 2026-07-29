/**
 * Allowlisted copilot tool dispatcher.
 * Handlers live in handlers.ts (retrieval / category / session / pack-board).
 */

import type { ToolCall } from './parse'
import type { CopilotToolContext, ToolResult } from './types'
import {
  toolCompareBoard,
  toolFixGap,
  toolGetPackClaims,
  toolGetPanelSummary,
  toolGetRetrievalSnapshot,
  toolListLoadedCategories,
  toolListSessionMolecules,
  toolLoadCategory,
  toolOpenPanel,
  toolRetryCategory,
  toolSeedResearchHypothesis,
  toolSuggestNextActions,
} from './handlers'

export type { CopilotToolContext, ToolResult } from './types'

export function executeCopilotTool(call: ToolCall, ctx: CopilotToolContext): ToolResult {
  const { name, args } = call
  try {
    switch (name) {
      case 'get_retrieval_snapshot':
        return toolGetRetrievalSnapshot(name, ctx)
      case 'list_loaded_categories':
        return toolListLoadedCategories(name, ctx)
      case 'get_panel_summary':
        return toolGetPanelSummary(name, args, ctx)
      case 'retry_category':
        return toolRetryCategory(name, args, ctx)
      case 'load_category':
        return toolLoadCategory(name, args, ctx)
      case 'list_session_molecules':
        return toolListSessionMolecules(name)
      case 'suggest_next_actions':
        return toolSuggestNextActions(name, ctx)
      case 'open_panel':
        return toolOpenPanel(name, args, ctx)
      case 'fix_gap':
        return toolFixGap(name, args, ctx)
      case 'get_pack_claims':
        return toolGetPackClaims(name, args, ctx)
      case 'seed_research_hypothesis':
        return toolSeedResearchHypothesis(name, args, ctx)
      case 'compare_board':
        return toolCompareBoard(name, args, ctx)
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
