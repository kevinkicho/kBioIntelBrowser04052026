import {
  buildAgentToolSystemAddendum,
  executeCopilotTool,
  parseToolCall,
  formatToolObservation,
} from '@/lib/ai/copilot/tools'
import { buildRetrievalSnapshot } from '@/lib/ai/retrievalMonitor'
import type { CategoryId } from '@/lib/categoryConfig'
import type { CategoryLoadState } from '@/lib/fetchCategory'

describe('copilotTools', () => {
  const categoryStatus = {
    'clinical-safety': 'loaded',
  } as Record<CategoryId, CategoryLoadState>
  const categoryData = {
    'clinical-safety': {
      clinicalTrials: [
        { nctId: 'NCT123', title: 'Study A', status: 'COMPLETED', phase: 'PHASE3' },
      ],
      adverseEvents: [],
    },
  } as Partial<Record<CategoryId, Record<string, unknown>>>
  const snapshot = buildRetrievalSnapshot(categoryData, categoryStatus, {})

  const baseCtx = {
    snapshot,
    categoryData,
    categoryStatus,
    identity: { name: 'Aspirin', cid: 2244 },
  }

  it('parseToolCall reads fenced JSON tool block', () => {
    const text = '```tool\n{"name":"get_retrieval_snapshot","args":{}}\n```'
    expect(parseToolCall(text)).toEqual({
      name: 'get_retrieval_snapshot',
      args: {},
    })
  })

  it('parseToolCall reads TOOL:/ARG lines', () => {
    const text = 'TOOL: load_category\nARG categoryId=clinical-safety\n'
    expect(parseToolCall(text)).toEqual({
      name: 'load_category',
      args: { categoryId: 'clinical-safety' },
    })
  })

  it('execute get_retrieval_snapshot returns gap summary', () => {
    const r = executeCopilotTool({ name: 'get_retrieval_snapshot', args: {} }, baseCtx)
    expect(r.ok).toBe(true)
    expect(r.summary).toMatch(/Data Retrieval|empty|sources/i)
  })

  it('execute get_panel_summary samples clinicalTrials', () => {
    const r = executeCopilotTool(
      { name: 'get_panel_summary', args: { panelKey: 'clinicalTrials' } },
      baseCtx,
    )
    expect(r.ok).toBe(true)
    expect(r.summary).toMatch(/NCT123|1 item/i)
  })

  it('retry_category invokes callback', () => {
    const refreshCategory = jest.fn()
    const r = executeCopilotTool(
      { name: 'retry_category', args: { categoryId: 'clinical-safety' } },
      { ...baseCtx, refreshCategory },
    )
    expect(r.ok).toBe(true)
    expect(refreshCategory).toHaveBeenCalledWith('clinical-safety')
  })

  it('formatToolObservation includes tool name', () => {
    const r = executeCopilotTool({ name: 'list_loaded_categories', args: {} }, baseCtx)
    expect(formatToolObservation(r)).toContain('list_loaded_categories')
  })

  it('buildAgentToolSystemAddendum lists tools', () => {
    const s = buildAgentToolSystemAddendum()
    expect(s).toContain('get_retrieval_snapshot')
    expect(s).toContain('retry_category')
  })
})
