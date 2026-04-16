import { fetchImmPortData } from '@/lib/api/niaid-immport'

global.fetch = jest.fn()

describe('NIAID ImmPort API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch and parse NIAID ImmPort data', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        studies: [
          {
            study_id: '12345',
            title: 'Test Study',
            description: 'Test description',
            study_type: 'Clinical Trial',
            condition_studied: 'Test Condition',
            intervention: 'Test Intervention',
            participant_count: 50,
            arms: ['Arm A', 'Arm B'],
            reagents: ['Reagent 1'],
          },
        ],
      }),
    })

    const result = await fetchImmPortData('test')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('immport.org'),
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) })
    )
    expect(result.source).toBe('NIAID ImmPort')
    expect(result.data.studies).toHaveLength(1)
    expect(result.data.studies[0].studyId).toBe('12345')
    expect(result.timestamp).toBeTruthy()
  })

  it('should handle empty results gracefully', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    const result = await fetchImmPortData('nonexistent')

    expect(result.source).toBe('NIAID ImmPort')
    expect(result.data.studies).toEqual([])
  })

  it('should handle API errors gracefully', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('API error'))) as jest.Mock
    const result = await fetchImmPortData('test')

    expect(result.source).toBe('NIAID ImmPort')
    expect(result.data.studies).toEqual([])
  })
})