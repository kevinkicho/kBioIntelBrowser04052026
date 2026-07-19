/**
 * Shared Copilot message / action types (hooks + UI).
 */

import type { CategoryId } from '@/lib/categoryConfig'
import type { PromptMode } from '@/lib/ai/promptTemplates'
import type { Filter } from '@/lib/hypothesis/types'
import type { SuggestedEntity } from '@/lib/ai/aiTasks/suggestNext'

export type { PromptMode }

export interface CopilotTaskResult {
  kind: 'prior_art' | 'diff_safety' | 'suggest_next' | 'hypothesis_seed'
  data:
    | { kind: 'prior_art'; query: string }
    | {
        kind: 'diff_safety'
        text: string
        paragraphCount: number
        currentName: string
        otherName: string
      }
    | { kind: 'suggest_next'; entities: SuggestedEntity[] }
    | { kind: 'hypothesis_seed'; filters: Filter[]; url: string }
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
  validationError?: string
  task?: CopilotTaskResult['data']
  tools?: CopilotToolTrace[]
}

export interface CopilotActions {
  refreshCategory?: (categoryId: CategoryId) => void
  loadCategory?: (categoryId: CategoryId) => void
}

export interface CopilotState {
  messages: CopilotMessage[]
  isStreaming: boolean
  activeTab: 'monitor' | 'insights' | 'ask' | 'settings'
  autoInsightGenerated: boolean
}

export interface GenerateInsightOptions {
  diffTargetName?: string
  researchQuestion?: string
}

export interface CopilotIdentity {
  name: string
  cid: number
  molecularWeight?: number
  inchiKey?: string
  iupacName?: string
  geneSymbol?: string
}
