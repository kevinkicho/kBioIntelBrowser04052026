/**
 * Pure function tests for EvidenceClaim extractors (PR9).
 */

import {
  extractClaimsFromChemblActivities,
  extractClaimsFromChemblMechanisms,
  extractClaimsFromAdverseEvents,
  extractClaimsFromClinicalTrials,
  extractClaimsFromOpenTargets,
  extractClaimsFromCorePanels,
  dedupeClaimsById,
  countClaimsByType,
  claimSourceNames,
  makeClaimId,
  isClaimId,
  DEFAULT_CLAIM_TOTAL_CAP,
  CHEMBL_ACTIVITY_SOURCE,
  OPENFDA_AE_SOURCE,
  CLINICAL_TRIALS_SOURCE,
  OPEN_TARGETS_SOURCE,
  CHEMBL_MECHANISM_SOURCE,
} from '@/lib/evidence'
import {
  FIXTURE_CTX,
  FIXTURE_RETRIEVED_AT,
  FIXTURE_CANDIDATE_ID,
  FIXTURE_CHEMBL_ACTIVITIES,
  FIXTURE_CHEMBL_MECHANISMS,
  FIXTURE_ADVERSE_EVENTS,
  FIXTURE_CLINICAL_TRIALS,
  FIXTURE_DISEASE_ASSOCIATIONS,
  FIXTURE_CORE_PANELS,
  FIXTURE_EMPTY_PANELS,
} from '@/lib/evidence/fixtures/corePanels'
import type { ChemblActivity, AdverseEvent } from '@/lib/types'

describe('makeClaimId', () => {
  it('is stable for same inputs', () => {
    const a = makeClaimId('binds-target', 'ChEMBL', 'ACT_001')
    const b = makeClaimId('binds-target', 'ChEMBL', 'ACT_001')
    expect(a).toBe(b)
    expect(isClaimId(a)).toBe(true)
  })

  it('differs when natural key or type changes', () => {
    const a = makeClaimId('binds-target', 'ChEMBL', 'ACT_001')
    const b = makeClaimId('binds-target', 'ChEMBL', 'ACT_002')
    const c = makeClaimId('mechanism', 'ChEMBL', 'ACT_001')
    expect(a).not.toBe(b)
    expect(a).not.toBe(c)
  })
})

describe('extractClaimsFromChemblActivities', () => {
  it('maps fixture activities to binds-target claims with provenance', () => {
    const claims = extractClaimsFromChemblActivities(FIXTURE_CHEMBL_ACTIVITIES, FIXTURE_CTX)
    expect(claims).toHaveLength(2)
    for (const c of claims) {
      expect(c.claimType).toBe('binds-target')
      expect(c.epistemicStatus).toBe('supported')
      expect(c.subjectCandidateId).toBe(FIXTURE_CANDIDATE_ID)
      expect(c.provenance.source).toBe(CHEMBL_ACTIVITY_SOURCE)
      expect(c.provenance.retrievedAt).toBe(FIXTURE_RETRIEVED_AT)
      expect(c.provenance.sourceUrl).toBeTruthy()
      expect(isClaimId(c.id)).toBe(true)
      expect(c.statement).toContain('Aspirin')
      expect(c.statement).toMatch(/IC50/)
    }
    expect(claims[0].targetId).toBe('CHEMBL230')
    expect(claims[0].statement).toContain('Cyclooxygenase-2')
  })

  it('returns [] for null/empty and skips rows without target', () => {
    expect(extractClaimsFromChemblActivities(null, FIXTURE_CTX)).toEqual([])
    expect(extractClaimsFromChemblActivities([], FIXTURE_CTX)).toEqual([])
    const bare: ChemblActivity = {
      activityId: 'x',
      targetName: '',
      targetOrganism: '',
      targetChemblId: '',
      chemblId: 'CHEMBL1',
      assayType: '',
      standardType: 'IC50',
      standardValue: 1,
      standardUnits: 'nM',
      pchemblValue: 0,
      activityType: 'IC50',
      activityValue: 1,
      activityUnits: 'nM',
      url: '',
    }
    expect(extractClaimsFromChemblActivities([bare], FIXTURE_CTX)).toEqual([])
  })

  it('respects per-extractor limit', () => {
    const claims = extractClaimsFromChemblActivities(FIXTURE_CHEMBL_ACTIVITIES, {
      ...FIXTURE_CTX,
      limit: 1,
    })
    expect(claims).toHaveLength(1)
  })

  it('is pure / deterministic', () => {
    const a = extractClaimsFromChemblActivities(FIXTURE_CHEMBL_ACTIVITIES, FIXTURE_CTX)
    const b = extractClaimsFromChemblActivities(FIXTURE_CHEMBL_ACTIVITIES, FIXTURE_CTX)
    expect(a).toEqual(b)
  })
})

