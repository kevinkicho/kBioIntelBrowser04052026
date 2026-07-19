import { probePrideMs, probePcddbCd } from '@/lib/api/characterizationProbes'

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

describe('characterizationProbes', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('probePrideMs marks hit when PRIDE returns accession', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ accession: 'PXD012345', title: 'Test' }],
    })
    const r = await probePrideMs('EGFR')
    expect(r.hit).toBe(true)
    expect(r.accession).toBe('PXD012345')
    expect(r.href).toContain('PXD012345')
    expect(String(mockFetch.mock.calls[0][0])).toContain('pride')
  })

  it('probePrideMs soft-fails on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'))
    const r = await probePrideMs('EGFR')
    expect(r.hit).toBe(false)
    expect(r.href).toContain('pride')
  })

  it('probePcddbCd marks miss when page says no results', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '<html>No results found for query</html>',
    })
    const r = await probePcddbCd('9ZZZ', '9ZZZ')
    expect(r.hit).toBe(false)
    expect(r.href).toContain('pcddb')
  })

  it('probePcddbCd marks hit when HTML mentions entry + pdb id', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        `<html>${'x'.repeat(600)} entry spectrum pcddb 1m17 protein circular dichroism</html>`,
    })
    const r = await probePcddbCd('1M17', '1M17')
    expect(r.hit).toBe(true)
  })
})
