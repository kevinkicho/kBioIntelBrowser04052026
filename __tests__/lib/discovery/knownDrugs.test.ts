/**
 * OT knownDrugs gather source (PR3b).
 */

jest.mock('@/lib/api/opentargets', () => ({
  getKnownDrugsForDisease: jest.fn(),
}))

import { getKnownDrugsForDisease } from '@/lib/api/opentargets'
import { gatherOpenTargetsKnownDrugs } from '@/lib/discovery/sources/knownDrugs'

describe('gatherOpenTargetsKnownDrugs', () => {
  beforeEach(() => jest.clearAllMocks())

  it('loads drug names and status when diseaseId present', async () => {
    ;(getKnownDrugsForDisease as jest.Mock).mockResolvedValue([
      {
        name: 'Donepezil',
        chemblId: 'CHEMBL502',
        maxClinicalStage: 'APPROVAL',
        maxPhase: 4,
      },
    ])

    const result = await gatherOpenTargetsKnownDrugs('MONDO_0004975')
    expect(getKnownDrugsForDisease).toHaveBeenCalledWith('MONDO_0004975', 40)
    expect(result.names).toEqual(['Donepezil'])
    expect(result.status.source).toBe('Open Targets (knownDrugs)')
    expect(result.status.status).toBe('loaded')
    expect(result.status.has_data).toBe(true)
  })

  it('skips cleanly without disease id', async () => {
    const result = await gatherOpenTargetsKnownDrugs(null)
    expect(getKnownDrugsForDisease).not.toHaveBeenCalled()
    expect(result.names).toEqual([])
    expect(result.status.status).toBe('empty')
  })
})
