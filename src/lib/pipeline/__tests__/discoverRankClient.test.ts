/**
 * Discover rank client pipeline — mock network + cache.
 */

import {
  clearCachedDiscoverRank,
  discoverRankCacheKey,
  setCachedDiscoverRank,
} from '@/lib/searchHistory'
import { runDiscoverRankPipeline } from '@/lib/pipeline'
import type { RankResult } from '@/lib/candidateRanker'

jest.mock('@/lib/clientFetch', () => ({
  clientFetch: jest.fn(),
}))

import { clientFetch } from '@/lib/clientFetch'

const mockFetch = clientFetch as jest.MockedFunction<typeof clientFetch>

function fakeRank(partial?: Partial<RankResult>): RankResult {
  return {
    query: 'test',
    diseaseId: 'MONDO_1',
    diseaseName: 'Test disease',
    therapeuticAreas: [],
    genes: [],
    candidates: [
      {
        name: 'DrugA',
        cid: 1,
        clinicalPhase: 0,
        geneAssociationScore: 0,
        sharedTargetRatio: 0,
        trialCountNorm: 0,
        clinicalPhaseRaw: 0,
        sharedTargetCountRaw: 0,
        trialCountRaw: 0,
        geneScoreRaw: 0,
        sources: ['Open Targets'],
        confidence: 'preliminary',
        compositeScore: 0.5,
      },
    ],
    ...partial,
  }
}

describe('runDiscoverRankPipeline', () => {
  const cacheKey = discoverRankCacheKey({ q: 'type 2 diabetes', diseaseId: null, targets: [] })

  beforeEach(() => {
    mockFetch.mockReset()
    try {
      clearCachedDiscoverRank(cacheKey)
    } catch {
      /* ignore */
    }
  })

  it('returns cached rank without network', async () => {
    setCachedDiscoverRank(cacheKey, fakeRank())
    const out = await runDiscoverRankPipeline({
      cacheKey,
      body: { q: 'type 2 diabetes' },
    })
    expect(out.fromCache).toBe(true)
    expect(out.result.candidates).toHaveLength(1)
    expect(mockFetch).not.toHaveBeenCalled()
    expect(out.pipeline.stages.some((s) => s.id === 'cache_lookup' && s.status === 'ok')).toBe(
      true,
    )
  })

  it('fetches network when cache miss and validates', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => fakeRank({ diseaseName: 'Live' }),
    } as Response)

    const out = await runDiscoverRankPipeline({
      cacheKey: discoverRankCacheKey({ q: 'unique-q-xyz', diseaseId: null, targets: [] }),
      body: { q: 'unique-q-xyz' },
    })
    expect(out.fromCache).toBe(false)
    expect(out.result.diseaseName).toBe('Live')
    expect(mockFetch).toHaveBeenCalled()
    expect(out.pipeline.ok).toBe(true)
    expect(out.pipeline.stages.map((s) => s.id)).toEqual(
      expect.arrayContaining(['cache_lookup', 'network_rank', 'validate', 'cache_store']),
    )
  })

  it('fails validation on bad payload', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ not: 'valid' }),
    } as Response)

    await expect(
      runDiscoverRankPipeline({
        cacheKey: discoverRankCacheKey({ q: 'bad-payload', diseaseId: null, targets: [] }),
        body: { q: 'bad-payload' },
        forceRefresh: true,
      }),
    ).rejects.toThrow(/Invalid rank|candidates/i)
  })
})
