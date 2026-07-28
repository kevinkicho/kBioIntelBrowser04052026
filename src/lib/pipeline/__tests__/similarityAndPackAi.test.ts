import {
  runRankSimilarityExpandPipeline,
  runPackAiValidatePipeline,
  claimAllowlistFromPack,
} from '@/lib/pipeline'
import type { CandidateMolecule } from '@/lib/discovery/types'

jest.mock('@/lib/api/pubchem-similar', () => ({
  getSimilarMolecules: jest.fn(async () => [
    { cid: 100, name: 'AnalogA', similarity: 0.9 },
    { cid: 101, name: 'AnalogB', similarity: 0.85 },
  ]),
}))

function seed(): CandidateMolecule {
  return {
    name: 'Seed',
    cid: 2244,
    clinicalPhase: 0.5,
    geneAssociationScore: 0.3,
    sharedTargetRatio: 0.2,
    trialCountNorm: 0,
    clinicalPhaseRaw: 2,
    sharedTargetCountRaw: 1,
    trialCountRaw: 0,
    geneScoreRaw: 0,
    sources: ['Open Targets'],
    confidence: 'preliminary',
    compositeScore: 0.6,
  }
}

describe('runRankSimilarityExpandPipeline', () => {
  it('adds neighbors without failing pipeline', async () => {
    const out = await runRankSimilarityExpandPipeline({
      shortlist: [seed()],
      seedMax: 1,
      neighborsPerSeed: 2,
      timeoutMs: 5_000,
    })
    expect(out.pipeline.ok).toBe(true)
    expect(out.added).toBeGreaterThanOrEqual(1)
    expect(out.candidates.every((c) => c.sources.some((s) => /similar/i.test(s)))).toBe(
      true,
    )
  })

  it('survives empty shortlist', async () => {
    const out = await runRankSimilarityExpandPipeline({ shortlist: [] })
    expect(out.added).toBe(0)
    expect(out.pipeline.ok).toBe(true)
  })
})

describe('runPackAiValidatePipeline', () => {
  it('builds allowlist and strips orphan claim ids', async () => {
    // executive_brief needs ≥10 claims in pack to pass density gate
    const packClaims = Array.from({ length: 12 }, (_, i) => ({ id: `ec:${i + 1}` }))
    const allow = claimAllowlistFromPack([...packClaims, { id: 'ec:1' }])
    expect(allow).toHaveLength(12)
    expect(allow[0]).toBe('ec:1')

    const raw = JSON.stringify({
      summary: 'Test brief grounded in claims.',
      claimIds: ['ec:1', 'ec:forged', 'ec:2'],
      nextSteps: ['Verify in ChEMBL'],
    })
    const out = await runPackAiValidatePipeline({
      rawModelText: raw,
      claimIdAllowlist: allow,
      mode: 'pack_executive_brief',
    })
    expect(out.validation.ok).toBe(true)
    expect(out.validation.insight?.claimIds).toEqual(['ec:1', 'ec:2'])
    expect(out.validation.errors.some((e) => e.includes('orphan'))).toBe(true)
    expect(out.pipeline.stages.some((s) => s.id === 'claim_bound_check')).toBe(true)
  })

  it('refuses invalid JSON', async () => {
    const out = await runPackAiValidatePipeline({
      rawModelText: 'not json',
      claimIdAllowlist: ['ec:1', 'ec:2', 'ec:3'],
      mode: 'pack_executive_brief',
    })
    expect(out.validation.refused).toBe(true)
    expect(out.validation.refuseReason).toMatch(/JSON/i)
  })
})
