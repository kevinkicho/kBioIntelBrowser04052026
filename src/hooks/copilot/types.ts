import type { CategoryId } from '@/lib/categoryConfig'
import type { PromptMode } from '@/lib/ai/copilot/prompts'
import type { CopilotTaskPayload } from '@/lib/ai/copilot/validateTaskMode'

export interface CopilotTaskResult {
  /** Structured payload that survived validation; UI may render specially. */
  kind:
    | 'prior_art'
    | 'diff_safety'
    | 'suggest_next'
    | 'hypothesis_seed'
    | 'safety_memo'
    | 'next_actions'
  data: CopilotTaskPayload
}

export interface CopilotToolTrace {
  name: string
  ok: boolean
  summary: string
  categoryId?: string
}

export interface CopilotMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  mode: PromptMode
  timestamp: number
  error?: string
  /** Validation failure message for task modes (shown in lieu of raw content). */
  validationError?: string
  /** Structured payload for task modes when validation succeeds. */
  task?: CopilotTaskResult['data']
  /** Tool steps taken during agentic Ask (evidence-bound). */
  tools?: CopilotToolTrace[]
}

export interface CopilotActions {
  refreshCategory?: (categoryId: CategoryId) => void
  loadCategory?: (categoryId: CategoryId) => void
  /** Scroll/focus a profile panel (agent tool open_panel). */
  openPanel?: (panelId: string, categoryId?: CategoryId) => void
  /** Default project for pack/board tools when URL has ?project=. */
  defaultProjectId?: string
}

export interface CopilotState {
  messages: CopilotMessage[]
  isStreaming: boolean
  activeTab: 'monitor' | 'insights' | 'ask' | 'settings'
  autoInsightGenerated: boolean
}

export interface GenerateInsightOptions {
  /** For `differential_safety`: the previously-viewed molecule's name to diff against. */
  diffTargetName?: string
  /** For `hypothesis_seed`: the user's free-form research question. */
  researchQuestion?: string
}
