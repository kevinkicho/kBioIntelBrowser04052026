import { getChebiAnnotationByName } from '@/lib/api/chebi'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getChebiAnnotationByName', () => {
  test('returns parsed ChEBI annotation on success', async () => {
    // First fetch: OLS search
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: {
          docs: [
            {
              id: 'http://purl.obolibrary.org/obo/CHEBI_71072',
              short_form: 'CHEBI_71072',
              label: 'liraglutide',
              description: ['A glucagon-like peptide-1 receptor agonist.'],
              annotation: {
                has_role: ['antidiabetic drug', 'anti-obesity drug'],
              },
            },
          ],
        },
      }),
    })
    const result = await getChebiAnnotationByName('liraglutide')
    expect(result).not.toBeNull()
    expect(result!.chebiId).toBe('CHEBI:71072')
    expect(result!.name).toBe('liraglutide')
    expect(result!.definition).toBe('A glucagon-like peptide-1 receptor agonist.')
    expect(result!.roles).toContain('antidiabetic drug')
    expect(result!.roles).toContain('anti-obesity drug')
    expect(result!.url).toBe('https://www.ebi.ac.uk/chebi/searchId.do?chebiId=CHEBI:71072')
  })

  test('returns annotation with empty roles when annotation key is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: {
          docs: [
            {
              id: 'http://purl.obolibrary.org/obo/CHEBI_15365',
              short_form: 'CHEBI_15365',
              label: 'aspirin',
              description: ['An analgesic drug.'],
              annotation: {},
            },
          ],
        },
      }),
    })
    const result = await getChebiAnnotationByName('aspirin')
    expect(result).not.toBeNull()
    expect(result!.roles).toEqual([])
  })

  test('returns null when search returns no docs', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: { docs: [] },
      }),
    })
    const result = await getChebiAnnotationByName('unknownxyz')
    expect(result).toBeNull()
  })

  test('returns null when API response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const result = await getChebiAnnotationByName('aspirin')
    expect(result).toBeNull()
  })

  test('returns null when response structure is unexpected', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })
    const result = await getChebiAnnotationByName('aspirin')
    expect(result).toBeNull()
  })

  test('returns null on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const result = await getChebiAnnotationByName('aspirin')
    expect(result).toBeNull()
  })

  test('handles short_form without underscore gracefully', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: {
          docs: [
            {
              id: 'http://purl.obolibrary.org/obo/CHEBI_15365',
              short_form: 'CHEBI_15365',
              label: 'aspirin',
              description: [],
              annotation: { has_role: ['analgesic'] },
            },
          ],
        },
      }),
    })
    const result = await getChebiAnnotationByName('aspirin')
    expect(result!.chebiId).toBe('CHEBI:15365')
  })
})
