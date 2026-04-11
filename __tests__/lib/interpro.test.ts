import { getProteinDomains } from '@/lib/api/interpro'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getProteinDomains', () => {
  test('returns parsed domains on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { metadata: { accession: 'IPR001548', name: 'Peptidase M2', type: 'Family' } },
          { metadata: { accession: 'IPR034184', name: 'ACE domain', type: 'Domain' } },
        ],
      }),
    })
    const results = await getProteinDomains(['P12821'])
    expect(results).toHaveLength(2)
    expect(results[0].domainId).toBe('IPR001548')
    expect(results[0].name).toBe('Peptidase M2')
    expect(results[0].type).toBe('Family')
    expect(results[0].description).toBe('Peptidase M2')
    expect(results[0].url).toBe('https://www.ebi.ac.uk/interpro/entry/InterPro/IPR001548')
    expect(results[1].domainId).toBe('IPR034184')
  })

  test('limits to first 5 accessions', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    })
    await getProteinDomains(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'])
    expect(fetch).toHaveBeenCalledTimes(5)
  })

  test('returns empty array when accessions list is empty', async () => {
    expect(await getProteinDomains([])).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('skips accessions that return non-ok response', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [{ metadata: { accession: 'IPR999', name: 'Test', type: 'Site' } }] }),
      })
    const results = await getProteinDomains(['BAD', 'P12821'])
    expect(results).toHaveLength(1)
    expect(results[0].domainId).toBe('IPR999')
  })

  test('flattens results from multiple accessions', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [{ metadata: { accession: 'IPR001', name: 'A', type: 'Family' } }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [{ metadata: { accession: 'IPR002', name: 'B', type: 'Domain' } }] }),
      })
    const results = await getProteinDomains(['P1', 'P2'])
    expect(results).toHaveLength(2)
    expect(results[0].domainId).toBe('IPR001')
    expect(results[1].domainId).toBe('IPR002')
  })

  test('returns empty array on top-level network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getProteinDomains(['P12821'])).toEqual([])
  })
})
