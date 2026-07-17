/**
 * ImmPort Shared Data Search API (hits/hits Elastic-style response).
 */

import { fetchImmPortData } from '@/lib/api/niaid-immport'

function mockJsonFetch(body: unknown, ok = true, contentType = 'application/json') {
  const text = JSON.stringify(body)
  return {
    ok,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    text: async () => text,
    json: async () => body,
  }
}

describe('NIAID ImmPort API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('should fetch and parse ImmPort study hits', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonFetch({
        hits: {
          total: { value: 1 },
          hits: [
            {
              _id: 'SDY1',
              _source: {
                study_accession: 'SDY1',
                brief_title: 'Test Study',
                brief_description: 'Test description',
                condition_or_disease: ['COVID-19'],
                clinical_trial: 'Y',
                actual_enrollment: 50,
                arm_name: ['Arm A', 'Arm B'],
                research_focus: ['Vaccine Response'],
              },
            },
          ],
        },
      }),
    )

    const result = await fetchImmPortData('covid')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('immport.org/data/query/api/search/study'),
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) }),
    )
    expect(result.source).toBe('NIAID ImmPort')
    expect(result.data.studies).toHaveLength(1)
    expect(result.data.studies[0].studyId).toBe('SDY1')
    expect(result.data.studies[0].title).toBe('Test Study')
    expect(result.data.studies[0].participantCount).toBe(50)
    expect(result.timestamp).toBeTruthy()
  })

  it('returns empty for short query without network', async () => {
    const result = await fetchImmPortData('x')
    expect(fetch).not.toHaveBeenCalled()
    expect(result.data.studies).toEqual([])
  })

  it('should handle empty results gracefully', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonFetch({}))

    const result = await fetchImmPortData('nonexistent')

    expect(result.source).toBe('NIAID ImmPort')
    expect(result.data.studies).toEqual([])
  })

  it('rejects HTML responses', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'text/html' },
      text: async () => '<!doctype html><html></html>',
    })
    const result = await fetchImmPortData('test')
    expect(result.data.studies).toEqual([])
  })

  it('should handle API errors gracefully', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('API error'))) as jest.Mock
    const result = await fetchImmPortData('test')

    expect(result.source).toBe('NIAID ImmPort')
    expect(result.data.studies).toEqual([])
  })
})
