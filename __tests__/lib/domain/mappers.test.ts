import type { CandidateMolecule } from '@/lib/candidateRanker'
import {
  mapLegacyCandidateToMoleculeCandidate,
  mapRankResultToDiscoveryResult,
} from '@/lib/domain/mappers'
import { isDiscoveryResult } from '@/lib/domain/discoveryResult'

describe('mappers', () => {
  const legacy: CandidateMolecule = {
    name: 'Aspirin',
    cid: 2244,
    clinicalPhase: 0.75,
    geneAssociationScore: 0.8,
    sharedTargetRatio: 0.5,
    trialCountNorm: 0.4,
    clinicalPhaseRaw: 3,
    sharedTargetCountRaw: 2,
    trialCountRaw: 5,
    geneScoreRaw: 0.8,
    sources: ['DGIdb', 'ClinicalTrials', 'ChEMBL'],
    confidence: 'high',
    compositeScore: 0.7,
  }

  it('maps CandidateMolecule to MoleculeCandidate with stable id', () => {
    const m = mapLegacyCandidateToMoleculeCandidate(legacy, { diseaseId: 'EFO_0000001' })
    expect(m.candidateId).toBe('cid:2244')
    expect(m.identity.name).toBe('Aspirin')
    expect(m.identity.pubchemCid).toBe(2244)
    expect(m.identity.identityTrust).toBe('medium')
    expect(m.evidenceBreadthSources).toEqual(expect.arrayContaining(['DGIdb', 'ChEMBL']))
    expect(m.origins).toEqual(
      expect.arrayContaining(['dgidb', 'clinicaltrials-intervention', 'chembl-indication']),
    )
    expect(m.scores?.axes.clinicalStage).toBeCloseTo(0.75, 5)
    expect(m.scores?.axes.efficacy).toBeCloseTo(0.8, 5)
    expect(m.scores?.axes.safety).toBeNull()
    expect(m.scores?.axisStatus.safety).toBe('not-retrieved')
    expect(m.boardStatus).toBe('untriaged')
    expect(m.links[0]?.diseaseId).toBe('EFO_0000001')
  })

  it('maps RankResult to DiscoveryResult v2', () => {
    const v2 = mapRankResultToDiscoveryResult({
      query: 'alzheimer',
      diseaseId: 'EFO_0000249',
      diseaseName: "Alzheimer's disease",
      therapeuticAreas: ['neurology'],
      genes: [{ symbol: 'APP', score: 0.9, source: 'Open Targets' }],
      candidates: [legacy],
    })
    expect(isDiscoveryResult(v2)).toBe(true)
    expect(v2.schemaVersion).toBe(2)
    expect(v2.disease?.name).toContain('Alzheimer')
    expect(v2.targets[0]?.symbol).toBe('APP')
    expect(v2.candidates).toHaveLength(1)
    expect(v2.needsDiseaseConfirmation).toBe(false)
    expect(v2.rubric.preset).toBe('balanced')
  })
})
