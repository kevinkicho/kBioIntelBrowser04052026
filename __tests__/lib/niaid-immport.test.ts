"use strict"
import { fetchImmPortData } from '@/lib/api/niaid-immport'
import { mockJsonResponse } from '../utils/mockFetch'

global.fetch = jest.fn()
beforeEach(() => {
  jest.resetAllMocks()
})

describe('fetchImmPortData', () => {
  test('returns empty for short query without fetch', async () => {
    const response = await fetchImmPortData('x')
    expect(response.data.studies).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('returns parsed studies on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({
        hits: {
          hits: [
            {
              _id: 'IMM0000123',
              _source: {
                study_accession: 'IMM0000123',
                brief_title: 'Immune Response in COVID-19 Patients',
                brief_description: 'A study on immune response in COVID-19 patients',
                condition_or_disease: ['COVID-19'],
                clinical_trial: 'N',
                research_focus: ['Observational'],
                actual_enrollment: 1000,
                arm_name: ['Arm 1'],
              },
            },
          ],
        },
      }),
    )
    const response = await fetchImmPortData('COVID-19')
    const results = response.data.studies
    expect(results).toHaveLength(1)
    expect(results[0].studyId).toBe('IMM0000123')
    expect(results[0].title).toBe('Immune Response in COVID-19 Patients')
    expect(results[0].participantCount).toBe(1000)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('immport.org/data/query/api/search/study'),
      expect.any(Object),
    )
  })

  test('returns empty array when response is HTML', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      new Response('<!doctype html><html><body>ImmPort</body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    )
    const response = await fetchImmPortData('COVID-19')
    expect(response.data.studies).toEqual([])
  })

  test('returns empty array when API response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse({}, { status: 500 }))
    const response = await fetchImmPortData('unknownxyz')
    expect(response.data.studies).toEqual([])
  })

  test('returns empty array when hits are missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse({}))
    const response = await fetchImmPortData('COVID-19')
    expect(response.data.studies).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const response = await fetchImmPortData('COVID-19')
    expect(response.data.studies).toEqual([])
  })
})