describe('extractClaimsFromChemblMechanisms', () => {
  it('maps fixture mechanisms to mechanism claims', () => {
    const claims = extractClaimsFromChemblMechanisms(FIXTURE_CHEMBL_MECHANISMS, FIXTURE_CTX)
    expect(claims).toHaveLength(1)
    const c = claims[0]
    expect(c.claimType).toBe('mechanism')
    expect(c.provenance.source).toBe(CHEMBL_MECHANISM_SOURCE)
    expect(c.provenance.retrievedAt).toBe(FIXTURE_RETRIEVED_AT)
    expect(c.targetId).toBe('CHEMBL221')
    expect(c.statement).toMatch(/Cyclooxygenase inhibitor/i)
    expect(c.statement).toMatch(/direct interaction/)
  })
})

describe('extractClaimsFromAdverseEvents', () => {
  it('maps FAERS fixtures to safety claims with incidence disclaimer', () => {
    const claims = extractClaimsFromAdverseEvents(FIXTURE_ADVERSE_EVENTS, FIXTURE_CTX)
    expect(claims).toHaveLength(2)
    for (const c of claims) {
      expect(c.claimType).toBe('safety')
      expect(c.provenance.source).toBe(OPENFDA_AE_SOURCE)
      expect(c.statement).toMatch(/reporting counts, not incidence/)
      expect(c.statement).toMatch(/FAERS/)
    }
    expect(claims[0].statement).toContain('nausea')
    expect(claims[0].statement).toContain('1523')
  })

  it('skips events without reaction name', () => {
    const bad: AdverseEvent = {
      id: 'x',
      drugName: 'x',
      reactionName: '',
      reaction: '',
      serious: 0,
      outcome: '',
      reportDate: '',
      count: 1,
    }
    expect(extractClaimsFromAdverseEvents([bad], FIXTURE_CTX)).toEqual([])
  })
})

describe('extractClaimsFromClinicalTrials', () => {
  it('maps trials to trial claims with NCT urls', () => {
    const claims = extractClaimsFromClinicalTrials(FIXTURE_CLINICAL_TRIALS, FIXTURE_CTX)
    expect(claims).toHaveLength(2)
    for (const c of claims) {
      expect(c.claimType).toBe('trial')
      expect(c.provenance.source).toBe(CLINICAL_TRIALS_SOURCE)
      expect(c.provenance.sourceUrl).toMatch(/clinicaltrials\.gov\/study\/NCT/)
      expect(c.citations?.[0]?.url).toBe(c.provenance.sourceUrl)
    }
    expect(claims[0].id).toBe(
      makeClaimId('trial', CLINICAL_TRIALS_SOURCE, 'NCT01234567'),
    )
    expect(claims[0].statement).toContain('Phase 3')
    expect(claims[0].statement).toContain('COMPLETED')
  })

  it('returns [] when nctId missing', () => {
    const claims = extractClaimsFromClinicalTrials(
      [{ ...FIXTURE_CLINICAL_TRIALS[0], nctId: '' }],
      FIXTURE_CTX,
    )
    expect(claims).toEqual([])
  })
})

