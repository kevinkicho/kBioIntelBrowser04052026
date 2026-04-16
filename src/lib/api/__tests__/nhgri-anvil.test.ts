import { fetchAnvilData } from '@/lib/api/nhgri-anvil'

global.fetch = jest.fn()

describe('NHGRI AnVIL API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch and parse NHGRI AnVIL data', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        datasets: [
          {
            dataset_id: '12345',
            name: 'Test Dataset',
            description: 'Test description',
            study_name: 'Test Study',
            consent_groups: ['GRU'],
            data_types: ['Genomic'],
            participant_count: 100,
            sample_count: 200,
          },
        ],
      }),
    })

    const result = await fetchAnvilData('test')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('service.anvil.gi.ucsc.edu'),
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) })
    )
    expect(result.source).toBe('NHGRI AnVIL')
    expect(result.data.datasets).toHaveLength(1)
    expect(result.data.datasets[0].datasetId).toBe('12345')
    expect(result.data.datasets[0].name).toBe('Test Dataset')
    expect(result.timestamp).toBeTruthy()
  })

  it('should handle empty results gracefully', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    const result = await fetchAnvilData('nonexistent')

    expect(result.source).toBe('NHGRI AnVIL')
    expect(result.data.datasets).toEqual([])
  })

  it('should handle API errors gracefully', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('API error'))) as jest.Mock
    const result = await fetchAnvilData('test')

    expect(result.source).toBe('NHGRI AnVIL')
    expect(result.data.datasets).toEqual([])
  })
})