import { getMolecularInteractionsByName } from '@/lib/api/intact'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getMolecularInteractionsByName', () => {
  test('returns parsed interactions on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [
          {
            ac: 'EBI-12345',
            interactorA: { interactorName: 'ACE' },
            interactorB: { interactorName: 'AGT' },
            interactionType: 'physical association',
            detectionMethod: 'two hybrid',
            pubmedId: '12345678',
            confidenceScore: 0.85,
          },
        ],
      }),
    })
    const results = await getMolecularInteractionsByName('ACE')
    expect(results).toHaveLength(1)
    expect(results[0].interactorA).toBe('ACE')
    expect(results[0].interactorB).toBe('AGT')
    expect(results[0].interactionType).toBe('physical association')
    expect(results[0].detectionMethod).toBe('two hybrid')
    expect(results[0].pubmedId).toBe('12345678')
    expect(results[0].confidenceScore).toBe(0.85)
    expect(results[0].url).toBe('https://www.ebi.ac.uk/intact/details/interaction/EBI-12345')
  })

  test('uses miscore as fallback for confidenceScore', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [
          {
            ac: 'EBI-99',
            interactorA: { interactorName: 'X' },
            interactorB: { interactorName: 'Y' },
            miscore: 0.42,
          },
        ],
      }),
    })
    const results = await getMolecularInteractionsByName('X')
    expect(results[0].confidenceScore).toBe(0.42)
  })

  test('falls back to empty strings for missing fields', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [
          { ac: 'EBI-1', interactorA: {}, interactorB: {} },
        ],
      }),
    })
    const results = await getMolecularInteractionsByName('test')
    expect(results[0].interactorA).toBe('')
    expect(results[0].interactorB).toBe('')
    expect(results[0].interactionType).toBe('')
    expect(results[0].detectionMethod).toBe('')
    expect(results[0].pubmedId).toBe('')
    expect(results[0].confidenceScore).toBe(0)
  })

  test('encodes name in URL', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [] }),
    })
    await getMolecularInteractionsByName('test molecule')
    const calledUrl = (fetch as jest.Mock).mock.calls[0][0] as string
    expect(calledUrl).toContain('test%20molecule')
    expect(calledUrl).toContain('pageSize=10')
  })

  test('returns empty array when fetch returns non-ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    expect(await getMolecularInteractionsByName('ACE')).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getMolecularInteractionsByName('ACE')).toEqual([])
  })

  test('returns empty array when API returns empty content', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [] }),
    })
    expect(await getMolecularInteractionsByName('unknownxyz')).toEqual([])
  })
})
