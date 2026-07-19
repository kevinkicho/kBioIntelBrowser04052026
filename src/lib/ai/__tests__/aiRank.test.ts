/**
 * AI analysis rank validation — of-record keys only, refuse on garbage.
 */

import {
  applyAiOrderToCandidates,
  buildAiRankInputsFromLegacy,
  buildAiRankPrompt,
  candidateKey,
  parseAndValidateAiRank,
} from '../aiRank'
import type { CandidateMolecule } from '@/lib/discovery/types'

function mockCandidate(partial: Partial<CandidateMolecule> & { name: string }): CandidateMolecule {
  return {
    name: partial.name,
    cid: partial.cid ?? null,
    compositeScore: partial.compositeScore ?? 0.5,
    confidence: partial.confidence ?? 'moderate',
    clinicalPhase: partial.clinicalPhase ?? 0.5,
    clinicalPhaseRaw: partial.clinicalPhaseRaw ?? 2,
    geneAssociationScore: partial.geneAssociationScore ?? 0.4,
    geneScoreRaw: partial.geneScoreRaw ?? 0.4,
    sharedTargetRatio: partial.sharedTargetRatio ?? 0.3,
    sharedTargetCountRaw: partial.sharedTargetCountRaw ?? 1,
    trialCountNorm: partial.trialCountNorm ?? 0.2,
    trialCountRaw: partial.trialCountRaw ?? 3,
    sources: partial.sources ?? ['opentargets'],
  }
}

describe('aiRank', () => {
  const candidates = [
    mockCandidate({ name: 'Tafamidis', cid: 208901, compositeScore: 0.9 }),
    mockCandidate({ name: 'Diflunisal', cid: 3059, compositeScore: 0.7 }),
    mockCandidate({ name: 'Tolcapone', cid: 4659569, compositeScore: 0.5 }),
  ]
  const inputs = buildAiRankInputsFromLegacy(candidates)

  it('candidateKey prefers cid', () => {
    expect(candidateKey(candidates[0])).toBe('cid:208901')
    expect(candidateKey({ name: 'X', cid: null })).toBe('name:x')
  })

  it('buildAiRankPrompt includes dual-plane rules', () => {
    const { system, user } = buildAiRankPrompt({
      diseaseName: 'ATTR amyloidosis',
      candidates: inputs,
      mode: 'reorder',
    })
    expect(system).toMatch(/ONLY reorder/i)
    expect(system).toMatch(/Do NOT invent/i)
    expect(user).toMatch(/ATTR/)
  })

  it('parseAndValidateAiRank accepts valid reorder', () => {
    const raw = JSON.stringify({
      ordering: [
        { key: 'cid:3059', rank: 1, reasons: ['More trials'], evidenceKeys: ['trial'] },
        { key: 'cid:208901', rank: 2, reasons: ['Phase later'], evidenceKeys: ['phase'] },
        { key: 'cid:4659569', rank: 3, reasons: ['Sparse'], evidenceKeys: [] },
      ],
      caveats: ['Analysis only'],
      refused: false,
    })
    const result = parseAndValidateAiRank(raw, inputs, { model: 'test' })
    expect(result.refused).toBe(false)
    expect(result.ordering[0].key).toBe('cid:3059')
    expect(result.ordering[0].reasons[0]).toMatch(/trials/i)
    expect(result.ordering).toHaveLength(3)
    expect(result.model).toBe('test')
  })

  it('refuses unparseable output and keeps of-record', () => {
    const result = parseAndValidateAiRank('not json at all', inputs)
    expect(result.refused).toBe(true)
    expect(result.ordering.map((o) => o.key)).toEqual(inputs.map((i) => i.key))
  })

  it('drops invented keys and appends missing of-record', () => {
    const raw = JSON.stringify({
      ordering: [
        { key: 'cid:3059', rank: 1, reasons: ['ok'] },
        { key: 'cid:99999999', rank: 2, reasons: ['invented'] },
      ],
      refused: false,
    })
    const result = parseAndValidateAiRank(raw, inputs)
    expect(result.ordering.map((o) => o.key)).toContain('cid:208901')
    expect(result.ordering.map((o) => o.key)).not.toContain('cid:99999999')
    expect(result.ordering).toHaveLength(3)
  })

  it('refuses when too few keys match', () => {
    const raw = JSON.stringify({
      ordering: [{ key: 'cid:3059', rank: 1, reasons: ['only one'] }],
      refused: false,
    })
    // 1/3 = 33% < 50% threshold
    const result = parseAndValidateAiRank(raw, inputs)
    expect(result.refused).toBe(true)
    expect(result.refuseReason).toMatch(/insufficient|empty|unparseable/i)
  })

  it('applyAiOrderToCandidates reorders stable objects', () => {
    const result = parseAndValidateAiRank(
      JSON.stringify({
        ordering: [
          { key: 'cid:4659569', rank: 1, reasons: ['a'] },
          { key: 'cid:208901', rank: 2, reasons: ['b'] },
          { key: 'cid:3059', rank: 3, reasons: ['c'] },
        ],
      }),
      inputs,
    )
    const ordered = applyAiOrderToCandidates(candidates, result, (c) => candidateKey(c))
    expect(ordered.map((c) => c.name)).toEqual(['Tolcapone', 'Tafamidis', 'Diflunisal'])
    expect(ordered[0]).toBe(candidates[2])
  })

  it('extracts JSON from markdown fence', () => {
    const raw = '```json\n{"ordering":[{"key":"cid:208901","rank":1,"reasons":["r"]}],"refused":false}\n```'
    const result = parseAndValidateAiRank(raw, inputs)
    // only 1 key = refuse due to insufficient match
    expect(result.ordering.length).toBe(3)
  })
})
