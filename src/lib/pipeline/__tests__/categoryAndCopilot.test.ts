import {
  categorySchedulerSnapshot,
  MAX_CATEGORY_NETWORK,
  resetCategorySchedulerForTests,
  scheduleStaggeredLoads,
  withCategorySlot,
  runCopilotToolPipeline,
} from '@/lib/pipeline'
import type { CopilotToolContext } from '@/lib/ai/copilot/tools/execute'

describe('categoryFetchScheduler', () => {
  beforeEach(() => resetCategorySchedulerForTests())
  afterEach(() => resetCategorySchedulerForTests())

  it('limits concurrent category slots', async () => {
    await withCategorySlot(async () => {
      expect(categorySchedulerSnapshot().inFlight).toBe(1)
    })
    expect(categorySchedulerSnapshot().inFlight).toBe(0)
    expect(MAX_CATEGORY_NETWORK).toBe(3)
  })

  it('scheduleStaggeredLoads fires with delay and cancel', () => {
    jest.useFakeTimers()
    const seen: string[] = []
    const cancel = scheduleStaggeredLoads(['a', 'b', 'c'], (id) => seen.push(id), {
      delayMs: 100,
    })
    jest.advanceTimersByTime(50)
    expect(seen).toEqual(['a'])
    cancel()
    jest.advanceTimersByTime(500)
    expect(seen).toEqual(['a'])
    jest.useRealTimers()
  })
})

describe('runCopilotToolPipeline', () => {
  it('returns ok:false for unknown tool without hanging', async () => {
    const ctx = {
      snapshot: {} as CopilotToolContext['snapshot'],
      categoryData: {},
      categoryStatus: {} as CopilotToolContext['categoryStatus'],
      identity: { name: 'Aspirin', cid: 2244 },
    } as CopilotToolContext
    const out = await runCopilotToolPipeline(
      { name: 'not_a_real_tool' as 'get_retrieval_snapshot', args: {} },
      ctx,
      { timeoutMs: 2000 },
    )
    // Unknown tools fail closed; pipeline still completes
    expect(out.result.ok).toBe(false)
    expect(out.pipeline.stages.some((s) => s.id === 'execute_tool')).toBe(true)
  })
})
