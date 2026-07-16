import type { CandidateMolecule } from '@/lib/candidateRanker'
import {
  mapLegacyCandidateToMoleculeCandidate,
  mapRankResultToDiscoveryResult,
} from '@/lib/domain/mappers'
import { isDiscoveryResult } from '@/lib/domain/discoveryResult'
import { createDefaultScoreRubric, computeComposite } from '@/lib/domain/score'

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

  it('does not overwrite legitimate zero composite with legacy.compositeScore', () => {
    const zeroish: CandidateMolecule = {
      name: 'ZeroDrug',
      cid: null,
      clinicalPhase: 0,
      geneAssociationScore: 0,
      sharedTargetRatio: 0,
      trialCountNorm: 0,
      clinicalPhaseRaw: 0,
      sharedTargetCountRaw: 0,
      trialCountRaw: 0,
      geneScoreRaw: 0,
      sources: [],
      confidence: 'preliminary',
      // Inflated legacy score that must not replace recomputed 0
      compositeScore: 0.95,
    }
    const m = mapLegacyCandidateToMoleculeCandidate(zeroish)
    expect(m.candidateId).toMatch(/^nm:/)
    expect(m.identity.identityTrust).toBe('unresolved')
    expect(m.origins).toEqual(['manual'])
    // efficacy 0, clinicalStage 0, identityTrust 0 → composite 0 under renormalize
    expect(m.scores?.axes.efficacy).toBe(0)
    expect(m.scores?.axes.clinicalStage).toBe(0)
    expect(m.scores?.axes.identityTrust).toBe(0)
    const expected = computeComposite(m.scores!.axes, createDefaultScoreRubric('balanced'))
    expect(expected).toBe(0)
    expect(m.scores?.composite).toBe(0)
    expect(m.scores?.composite).not.toBe(0.95)
  })

  it('maps name-only candidate to nm: id and unresolved trust', () => {
    const nameOnly: CandidateMolecule = {
      ...legacy,
      name: 'Mystery',
      cid: null,
      sources: [],
      compositeScore: 0.1,
    }
    const m = mapLegacyCandidateToMoleculeCandidate(nameOnly)
    expect(m.candidateId).toMatch(/^nm:[a-f0-9]{16}$/)
    expect(m.identity.identityTrust).toBe('unresolved')
    expect(m.origins).toEqual(['manual'])
  })

  it('maps RankResult to DiscoveryResult v2', () => {
    const v2 = mapRankResultToDiscoveryResult({
      query: 'alzheimer',
      diseaseId: 'EFO_0000249',
      diseaseName: "Alzheimer's disease",
      therapeuticAreas: ['neurology'],
      genes: [{ symbol: 'APP', score: 0.9, source: 'Open Targets' }],
      candidates: [legacy],
      sourceStatuses: [{ source: 'DGIdb', status: 'loaded', has_data: true }],
      generatedAt: '2026-04-07T12:00:00.000Z',
      warnings: ['Open Targets knownDrugs path excluded'],
    })
    expect(isDiscoveryResult(v2)).toBe(true)
    expect(v2.schemaVersion).toBe(2)
    expect(v2.disease?.name).toContain('Alzheimer')
    expect(v2.targets[0]?.symbol).toBe('APP')
    expect(v2.candidates).toHaveLength(1)
    expect(v2.needsDiseaseConfirmation).toBe(false)
    expect(v2.rubric.preset).toBe('balanced')
    expect(v2.sourceStatuses).toEqual([
      { source: 'DGIdb', status: 'loaded', has_data: true },
    ])
    expect(v2.generatedAt).toBe('2026-04-07T12:00:00.000Z')
    expect(v2.warnings).toContain('Open Targets knownDrugs path excluded')
  })

  it('warns and marks disease unresolved when diseaseId missing', () => {
    const v2 = mapRankResultToDiscoveryResult({
      query: 'rare disease name',
      diseaseId: null,
      diseaseName: 'Rare disease name',
      therapeuticAreas: [],
      genes: [],
      candidates: [],
    })
    expect(v2.warnings.some((w) => /Disease id missing/i.test(w))).toBe(true)
    expect(v2.disease?.idNamespace).toBe('name')
    expect(v2.disease?.identityTrust).toBe('unresolved')
  })
})
