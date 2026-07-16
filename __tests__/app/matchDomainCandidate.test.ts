import { matchDomainCandidate } from '@/lib/discovery/matchDomainCandidate'
import type { CandidateMolecule } from '@/lib/candidateRanker'
import type { MoleculeCandidate } from '@/lib/domain'

function legacy(name: string, cid: number | null): CandidateMolecule {
  return {
    name,
    cid,
    clinicalPhase: 0.5,
    geneAssociationScore: 0.5,
    sharedTargetRatio: 0.5,
    trialCountNorm: 0.5,
    clinicalPhaseRaw: 2,
    sharedTargetCountRaw: 1,
    trialCountRaw: 1,
    geneScoreRaw: 0.5,
    sources: ['DGIdb'],
    confidence: 'moderate',
    compositeScore: 0.5,
  }
}

function domain(name: string, cid: number | null, id: string): MoleculeCandidate {
  return {
    candidateId: id,
    identity: {
      name,
      synonyms: [],
      pubchemCid: cid,
      identityTrust: 'medium',
    },
    origins: ['dgidb'],
    evidenceBreadthSources: ['DGIdb'],
    links: [],
  }
}

describe('matchDomainCandidate', () => {
  it('pairs by index when lengths match', () => {
    const legacies = [legacy('A', 1), legacy('B', 2)]
    const v2 = [domain('A', 1, 'cid:1'), domain('B', 2, 'cid:2')]
    expect(matchDomainCandidate(legacies[0], 0, v2, 2)?.candidateId).toBe('cid:1')
    expect(matchDomainCandidate(legacies[1], 1, v2, 2)?.candidateId).toBe('cid:2')
  })

  it('falls back to CID when lengths mismatch', () => {
    const v2 = [domain('B', 2, 'cid:2'), domain('A', 1, 'cid:1')]
    expect(matchDomainCandidate(legacy('A', 1), 0, v2, 1)?.candidateId).toBe('cid:1')
  })

  it('falls back to normalized name', () => {
    const v2 = [domain('Aspirin', null, 'nm:aspirin')]
    expect(matchDomainCandidate(legacy('aspirin', null), 0, v2, 0)?.candidateId).toBe(
      'nm:aspirin',
    )
  })

  it('returns undefined when no match', () => {
    expect(matchDomainCandidate(legacy('X', 99), 0, [domain('Y', 1, 'cid:1')], 0)).toBeUndefined()
  })
})
