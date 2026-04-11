"use strict"
import { fetchImmPortData } from '@/lib/api/niaid-immport'
import { getApiKey, standardizeResponse } from '@/lib/api/utils'

jest.mock('@/lib/api/utils', () => ({
  getApiKey: jest.fn(() => 'fake-api-key'),
}))

global.fetch = jest.fn()
beforeEach(() => {
  jest.resetAllMocks()
  ;(getApiKey as jest.Mock).mockReturnValue(null)
})

describe('fetchImmPortData', () => {
  test('returns parsed studies on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        studies: [
          {
            studyId: 'IMM0000123',
            title: 'Immune Response in COVID-19 Patients',
            description: 'A study on immune response in COVID-19 patients',
            studyType: 'Observational',
            conditionStudied: 'COVID-19',
            intervention: 'None',
            participantCount: 1000,
            arms: ['Arm 1'],
            reagents: [],
          },
        ],
      }),
    })
    const response = await fetchImmPortData('COVID-19')
    const results = response.data.studies
    expect(results).toHaveLength(1)
    expect(results[0].studyId).toBe('IMM0000123')
    expect(results[0].title).toBe('Immune Response in COVID-19 Patients')
    expect(results[0].studyType).toBe('Observational')
    expect(results[0].participantCount).toBe(1000)

  })

  test('returns empty array when API response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const response = await fetchImmPortData('unknownxyz')
    expect(response.data.studies).toEqual([])
  })

  test('returns empty array when studies key is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })
    const response = await fetchImmPortData('COVID-19')
    expect(response.data.studies).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const response = await fetchImmPortData('COVID-19')
    expect(response.data.studies).toEqual([])
  })
});