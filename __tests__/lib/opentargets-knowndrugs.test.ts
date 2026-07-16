/**
 * Open Targets known drugs (PR3b) — drugAndClinicalCandidates GraphQL.
 */

import {
  getDrugsForDisease,
  getKnownDrugsForDisease,
  clinicalStageToPhase,
} from '@/lib/api/opentargets'
import * as chembl from '@/lib/api/chembl'

jest.mock('@/lib/api/chembl')
global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('clinicalStageToPhase', () => {
  test('maps OT stage labels to 0–4', () => {
    expect(clinicalStageToPhase('APPROVAL')).toBe(4)
    expect(clinicalStageToPhase('PHASE_3')).toBe(3)
    expect(clinicalStageToPhase('PHASE_2_3')).toBe(3)
    expect(clinicalStageToPhase('PHASE_2')).toBe(2)
    expect(clinicalStageToPhase('PHASE_1_2')).toBe(2)
    expect(clinicalStageToPhase('PHASE_1')).toBe(1)
    expect(clinicalStageToPhase('UNKNOWN')).toBe(0)
    expect(clinicalStageToPhase(null)).toBe(0)
  })
})

describe('getKnownDrugsForDisease', () => {
  test('returns real drug names (not target names) from drugAndClinicalCandidates', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          disease: {
            id: 'MONDO_0004975',
            name: 'Alzheimer disease',
            drugAndClinicalCandidates: {
              count: 2,
              rows: [
                {
                  maxClinicalStage: 'APPROVAL',
                  drug: { id: 'CHEMBL502', name: 'DONEPEZIL', maximumClinicalStage: 'APPROVAL' },
                },
                {
                  maxClinicalStage: 'PHASE_3',
                  drug: { id: 'CHEMBL1201589', name: 'ADUCANUMAB', maximumClinicalStage: 'PHASE_3' },
                },
                // Duplicate lower phase — should keep APPROVAL
                {
                  maxClinicalStage: 'PHASE_1',
                  drug: { id: 'CHEMBL502', name: 'Donepezil', maximumClinicalStage: 'PHASE_1' },
                },
              ],
            },
          },
        },
      }),
    })

    const drugs = await getKnownDrugsForDisease('MONDO_0004975')
    expect(drugs).toHaveLength(2)
    expect(drugs.map((d) => d.name.toUpperCase())).toEqual(
      expect.arrayContaining(['DONEPEZIL', 'ADUCANUMAB']),
    )
    // Must not look like gene symbols / target proteins
    expect(drugs.every((d) => !/^(APP|PSEN1|amyloid)/i.test(d.name))).toBe(true)
    const donepezil = drugs.find((d) => /donepezil/i.test(d.name))
    expect(donepezil?.maxPhase).toBe(4)
    expect(donepezil?.chemblId).toBe('CHEMBL502')

    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body)
    expect(body.query).toContain('drugAndClinicalCandidates')
    expect(body.query).not.toContain('linkedTargets')
  })

  test('returns empty array when disease missing or API errors', async () => {
    expect(await getKnownDrugsForDisease('')).toEqual([])

    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    expect(await getKnownDrugsForDisease('EFO_0000249')).toEqual([])

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ errors: [{ message: 'boom' }] }),
    })
    expect(await getKnownDrugsForDisease('EFO_0000249')).toEqual([])

    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getKnownDrugsForDisease('EFO_0000249')).toEqual([])
  })
})

describe('getDrugsForDisease', () => {
  test('returns unique name list for disease search enrichment', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          disease: {
            drugAndClinicalCandidates: {
              rows: [
                { maxClinicalStage: 'APPROVAL', drug: { id: 'CHEMBL1', name: 'Galantamine' } },
                { maxClinicalStage: 'PHASE_2', drug: { id: 'CHEMBL2', name: 'Semagacestat' } },
              ],
            },
          },
        },
      }),
    })
    const names = await getDrugsForDisease('MONDO_0004975')
    expect(names).toEqual(expect.arrayContaining(['Galantamine', 'Semagacestat']))
    // chembl mock unused here but keeps parity with other OT tests
    expect(chembl.getChemblIdByName).not.toHaveBeenCalled()
  })
})
