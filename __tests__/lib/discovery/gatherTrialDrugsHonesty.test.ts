/**
 * Discover trial gather must mark ClinicalTrials.gov HTTP failure as error,
 * not honest empty — otherwise rank treats an outage as zero trial drugs.
 */
import { gatherTrialDrugs } from '@/lib/discovery/sources/trials'

jest.mock('@/lib/api/clinicaltrials', () => ({
  searchClinicalTrialsByCondition: jest.fn(),
  extractDrugInterventions: jest.fn(),
}))

import {
  searchClinicalTrialsByCondition,
  extractDrugInterventions,
} from '@/lib/api/clinicaltrials'

describe('gatherTrialDrugs honesty', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('HTTP 503 is error, not empty', async () => {
    ;(searchClinicalTrialsByCondition as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    const out = await gatherTrialDrugs('type 2 diabetes')
    expect(out.status.status).toBe('error')
    expect(out.status.error).toMatch(/HTTP 503/)
    expect(out.status.has_data).toBe(false)
    expect(out.drugCounts.size).toBe(0)
  })

  it('true zero-study JSON is empty, not error', async () => {
    ;(searchClinicalTrialsByCondition as jest.Mock).mockResolvedValue([])
    ;(extractDrugInterventions as jest.Mock).mockReturnValue([])
    const out = await gatherTrialDrugs('rare disease xyz')
    expect(out.status.status).toBe('empty')
    expect(out.status.error).toBeUndefined()
    expect(out.drugCounts.size).toBe(0)
  })

  it('rows are loaded', async () => {
    ;(searchClinicalTrialsByCondition as jest.Mock).mockResolvedValue([{ nctId: 'NCT1' }])
    ;(extractDrugInterventions as jest.Mock).mockReturnValue([
      { name: 'Metformin', type: 'DRUG', trialCount: 3, trials: [] },
    ])
    const out = await gatherTrialDrugs('type 2 diabetes')
    expect(out.status.status).toBe('loaded')
    expect(out.drugCounts.get('Metformin')).toBe(3)
  })
})
