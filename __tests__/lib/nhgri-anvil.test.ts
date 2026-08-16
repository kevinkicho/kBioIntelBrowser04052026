"use strict"
import { fetchAnvilData } from '@/lib/api/nhgri-anvil'
import { mockJsonResponse } from '../utils/mockFetch'

global.fetch = jest.fn()
beforeEach(() => {
  jest.resetAllMocks()
})

describe('fetchAnvilData', () => {
  test('returns parsed studies on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({
        datasets: [
          {
            dataset_id: 'ANV0000123',
            name: 'Genome Sequencing in Diverse Populations',
            study_name: 'Diabetes Study',
            description: 'A study on diabetes genetics',
            consent_groups: ['GRU'],
            data_types: ['Genomic', 'Phenotypic'],
            participant_count: 5000,
            sample_count: 5000,
          },
        ],
      })
    )
    const response = await fetchAnvilData('diabetes')
    const results = response.data.datasets
    expect(results).toHaveLength(1)
    expect(results[0].datasetId).toBe('ANV0000123')
    expect(results[0].name).toBe('Genome Sequencing in Diverse Populations')
    expect(results[0].studyName).toBe('Diabetes Study')
    expect(results[0].participantCount).toBe(5000)
  })

  test('throws when API response is not ok (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({}, { status: 500 })
    )
    await expect(fetchAnvilData('unknownxyz')).rejects.toThrow(/HTTP/)
  })

  test('returns empty array when datasets key is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse({}))
    const response = await fetchAnvilData('diabetes')
    expect(response.data.datasets).toEqual([])
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(fetchAnvilData('diabetes')).rejects.toThrow(/network/)
  })

  test('throws on HTML responses (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      new Response('<!doctype html><html></html>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    )
    await expect(fetchAnvilData('diabetes')).rejects.toThrow(/HTML/)
  })
})
