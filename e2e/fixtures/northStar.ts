/**
 * Shared north-star fixtures for Playwright (v2.1 full-loop e2e).
 * RankResult shape must match `src/lib/discovery/types.ts` (legacy + v2 dual schema).
 */

export const PROJECT_ID = 'prj_e2e_northstar'
export const PACK_ID = 'pack_e2e_northstar'
export const HYP_ID = 'rh_e2e_northstar'
export const CLAIM_ID = 'ec:e2e_tafamidis_ttr'
export const CANDIDATE_ID = 'cid:208901'

/** Full legacy CandidateMolecule (Discover UI contract). */
const LEGACY_CANDIDATE = {
  name: 'Tafamidis',
  cid: 208901,
  clinicalPhase: 1.0,
  geneAssociationScore: 0.9,
  sharedTargetRatio: 0.7,
  trialCountNorm: 0.6,
  clinicalPhaseRaw: 4,
  sharedTargetCountRaw: 4,
  trialCountRaw: 20,
  geneScoreRaw: 0.9,
  sources: ['ChEMBL', 'Open Targets', 'ClinicalTrials'],
  confidence: 'high' as const,
  compositeScore: 0.82,
}

export const RANK_FIXTURE = {
  query: 'ATTR amyloidosis',
  diseaseId: 'EFO_FIXTURE_ATTR',
  diseaseName: 'ATTR amyloidosis',
  therapeuticAreas: ['rare'],
  genes: [{ symbol: 'TTR', score: 0.9, source: 'Open Targets' }],
  candidates: [LEGACY_CANDIDATE],
  sourceStatuses: [
    {
      source: 'Open Targets',
      status: 'loaded' as const,
      has_data: true,
      duration_ms: 50,
    },
  ],
  generatedAt: '2026-07-01T12:00:00.000Z',
  warnings: [] as string[],
  v2: {
    schemaVersion: 2 as const,
    query: 'ATTR amyloidosis',
    disease: {
      id: 'EFO_FIXTURE_ATTR',
      idNamespace: 'efo' as const,
      name: 'ATTR amyloidosis',
      synonyms: [] as string[],
      therapeuticAreas: ['rare'],
      xrefs: [] as { system: string; id: string }[],
      identityTrust: 'high' as const,
    },
    targets: [] as unknown[],
    candidates: [
      {
        candidateId: CANDIDATE_ID,
        identity: {
          name: 'Tafamidis',
          synonyms: [] as string[],
          pubchemCid: 208901,
          identityTrust: 'high' as const,
        },
        origins: ['chembl-indication' as const],
        evidenceBreadthSources: ['ChEMBL'],
        links: [] as unknown[],
        scores: {
          composite: 0.82,
          axes: {
            efficacy: 0.8,
            clinicalStage: 0.9,
            safety: null,
            novelty: 0.4,
            identityTrust: 0.9,
          },
          axisStatus: {
            efficacy: 'ok' as const,
            clinicalStage: 'ok' as const,
            safety: 'not-retrieved' as const,
            novelty: 'ok' as const,
            identityTrust: 'ok' as const,
          },
          rubricVersion: 1 as const,
          scorePhase: 'cheap' as const,
        },
      },
    ],
    scorePhase: 'cheap' as const,
    needsDiseaseConfirmation: false,
    diseaseCandidates: [] as unknown[],
    sourceStatuses: [] as unknown[],
    timingMs: { disease: 10, cheapScore: 20, total: 100 },
    warnings: [] as string[],
    generatedAt: '2026-07-01T12:00:00.000Z',
  },
}

