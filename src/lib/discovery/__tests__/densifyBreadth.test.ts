/**
 * Multi-source densify breadth — pure helpers + skip path.
 */

import { mergeLitHitProxy } from '@/lib/discovery/densifyBreadth'
import { densifyShortlist, DENSIFY_K_DEFAULT } from '@/lib/discovery/densify'
import { createDefaultScoreRubric, createEmptyScoreVector } from '@/lib/domain/score'
import type { CandidateMolecule } from '@/lib/discovery/types'
import { sourcesForSurface, utilizationSummary } from '@/lib/api/sourceUtilization'

function cand(name: string, composite = 0.5): CandidateMolecule {
  return {
    name,
    cid: null,
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
    compositeScore: composite,
  }
}

describe('mergeLitHitProxy', () => {
  it('takes max of prior and breadth proxy', () => {
    expect(mergeLitHitProxy(10, 100)).toBe(100)
    expect(mergeLitHitProxy(50, 10)).toBe(50)
    expect(mergeLitHitProxy(0, 0)).toBe(0)
  })
})

describe('densifyShortlist skipBreadth', () => {
  it('returns empty breadth map when skipBreadth', async () => {
    const scoreByName = new Map([
      ['drug-a', createEmptyScoreVector()],
    ])
    // Mock harvest via skip path for empty candidates already covered;
    // here skip entire densify
    const skipped = await densifyShortlist({
      candidates: [cand('Drug-A')],
      scoreByName,
      rubric: createDefaultScoreRubric(),
      skip: true,
    })
    expect(skipped.skipped).toBe(true)
    expect(skipped.breadthByName.size).toBe(0)
    expect(skipped.densifiedCount).toBe(0)
  })

  it('DENSIFY_K_DEFAULT stays shortlist-bounded', () => {
    expect(DENSIFY_K_DEFAULT).toBeGreaterThanOrEqual(5)
    expect(DENSIFY_K_DEFAULT).toBeLessThanOrEqual(15)
  })
})

describe('sourceUtilization', () => {
  it('lists multi-source densify APIs', () => {
    const densify = sourcesForSurface('discover-densify')
    const keys = densify.map((d) => d.key)
    expect(keys).toEqual(
      expect.arrayContaining([
        'openfda-faers',
        'europepmc',
        'openalex',
        'patents',
        'bindingdb',
        'semantic-scholar',
        'nih-reporter',
      ]),
    )
    const summary = utilizationSummary()
    expect(summary.wiredCurated).toBeGreaterThanOrEqual(30)
    expect(summary.bySurface['discover-densify']).toBeGreaterThanOrEqual(7)
    expect(summary.bySurface['profile-hub']).toBeGreaterThan(
      summary.bySurface['discover-gather'],
    )
  })
})
