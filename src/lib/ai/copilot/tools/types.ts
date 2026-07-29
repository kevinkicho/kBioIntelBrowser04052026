import type { CategoryId } from '@/lib/categoryConfig'
import type { CategoryLoadState } from '@/lib/fetchCategory'
import type { RetrievalSnapshot } from '@/lib/ai/copilot/retrieval'
import type { CopilotToolName } from './catalog'

export interface CopilotToolContext {
  snapshot: RetrievalSnapshot
  categoryData: Partial<Record<CategoryId, Record<string, unknown>>>
  categoryStatus: Record<CategoryId, CategoryLoadState>
  identity: { name: string; cid: number; geneSymbol?: string }
  refreshCategory?: (categoryId: CategoryId) => void
  loadCategory?: (categoryId: CategoryId) => void
  /** Scroll/focus a profile panel (Phase B). */
  openPanel?: (panelId: string, categoryId?: CategoryId) => void
  /** Default project when tool args omit projectId (e.g. profile ?project=). */
  defaultProjectId?: string
}

export interface ToolResult {
  name: CopilotToolName
  ok: boolean
  summary: string
  data?: unknown
  sideEffect?: 'retry_category' | 'load_category' | 'open_panel' | 'seed_rh'
  categoryId?: CategoryId
  panelId?: string
}
