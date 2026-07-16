import {
  candidateNeedsHarvest,
  harvestTimingIsBoardPromote,
} from '@/lib/project/boardHarvest'
import type { MoleculeCandidate } from '@/lib/domain'
import { createEmptyScoreVector } from '@/lib/domain/score'

function baseCandidate(overrides?: Partial<MoleculeCandidate>): MoleculeCandidate {
  return {
    candidateId: 'cid:1',
    identity: {
      name: 'aspirin',
      synonyms: [],
      pubchemCid: 2244,
      identityTrust: 'medium',
    },
    origins: ['opentargets-known-drug'],
    evidenceBreadthSources: [],
    links: [],
    boardStatus: 'untriaged',
    ...overrides,
  }
}

describe('boardHarvest', () => {
  test('candidateNeedsHarvest true when no scores', () => {
    expect(candidateNeedsHarvest(baseCandidate())).toBe(true)
  })

  test('candidateNeedsHarvest true when scorePhase cheap', () => {
    const scores = createEmptyScoreVector('cheap')
    scores.axes.efficacy = 0.5
    scores.axisStatus.efficacy = 'computed'
    expect(candidateNeedsHarvest(baseCandidate({ scores }))).toBe(true)
  })

  test('candidateNeedsHarvest true when safety or novelty null on full', () => {
    const scores = createEmptyScoreVector('full')
    scores.scorePhase = 'full'
    scores.axes.safety = null
    scores.axes.novelty = 0.2
    scores.axisStatus.novelty = 'computed'
    expect(candidateNeedsHarvest(baseCandidate({ scores }))).toBe(true)
  })

  test('candidateNeedsHarvest false when full with safety and novelty', () => {
    const scores = createEmptyScoreVector('full')
    scores.scorePhase = 'full'
    scores.axes.safety = 0.4
    scores.axes.novelty = 0.3
    scores.axisStatus.safety = 'computed'
    scores.axisStatus.novelty = 'computed'
    expect(candidateNeedsHarvest(baseCandidate({ scores }))).toBe(false)
  })

  test('harvestTimingIsBoardPromote defaults true without snapshot', () => {
    expect(
      harvestTimingIsBoardPromote({
        schemaVersion: 1,
        id: 'p1',
        name: 't',
        targetIds: [],
        candidates: [],
        packIndex: [],
        createdAt: '',
        updatedAt: '',
      }),
    ).toBe(true)
  })
})
