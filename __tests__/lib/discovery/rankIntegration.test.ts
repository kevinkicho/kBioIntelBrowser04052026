/**
 * Mocked end-to-end rankCandidatesForDisease — verifies dual schema + statuses.
 */

jest.mock('@/lib/diseaseSearch', () => ({
  searchDiseases: jest.fn(),
  resolveMoleculesFromNames: jest.fn(),
}))
jest.mock('@/lib/api/opentargets', () => ({
  getTargetsForDisease: jest.fn(),
}))
jest.mock('@/lib/api/disgenet', () => ({
  getGenesByDisease: jest.fn(),
}))
jest.mock('@/lib/api/dgidb', () => ({
  getTargetRelatedMolecules: jest.fn(),
}))
jest.mock('@/lib/api/clinicaltrials', () => ({
  searchClinicalTrialsByCondition: jest.fn(),
  extractDrugInterventions: jest.fn(),
}))
jest.mock('@/lib/api/chembl-indications', () => ({
  getChemblIndicationsByName: jest.fn(),
}))

import { searchDiseases, resolveMoleculesFromNames } from '@/lib/diseaseSearch'
import { getTargetsForDisease } from '@/lib/api/opentargets'
import { getGenesByDisease } from '@/lib/api/disgenet'
import { getTargetRelatedMolecules } from '@/lib/api/dgidb'
import {
  searchClinicalTrialsByCondition,
  extractDrugInterventions,
} from '@/lib/api/clinicaltrials'
import { getChemblIndicationsByName } from '@/lib/api/chembl-indications'
import {
  rankCandidatesForDisease,
  OT_KNOWN_DRUGS_DECONTAMINATION_WARNING,
} from '@/lib/discovery'
import { isDiscoveryResult } from '@/lib/domain/discoveryResult'

describe('rankCandidatesForDisease (mocked integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(searchDiseases as jest.Mock).mockResolvedValue([
      {
        id: 'EFO_0000249',
        name: 'Alzheimer disease',
        therapeuticAreas: ['nervous system disease'],
        source: 'Open Targets',
        // Contaminated payload must be ignored
        molecules: [{ name: 'Amyloid-beta precursor protein', cid: null }],
      },
    ])
    ;(getTargetsForDisease as jest.Mock).mockResolvedValue([
      { id: 'ENSG1', name: 'APP amyloid', overallScore: 0.9 },
      { id: 'ENSG2', name: 'PSEN1 presenilin', overallScore: 0.8 },
    ])
    ;(getGenesByDisease as jest.Mock).mockResolvedValue([])
    ;(getTargetRelatedMolecules as jest.Mock).mockResolvedValue([
      {
        name: 'Donepezil',
        sharedTargets: ['APP'],
        interactionTypes: ['inhibitor'],
        sources: ['DrugBank'],
      },
    ])
    ;(searchClinicalTrialsByCondition as jest.Mock).mockResolvedValue([])
    ;(extractDrugInterventions as jest.Mock).mockReturnValue([
      { name: 'Donepezil', trialCount: 12 },
    ])
    ;(resolveMoleculesFromNames as jest.Mock).mockResolvedValue([
      { name: 'Donepezil', cid: 3152 },
    ])
    ;(getChemblIndicationsByName as jest.Mock).mockResolvedValue([
      {
        meshHeading: 'Alzheimer Disease',
        efoTerm: 'Alzheimer disease',
        maxPhaseForIndication: 4,
      },
    ])
  })

  it('returns dual-schema RankResult with sourceStatuses and skips OT target-as-drug', async () => {
    const result = await rankCandidatesForDisease('alzheimer', 15)

    expect(result.query).toBe('alzheimer')
    expect(result.diseaseId).toBe('EFO_0000249')
    expect(result.diseaseName).toBe('Alzheimer disease')
    expect(result.genes.some((g) => g.symbol === 'APP')).toBe(true)

    // Must not invent APP protein as a candidate from OT molecules
    expect(result.candidates.some((c) => /amyloid/i.test(c.name))).toBe(false)
    expect(result.candidates.some((c) => c.name === 'Donepezil')).toBe(true)

    expect(result.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(result.sourceStatuses).toBeDefined()
    expect(result.sourceStatuses!.length).toBeGreaterThan(0)
    expect(result.sourceStatuses!.some((s) => s.source === 'DGIdb')).toBe(true)
    expect(
      result.sourceStatuses!.some(
        (s) => s.source === 'Open Targets (knownDrugs)' && s.status === 'disabled',
      ),
    ).toBe(true)
    expect(result.warnings).toContain(OT_KNOWN_DRUGS_DECONTAMINATION_WARNING)

    expect(result.v2).toBeDefined()
    expect(isDiscoveryResult(result.v2)).toBe(true)
    expect(result.v2!.schemaVersion).toBe(2)
    expect(result.v2!.sourceStatuses.length).toBeGreaterThan(0)
    expect(result.v2!.warnings).toContain(OT_KNOWN_DRUGS_DECONTAMINATION_WARNING)
    expect(result.v2!.candidates.length).toBe(result.candidates.length)
  })

  it('returns empty dual-schema payload when no disease matches', async () => {
    ;(searchDiseases as jest.Mock).mockResolvedValue([])
    const result = await rankCandidatesForDisease('zzzz-no-disease', 10)
    expect(result.candidates).toEqual([])
    expect(result.diseaseId).toBeNull()
    expect(result.v2).toBeDefined()
    expect(isDiscoveryResult(result.v2)).toBe(true)
    expect(result.warnings?.some((w) => /No disease/i.test(w))).toBe(true)
  })
})
