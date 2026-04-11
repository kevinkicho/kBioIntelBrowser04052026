import { getClinicalTrialsByName } from '@/lib/api/clinicaltrials'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getClinicalTrialsByName', () => {
  test('returns parsed trials on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        studies: [
          {
            protocolSection: {
              identificationModule: {
                nctId: 'NCT01272284',
                briefTitle: 'Liraglutide in Type 2 Diabetes',
              },
              statusModule: {
                overallStatus: 'COMPLETED',
                startDateStruct: { date: '2011-01-01' },
              },
              designModule: {
                phases: ['PHASE3'],
              },
              sponsorCollaboratorsModule: {
                leadSponsor: { name: 'Novo Nordisk' },
              },
              conditionsModule: {
                conditions: ['Type 2 Diabetes Mellitus'],
              },
            },
          },
        ],
      }),
    })
    const results = await getClinicalTrialsByName('liraglutide')
    expect(results).toHaveLength(1)
    expect(results[0].nctId).toBe('NCT01272284')
    expect(results[0].title).toBe('Liraglutide in Type 2 Diabetes')
    expect(results[0].phase).toBe('PHASE3')
    expect(results[0].status).toBe('COMPLETED')
    expect(results[0].sponsor).toBe('Novo Nordisk')
    expect(results[0].startDate).toBe('2011-01-01')
    expect(results[0].conditions).toEqual(['Type 2 Diabetes Mellitus'])
  })

  test('returns empty array when API response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const results = await getClinicalTrialsByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('returns empty array when studies key is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })
    const results = await getClinicalTrialsByName('aspirin')
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const results = await getClinicalTrialsByName('aspirin')
    expect(results).toEqual([])
  })
})
