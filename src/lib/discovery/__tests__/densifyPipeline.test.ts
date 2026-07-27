/**
 * Golden fixtures for Discover densify / identity-first / why chips / CSV.
 */

import {
  dedupeCandidatesByIdentity,
  sortCandidatesIdentityFirst,
} from '@/lib/discovery/identitySort'
import {
  buildCandidateWhy,
  buildCandidateWhyChips,
} from '@/lib/discovery/candidateWhy'
import { exportDiscoverShortlistCsv } from '@/lib/discovery/shortlistExport'
import { DENSIFY_K_DEFAULT } from '@/lib/discovery/densify'
import type { CandidateMolecule, RankResult } from '@/lib/discovery/types'
import type { ScoreVector } from '@/lib/domain'

function cand(
  partial: Partial<CandidateMolecule> & { name: string },
): CandidateMolecule {
  return {
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
    compositeScore: 0,
    ...partial,
  }
}

describe('DENSIFY_K_DEFAULT', () => {
  it('is a bounded shortlist densify size', () => {
    expect(DENSIFY_K_DEFAULT).toBeGreaterThanOrEqual(5)
    expect(DENSIFY_K_DEFAULT).toBeLessThanOrEqual(15)
  })
})

describe('sortCandidatesIdentityFirst', () => {
  it('prefers CID over name-only when composites are close', () => {
    const a = cand({ name: 'NameOnly', compositeScore: 0.9, cid: null })
    const b = cand({ name: 'WithCid', compositeScore: 0.85, cid: 2244 })
    const sorted = sortCandidatesIdentityFirst([a, b], new Map([
      ['nameonly', { cid: null, identityTrust: 0.2 }],
      ['withcid', { cid: 2244, identityTrust: 0.7 }],
    ]))
    expect(sorted[0]!.name).toBe('WithCid')
  })
})

describe('dedupeCandidatesByIdentity', () => {
  it('merges same InChIKey keeping higher composite and union sources', () => {
    const ik = 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N'
    const a = cand({
      name: 'Aspirin',
      cid: 2244,
      compositeScore: 0.8,
      sources: ['ChEMBL'],
    })
    const b = cand({
      name: 'acetylsalicylic acid',
      cid: 2244,
      compositeScore: 0.5,
      sources: ['ClinicalTrials'],
    })
    const { candidates, removed } = dedupeCandidatesByIdentity([a, b], new Map([
      ['aspirin', { cid: 2244, inchiKey: ik, identityTrust: 0.9 }],
      ['acetylsalicylic acid', { cid: 2244, inchiKey: ik, identityTrust: 0.9 }],
    ]))
    expect(removed).toBe(1)
    expect(candidates).toHaveLength(1)
    expect(candidates[0]!.compositeScore).toBe(0.8)
    expect(candidates[0]!.sources).toEqual(
      expect.arrayContaining(['ChEMBL', 'ClinicalTrials']),
    )
  })
})

describe('candidate why chips', () => {
  it('flags safety not retrieved and name-only', () => {
    const c = cand({
      name: 'Mystery',
      trialCountRaw: 3,
      clinicalPhaseRaw: 2,
      sources: ['ClinicalTrials'],
      compositeScore: 0.4,
    })
    const scores = {
      composite: 0.4,
      axes: {
        efficacy: 0.3,
        clinicalStage: 0.5,
        safety: null,
        novelty: null,
        identityTrust: 0.2,
      },
      axisStatus: {
        efficacy: 'computed',
        clinicalStage: 'computed',
        safety: 'not-retrieved',
        novelty: 'not-retrieved',
        identityTrust: 'computed',
      },
      scorePhase: 'cheap',
      rubricId: 'balanced',
      rubricVersion: 1,
      weights: {
        efficacy: 0.25,
        clinicalStage: 0.25,
        safety: 0.2,
        novelty: 0.15,
        identityTrust: 0.15,
      },
    } as ScoreVector
    const chips = buildCandidateWhyChips(c, {
      diseaseName: 'Pain',
      scores,
    })
    expect(chips.some((x) => x.id === 'no-cid')).toBe(true)
    expect(chips.some((x) => x.id === 'safety' && /not retrieved/i.test(x.label))).toBe(
      true,
    )
    expect(chips.some((x) => x.id === 'trials')).toBe(true)
    expect(buildCandidateWhy(c, 'Pain', scores)).toMatch(/Why ranked/)
  })
})

describe('exportDiscoverShortlistCsv', () => {
  it('includes safety status column and honesty header', () => {
    const result: RankResult = {
      query: 'pain',
      diseaseId: 'EFO_x',
      diseaseName: 'Pain',
      therapeuticAreas: [],
      genes: [{ symbol: 'PTGS1', score: 0.9, source: 'opentargets' }],
      candidates: [
        cand({
          name: 'Aspirin',
          cid: 2244,
          compositeScore: 0.7,
          trialCountRaw: 5,
          clinicalPhaseRaw: 4,
          sources: ['ChEMBL', 'ClinicalTrials'],
          confidence: 'high',
          geneAssociationScore: 0.5,
          sharedTargetRatio: 0.2,
          trialCountNorm: 0.4,
          clinicalPhase: 1,
          sharedTargetCountRaw: 1,
          geneScoreRaw: 0.5,
        }),
      ],
      generatedAt: '2026-04-01T00:00:00.000Z',
      v2: {
        schemaVersion: 2,
        query: 'pain',
        generatedAt: '2026-04-01T00:00:00.000Z',
        disease: null,
        diseaseCandidates: [],
        needsDiseaseConfirmation: false,
        targets: [],
        candidates: [
          {
            candidateId: 'cid:2244',
            identity: {
              name: 'Aspirin',
              pubchemCid: 2244,
              inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
              synonyms: [],
              identityTrust: 'high',
            },
            origins: ['chembl-indication'],
            boardStatus: 'untriaged',
            scores: {
              composite: 0.7,
              axes: {
                efficacy: 0.6,
                clinicalStage: 0.9,
                safety: null,
                novelty: 0.3,
                identityTrust: 0.9,
              },
              axisStatus: {
                efficacy: 'computed',
                clinicalStage: 'computed',
                safety: 'empty',
                novelty: 'computed',
                identityTrust: 'computed',
              },
              scorePhase: 'full',
              rubricId: 'balanced',
              weights: {
                efficacy: 0.25,
                clinicalStage: 0.25,
                safety: 0.2,
                novelty: 0.15,
                identityTrust: 0.15,
              },
            },
          },
        ],
        scorePhase: 'full',
        warnings: [],
        sourceStatuses: [],
        rubric: {
          preset: 'balanced',
          weights: {
            efficacy: 0.25,
            clinicalStage: 0.25,
            safety: 0.2,
            novelty: 0.15,
            identityTrust: 0.15,
          },
          aeAggressiveness: 'soft-flag',
        },
      } as unknown as RankResult['v2'],
    }
    const csv = exportDiscoverShortlistCsv(result)
    expect(csv).toMatch(/safetyStatus/)
    expect(csv).toMatch(/Empty safety/)
    expect(csv).toMatch(/Aspirin/)
    expect(csv).toMatch(/empty|not-retrieved/)
  })
})
