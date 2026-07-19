/**
 * Allowlisted Copilot agent tools (evidence-bound, free public APIs only).
 * No Discover ranking tools. Deterministic executors; LLM only proposes calls.
 *
 * Phase A: retrieval / category / session
 * Phase B: open panel, fix gap, pack claims, seed RH, compare board
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
  | 'open_panel'
  | 'fix_gap'
  | 'get_pack_claims'
  | 'seed_research_hypothesis'
  | 'compare_board'

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
  {
    name: 'open_panel',
    description:
      'Scroll/focus a profile panel in the UI by panel id (e.g. clinical-trials, adverse-events). Use when the user asks to open or jump to a panel.',
    parameters: {
      panelId: 'string — panel id used in the profile UI',
      categoryId: 'optional string — parent category to load if idle',
    },
  },
  {
    name: 'fix_gap',
    description:
      'Act on a Monitor gap: retry on error/timeout, load on pending/idle. Prefer panelKey or categoryId from get_retrieval_snapshot.',
    parameters: {
      panelKey: 'optional string — panel propKey or title fragment',
      categoryId: 'optional string — category id when known',
    },
  },
  {
    name: 'get_pack_claims',
    description:
      'Summarize local board pack index claim ids and promote-set evidence tags for a project (no invented claims). Requires projectId.',
    parameters: { projectId: 'string — local project id' },
  },
  {
    name: 'seed_research_hypothesis',
    description:
      'Seed a draft research hypothesis from the latest pack on a project (claim-bound scaffold). Persists to local storage. Requires projectId; optional packId.',
    parameters: {
      projectId: 'string — local project id',
      packId: 'optional string — pack index id; defaults to most recent pack',
    },
  },
  {
    name: 'compare_board',
    description:
      'Compare board candidates on a project: statuses, scores, origins, CIDs. Read-only local project store.',
    parameters: { projectId: 'string — local project id' },
  },
]

export function isCopilotToolName(n: string): n is CopilotToolName {
  return COPILOT_TOOLS.some((t) => t.name === n)
}