/** Minimal valid EvidencePack for IDB rehydrate (schemaVersion 1). */
export function makeFixturePack(overrides?: { projectId?: string; packId?: string }) {
  const packId = overrides?.packId ?? PACK_ID
  const projectId = overrides?.projectId ?? PROJECT_ID
  const createdAt = '2026-07-01T12:00:00.000Z'
  const claim = {
    id: CLAIM_ID,
    statement: 'Tafamidis stabilizes TTR tetramers (fixture claim for e2e rehydrate).',
    claimType: 'mechanism' as const,
    subjectCandidateId: CANDIDATE_ID,
    epistemicStatus: 'supported' as const,
    provenance: {
      source: 'ChEMBL Mechanisms',
      retrievedAt: createdAt,
    },
  }
  const candidates = [
    {
      candidateId: CANDIDATE_ID,
      identity: {
        name: 'Tafamidis',
        synonyms: [] as string[],
        pubchemCid: 208901,
        identityTrust: 'high' as const,
      },
      origins: ['chembl-indication' as const],
      evidenceBreadthSources: ['ChEMBL'],
      links: [] as unknown[],
      boardStatus: 'promote' as const,
    },
  ]
  return {
    schemaVersion: 1 as const,
    id: packId,
    version: 1,
    title: 'E2E north-star evidence pack',
    createdAt,
    contentHash: 'e2e_fixture_content_hash_0001',
    disease: {
      id: 'EFO_FIXTURE_ATTR',
      idNamespace: 'efo' as const,
      name: 'ATTR amyloidosis',
      synonyms: [] as string[],
      therapeuticAreas: ['rare'],
      xrefs: [] as unknown[],
      identityTrust: 'high' as const,
    },
    targets: [] as unknown[],
    candidates,
    claims: [claim],
    projectId,
    claimCount: 1,
    claimTypes: { mechanism: 1 },
    sources: ['ChEMBL Mechanisms'],
  }
}

export function makeFixtureProject(overrides?: { projectId?: string }) {
  const projectId = overrides?.projectId ?? PROJECT_ID
  const ts = '2026-07-01T12:00:00.000Z'
  return {
    schemaVersion: 1 as const,
    id: projectId,
    name: 'E2E ATTR board',
    disease: {
      id: 'EFO_FIXTURE_ATTR',
      idNamespace: 'efo' as const,
      name: 'ATTR amyloidosis',
      synonyms: [] as string[],
      therapeuticAreas: ['rare'],
      xrefs: [] as unknown[],
      identityTrust: 'high' as const,
    },
    targetIds: ['TTR'],
    candidates: [
      {
        candidateId: CANDIDATE_ID,
        identity: {
          name: 'Tafamidis',
          synonyms: [] as string[],
          pubchemCid: 208901,
          identityTrust: 'high' as const,
        },
        origins: ['chembl-indication' as const],
        evidenceBreadthSources: ['ChEMBL'],
        links: [] as unknown[],
        boardStatus: 'promote' as const,
      },
    ],
    packIndex: [
      {
        id: PACK_ID,
        title: 'E2E north-star evidence pack',
        createdAt: ts,
        candidateCount: 1,
        claimCount: 1,
        contentHash: 'e2e_fixture_content_hash_0001',
        claimIds: [CLAIM_ID],
      },
    ],
    researchHypothesisIds: [HYP_ID],
    preferencesSnapshot: {
      rubricPreset: 'balanced',
      aeAggressiveness: 'soft-flag' as const,
      harvestTiming: 'board-promote' as const,
    },
    createdAt: ts,
    updatedAt: ts,
  }
}

export function makeFixtureHypothesis(overrides?: {
  projectId?: string
  hypId?: string
  packId?: string
}) {
  const projectId = overrides?.projectId ?? PROJECT_ID
  const hypId = overrides?.hypId ?? HYP_ID
  const packId = overrides?.packId ?? PACK_ID
  const ts = '2026-07-01T12:00:00.000Z'
  return {
    id: hypId,
    projectId,
    version: 1,
    title: 'E2E ATTR hypothesis',
    thesis: 'Tafamidis is a priority candidate for ATTR based on fixture evidence.',
    diseaseId: 'EFO_FIXTURE_ATTR',
    targetIds: ['TTR'],
    candidateIds: [CANDIDATE_ID],
    claimIds: [CLAIM_ID],
    packId,
    nextExperiments: [] as unknown[],
    createdAt: ts,
    updatedAt: ts,
  }
}

/** Category payload that yields at least one mechanism claim via extractors. */
export const CATEGORY_FIXTURE_MECHANISMS = {
  chemblMechanisms: [
    {
      mechanismId: 'mech-e2e-1',
      moleculeName: 'Tafamidis',
      targetName: 'Transthyretin',
      targetChemblId: 'CHEMBL2363049',
      actionType: 'STABILISER',
      mechanismOfAction: 'Transthyretin stabilizer',
      directInteraction: true,
      url: 'https://www.ebi.ac.uk/chembl/',
      maxPhase: 4,
    },
  ],
}
