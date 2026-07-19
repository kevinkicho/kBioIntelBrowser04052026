/**
 * Allowlisted Copilot agent tools (evidence-bound, free public APIs only).
 * No Discover ranking tools. Deterministic executors; LLM only proposes calls.
 */

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

export function isCopilotToolName(n: string): n is CopilotToolName {
  return COPILOT_TOOLS.some((t) => t.name === n)
}
