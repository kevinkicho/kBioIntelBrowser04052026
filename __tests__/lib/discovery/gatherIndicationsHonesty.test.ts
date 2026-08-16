/**
 * Discover gather must mark ChEMBL indications HTTP failure as error,
 * not honest empty — otherwise rank treats an outage as zero indications.
 */
jest.mock('@/lib/api/chembl-indications', () => ({ getChemblIndicationsByName: jest.fn() }))

import { gatherChemblIndications } from '@/lib/discovery/sources/indications'
import { getChemblIndicationsByName } from '@/lib/api/chembl-indications'

describe('gatherChemblIndications honesty', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('ChEMBL indications HTTP 503 is error, not empty', async () => {
    ;(getChemblIndicationsByName as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    const out = await gatherChemblIndications(['Aspirin'])
    expect(out.status.status).toBe('error')
    expect(out.status.error).toMatch(/HTTP 503/)
    expect(out.status.has_data).toBe(false)
    expect(out.indicationMap.size).toBe(0)
  })

  it('true zero-hit ChEMBL indications JSON is empty, not error', async () => {
    ;(getChemblIndicationsByName as jest.Mock).mockResolvedValue([])
    const out = await gatherChemblIndications(['obscurexyz'])
    expect(out.status.status).toBe('empty')
    expect(out.status.error).toBeUndefined()
    expect(out.indicationMap.get('obscurexyz')).toEqual([])
  })

  it('ChEMBL indication rows are loaded', async () => {
    ;(getChemblIndicationsByName as jest.Mock).mockResolvedValue([
      { meshHeading: 'Pain', efoTerm: 'pain', maxPhaseForIndication: 4 },
    ])
    const out = await gatherChemblIndications(['Aspirin'])
    expect(out.status.status).toBe('loaded')
    expect(out.indicationMap.get('Aspirin')?.[0].meshHeading).toBe('Pain')
  })

  it('all-empty plus one HTTP failure is error, not empty-success', async () => {
    ;(getChemblIndicationsByName as jest.Mock)
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('HTTP 503'))
    const out = await gatherChemblIndications(['EmptyDrug', 'DownDrug'])
    expect(out.status.status).toBe('error')
    expect(out.status.error).toMatch(/HTTP 503/)
    expect(out.status.has_data).toBe(false)
  })
})