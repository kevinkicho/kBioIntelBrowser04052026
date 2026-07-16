/**
 * Mocked end-to-end rankCandidatesForDisease — verifies dual schema + statuses + identity.
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

const DONEPEZIL_IK = 'ADEBPBSSDYVVLD-UHFFFAOYSA-N'

describe('rankCandidatesForDisease (mocked integration)', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    // PubChem identity stage (PR3c) uses global fetch for InChIKey properties
    global.fetch = jest.fn().mockImplementation(async (url: string | URL) => {
      const u = String(url)
      if (u.includes('pubchem.ncbi.nlm.nih.gov') && u.includes('/property/')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            PropertyTable: {
              Properties: [
                {
                  CID: 3152,
                  InChIKey: DONEPEZIL_IK,
                  IsomericSMILES: 'COc1cc2CC(CC(=O)c2c(OC)c1)C(=O)N',
                  Title: 'Donepezil',
                },
              ],
            },
          }),
        } as Response
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response
    }) as unknown as typeof fetch

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

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('returns dual-schema RankResult with sourceStatuses and skips OT target-as-drug', async () => {
    const result = await rankCandidatesForDisease('alzheimer', 15)

    expect(result.query).toBe('alzheimer')
    expect(result.diseaseId).toBe('EFO_0000249')
    expect(result.diseaseName).toBe('Alzheimer disease')
    expect(result.genes.some((g) => g.symbol === 'APP')).toBe(true)

    // Shared gene gather: OT + DisGeNET each called once (not again inside DGIdb path)
    expect(getTargetsForDisease).toHaveBeenCalledTimes(1)
    expect(getGenesByDisease).toHaveBeenCalledTimes(1)
    expect(getTargetRelatedMolecules).toHaveBeenCalledTimes(1)
    expect(getTargetRelatedMolecules).toHaveBeenCalledWith(
      expect.arrayContaining(['APP', 'PSEN1']),
      '',
    )

    // No dual stage labels for gene sources
    expect(
      result.sourceStatuses!.some((s) => s.source.includes('target→genes')),
    ).toBe(false)
    expect(
      result.sourceStatuses!.filter((s) => s.source === 'Open Targets (targets)'),
    ).toHaveLength(1)
    expect(
      result.sourceStatuses!.filter((s) => s.source === 'DisGeNET (genes)'),
    ).toHaveLength(1)

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

    // PR3c identity stage status
    expect(
      result.sourceStatuses!.some((s) => s.source === 'PubChem (identity/InChIKey)'),
    ).toBe(true)

    expect(result.v2).toBeDefined()
    expect(isDiscoveryResult(result.v2)).toBe(true)
    expect(result.v2!.schemaVersion).toBe(2)
    expect(result.v2!.sourceStatuses.length).toBeGreaterThan(0)
    expect(result.v2!.warnings).toContain(OT_KNOWN_DRUGS_DECONTAMINATION_WARNING)
    expect(result.v2!.candidates.length).toBe(result.candidates.length)

    // IdentityTrust + InChIKey on DiscoveryResult / RankResult.v2 candidates
    const donepezil = result.v2!.candidates.find((c) => c.identity.name === 'Donepezil')
    expect(donepezil).toBeDefined()
    expect(donepezil!.identity.inchiKey).toBe(DONEPEZIL_IK)
    expect(donepezil!.identity.identityTrust).toBe('high')
    expect(donepezil!.candidateId).toBe(`ik:${DONEPEZIL_IK}`)
    expect(donepezil!.scores?.axes.identityTrust).toBe(1)
    expect(result.v2!.timingMs?.identity).toBeDefined()
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
