/**
 * Mocked end-to-end rankCandidatesForDisease — dual schema + PR3b gather.
 */

jest.mock('@/lib/diseaseSearch', () => ({
  searchDiseases: jest.fn(),
  resolveMoleculesFromNames: jest.fn(),
}))
jest.mock('@/lib/api/opentargets', () => ({
  getTargetsForDisease: jest.fn(),
  getKnownDrugsForDisease: jest.fn(),
  getDrugsForDisease: jest.fn(),
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
jest.mock('@/lib/api/chembl', () => ({
  searchTargetsByName: jest.fn(),
  getRelatedCompoundsByTarget: jest.fn(),
}))

import { searchDiseases, resolveMoleculesFromNames } from '@/lib/diseaseSearch'
import { getTargetsForDisease, getKnownDrugsForDisease } from '@/lib/api/opentargets'
import { getGenesByDisease } from '@/lib/api/disgenet'
import { getTargetRelatedMolecules } from '@/lib/api/dgidb'
import {
  searchClinicalTrialsByCondition,
  extractDrugInterventions,
} from '@/lib/api/clinicaltrials'
import { getChemblIndicationsByName } from '@/lib/api/chembl-indications'
import {
  searchTargetsByName,
  getRelatedCompoundsByTarget,
} from '@/lib/api/chembl'
import { rankCandidatesForDisease } from '@/lib/discovery'
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
        // Contaminated payload must still be ignored by moleculeNamesFromDiseaseResult
        molecules: [{ name: 'Amyloid-beta precursor protein', cid: null }],
      },
    ])
    ;(getTargetsForDisease as jest.Mock).mockResolvedValue([
      { id: 'ENSG1', name: 'APP amyloid', overallScore: 0.9 },
      { id: 'ENSG2', name: 'PSEN1 presenilin', overallScore: 0.8 },
    ])
    ;(getGenesByDisease as jest.Mock).mockResolvedValue([])
    ;(getKnownDrugsForDisease as jest.Mock).mockResolvedValue([
      {
        name: 'Memantine',
        chemblId: 'CHEMBL807',
        maxClinicalStage: 'APPROVAL',
        maxPhase: 4,
      },
    ])
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
    ;(searchTargetsByName as jest.Mock).mockResolvedValue([
      {
        targetChemblId: 'CHEMBL2487',
        targetName: 'Amyloid-beta A4 protein',
        targetType: 'SINGLE PROTEIN',
        organism: 'Homo sapiens',
      },
    ])
    ;(getRelatedCompoundsByTarget as jest.Mock).mockResolvedValue([
      {
        compoundId: 'CHEMBL941',
        compoundName: 'Semagacestat',
        name: 'Semagacestat',
        chemblId: 'CHEMBL941',
        maxPhase: 3,
        activityValue: 10,
        activityType: 'IC50',
        similarity: 100,
        relationship: 'Related',
      },
    ])
    ;(resolveMoleculesFromNames as jest.Mock).mockImplementation(
      async (names: string[]) =>
        names.map((name) => ({
          name,
          cid: name === 'Donepezil' ? 3152 : null,
        })),
    )
    ;(getChemblIndicationsByName as jest.Mock).mockResolvedValue([
      {
        meshHeading: 'Alzheimer Disease',
        efoTerm: 'Alzheimer disease',
        maxPhaseForIndication: 4,
      },
    ])
  })

  it('returns dual-schema RankResult with OT knownDrugs + ChEMBL-by-target (PR3b)', async () => {
    const result = await rankCandidatesForDisease('alzheimer', 15)

    expect(result.query).toBe('alzheimer')
    expect(result.diseaseId).toBe('EFO_0000249')
    expect(result.diseaseName).toBe('Alzheimer disease')
    expect(result.genes.some((g) => g.symbol === 'APP')).toBe(true)

    // Shared gene gather: OT + DisGeNET each called once
    expect(getTargetsForDisease).toHaveBeenCalledTimes(1)
    expect(getGenesByDisease).toHaveBeenCalledTimes(1)
    expect(getTargetRelatedMolecules).toHaveBeenCalledTimes(1)
    expect(getKnownDrugsForDisease).toHaveBeenCalledWith('EFO_0000249', 40)
    expect(searchTargetsByName).toHaveBeenCalled()
    expect(getRelatedCompoundsByTarget).toHaveBeenCalled()

    expect(
      result.sourceStatuses!.some((s) => s.source.includes('target→genes')),
    ).toBe(false)
    expect(
      result.sourceStatuses!.filter((s) => s.source === 'Open Targets (targets)'),
    ).toHaveLength(1)
    expect(
      result.sourceStatuses!.filter((s) => s.source === 'DisGeNET (genes)'),
    ).toHaveLength(1)

    // Must not invent APP protein as a candidate from contaminated disease.molecules
    expect(result.candidates.some((c) => /amyloid/i.test(c.name))).toBe(false)
    expect(result.candidates.some((c) => c.name === 'Donepezil')).toBe(true)
    // OT known drug
    expect(result.candidates.some((c) => c.name === 'Memantine')).toBe(true)
    // ChEMBL-by-target compound
    expect(result.candidates.some((c) => c.name === 'Semagacestat')).toBe(true)

    expect(result.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(result.sourceStatuses).toBeDefined()
    expect(result.sourceStatuses!.length).toBeGreaterThan(0)
    expect(result.sourceStatuses!.some((s) => s.source === 'DGIdb')).toBe(true)
    // knownDrugs is enabled/loaded, not disabled
    expect(
      result.sourceStatuses!.some(
        (s) => s.source === 'Open Targets (knownDrugs)' && s.status === 'loaded',
      ),
    ).toBe(true)
    expect(
      result.sourceStatuses!.some(
        (s) => s.source === 'ChEMBL (by-target)' && s.status === 'loaded',
      ),
    ).toBe(true)
    expect(
      result.sourceStatuses!.some(
        (s) => s.source === 'Open Targets (knownDrugs)' && s.status === 'disabled',
      ),
    ).toBe(false)

    const memantine = result.candidates.find((c) => c.name === 'Memantine')
    expect(memantine?.sources).toContain('Open Targets')

    expect(result.v2).toBeDefined()
    expect(isDiscoveryResult(result.v2)).toBe(true)
    expect(result.v2!.schemaVersion).toBe(2)
    expect(result.v2!.sourceStatuses.length).toBeGreaterThan(0)
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
