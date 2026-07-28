import { runDiscoverHarvestPipeline } from '@/lib/pipeline'
import { createDefaultScoreRubric, createEmptyScoreVector } from '@/lib/domain/score'

jest.mock('@/lib/clientFetch', () => ({
  clientFetch: jest.fn(),
}))

import { clientFetch } from '@/lib/clientFetch'

const mockFetch = clientFetch as jest.MockedFunction<typeof clientFetch>

describe('runDiscoverHarvestPipeline', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('skips network when no candidates', async () => {
    const out = await runDiscoverHarvestPipeline({
      candidates: [],
      rubric: createDefaultScoreRubric('balanced'),
    })
    expect(out.candidates).toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
    expect(out.pipeline.stages.some((s) => s.status === 'skipped')).toBe(true)
  })

  it('validates harvest rows from network', async () => {
    const scores = createEmptyScoreVector('full')
    scores.axes.safety = 0.5
    scores.axes.novelty = 0.4
    scores.scorePhase = 'full'
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ name: 'DrugA', scores }],
      }),
    } as Response)

    const out = await runDiscoverHarvestPipeline({
      candidates: [{ name: 'DrugA' }],
      rubric: createDefaultScoreRubric('balanced'),
    })
    expect(out.candidates).toHaveLength(1)
    expect(out.candidates[0]!.scores.axes.safety).toBe(0.5)
    expect(out.pipeline.ok).toBe(true)
  })
})