describe('extractClaimsFromOpenTargets', () => {
  it('maps disease associations to indicated-for claims', () => {
    const claims = extractClaimsFromOpenTargets(FIXTURE_DISEASE_ASSOCIATIONS, FIXTURE_CTX)
    expect(claims).toHaveLength(2)
    for (const c of claims) {
      expect(c.claimType).toBe('indicated-for')
      expect(c.provenance.source).toBe(OPEN_TARGETS_SOURCE)
      expect(c.diseaseId).toBeTruthy()
      expect(c.statement).toContain('Open Targets')
    }
    expect(claims[0].diseaseId).toBe('EFO_0001360')
    expect(claims[0].statement).toContain('type 2 diabetes mellitus')
    expect(claims[0].statement).toMatch(/0\.820/)
  })
})

describe('extractClaimsFromCorePanels (aggregate)', () => {
  it('merges all Core extractors with mandatory provenance', () => {
    const claims = extractClaimsFromCorePanels(FIXTURE_CORE_PANELS, FIXTURE_CTX)
    // 2 activities + 1 mech + 2 AE + 2 trials + 2 OT = 9
    expect(claims).toHaveLength(9)

    for (const c of claims) {
      expect(c.provenance.source).toBeTruthy()
      expect(c.provenance.retrievedAt).toBe(FIXTURE_RETRIEVED_AT)
      expect(c.subjectCandidateId).toBe(FIXTURE_CANDIDATE_ID)
      expect(isClaimId(c.id)).toBe(true)
    }

    const byType = countClaimsByType(claims)
    expect(byType['binds-target']).toBe(2)
    expect(byType.mechanism).toBe(1)
    expect(byType.safety).toBe(2)
    expect(byType.trial).toBe(2)
    expect(byType['indicated-for']).toBe(2)

    const sources = claimSourceNames(claims)
    expect(sources).toEqual(
      expect.arrayContaining([
        CHEMBL_ACTIVITY_SOURCE,
        CHEMBL_MECHANISM_SOURCE,
        OPENFDA_AE_SOURCE,
        CLINICAL_TRIALS_SOURCE,
        OPEN_TARGETS_SOURCE,
      ]),
    )
  })

  it('returns [] for empty panels', () => {
    expect(extractClaimsFromCorePanels(FIXTURE_EMPTY_PANELS, FIXTURE_CTX)).toEqual([])
  })

  it('orders by facet priority (mechanism before safety)', () => {
    const claims = extractClaimsFromCorePanels(FIXTURE_CORE_PANELS, {
      ...FIXTURE_CTX,
      preferFacetOrder: true,
    })
    const types = claims.map((c) => c.claimType)
    const mechIdx = types.indexOf('mechanism')
    const safetyIdx = types.indexOf('safety')
    expect(mechIdx).toBeGreaterThanOrEqual(0)
    expect(safetyIdx).toBeGreaterThan(mechIdx)
  })

  it('enforces totalCap (pack ≤200 default)', () => {
    expect(DEFAULT_CLAIM_TOTAL_CAP).toBe(200)
    const claims = extractClaimsFromCorePanels(FIXTURE_CORE_PANELS, {
      ...FIXTURE_CTX,
      totalCap: 3,
    })
    expect(claims).toHaveLength(3)
    // highest priority facets first
    expect(claims.every((c) => ['mechanism', 'binds-target'].includes(c.claimType))).toBe(
      true,
    )
  })

  it('dedupes by claim id', () => {
    const a = extractClaimsFromChemblActivities(FIXTURE_CHEMBL_ACTIVITIES, FIXTURE_CTX)
    const merged = dedupeClaimsById([...a, ...a])
    expect(merged).toHaveLength(a.length)
  })

  it('propagates epistemicStatus override when rows exist', () => {
    const claims = extractClaimsFromChemblActivities(FIXTURE_CHEMBL_ACTIVITIES, {
      ...FIXTURE_CTX,
      epistemicStatus: 'timeout',
    })
    expect(claims[0].epistemicStatus).toBe('timeout')
  })
})
