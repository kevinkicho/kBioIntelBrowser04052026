/** Research tool / playbook type surface. */
import type { CopilotToolName } from '@/lib/ai/copilot/tools/catalog'

export type ToolAudience = 'human' | 'agent' | 'both'
export type ToolChannel = 'ui' | 'cli' | 'copilot' | 'api' | 'export'
export type ResearchGoal =
  | 'discover'
  | 'evidence'
  | 'compare'
  | 'pack'
  | 'hypothesis'
  | 'export'
  | 'ops'

export interface ResearchToolEntry {
  id: string
  name: string
  channel: ToolChannel
  audience: ToolAudience
  goal: ResearchGoal
  summary: string
  /** When a researcher or agent should pick this tool */
  whenToUse: string
  /** Human path (UI clicks / exports) */
  howHuman?: string
  /** Agent path (CLI / HTTP / allowlisted copilot tools) */
  howAgent?: string
  /** What positive research outcome looks like */
  outcome: string
  href?: string
  cli?: string
  copilotTool?: CopilotToolName
  productLawNote?: string
}

export interface ResearchPlaybookStep {
  title: string
  human?: string
  agent?: string
  /** Research tool entry ids */
  tools: string[]
}

export interface ResearchPlaybook {
  id: string
  title: string
  audience: ToolAudience
  /** One-line scientific / engineering goal */
  goal: string
  steps: ResearchPlaybookStep[]
  successSignals: string[]
  lawReminders: string[]
}

const GOAL_LABELS: Record<ResearchGoal, string> = {
  discover: 'Discover shortlist',
  evidence: 'Evidence densify',
  compare: 'Compare candidates',
  pack: 'Board pack',
  hypothesis: 'Research hypothesis',
  export: 'Export / kit',
  ops: 'Ops / quality',
}

export function researchGoalLabel(g: ResearchGoal): string {
  return GOAL_LABELS[g]
}
