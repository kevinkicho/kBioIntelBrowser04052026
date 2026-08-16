import { getEnsemblGenesBySymbols } from '@/lib/api/ensembl'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
  }
}

describe('getEnsemblGenesBySymbols', () => {
  test('returns parsed genes on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
      id: 'ENSG00000159640',
      display_name: 'ACE',
      description: 'angiotensin I converting enzyme',
      biotype: 'protein_coding',
      seq_region_name: '17',
      start: 63477061,
      end: 63498380,
      strand: -1,
    }))
    const results = await getEnsemblGenesBySymbols(['ACE'])
    expect(results).toHaveLength(1)
    expect(results[0].geneId).toBe('ENSG00000159640')
    expect(results[0].displayName).toBe('ACE')
    expect(results[0].description).toBe('angiotensin I converting enzyme')
    expect(results[0].biotype).toBe('protein_coding')
    expect(results[0].chromosome).toBe('17')
    expect(results[0].start).toBe(63477061)
    expect(results[0].end).toBe(63498380)
    expect(results[0].strand).toBe(-1)
    expect(results[0].url).toBe('https://ensembl.org/Homo_sapiens/Gene/Summary?g=ENSG00000159640')
  })

  test('limits to first 5 symbols', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({
      id: 'ENSG1', display_name: 'X', description: '', biotype: '', seq_region_name: '1', start: 1, end: 2, strand: 1,
    }))
    await getEnsemblGenesBySymbols(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
    expect(fetch).toHaveBeenCalledTimes(5)
  })

  test('returns empty array when symbols list is empty', async () => {
    expect(await getEnsemblGenesBySymbols([])).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('skips symbols that return 404 (unknown gene, not HTTP failure)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 404))
      .mockResolvedValueOnce(jsonRes({
        id: 'ENSG2', display_name: 'REN', description: '', biotype: 'protein_coding', seq_region_name: '1', start: 100, end: 200, strand: 1,
      }))
    const results = await getEnsemblGenesBySymbols(['BAD', 'REN'])
    expect(results).toHaveLength(1)
    expect(results[0].displayName).toBe('REN')
  })

  test('uses Number() coercion and falls back to 0 for numeric fields', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
      id: 'ENSG3', display_name: 'X', description: '', biotype: '', seq_region_name: '', start: null, end: null, strand: null,
    }))
    const results = await getEnsemblGenesBySymbols(['X'])
    expect(results[0].start).toBe(0)
    expect(results[0].end).toBe(0)
    expect(results[0].strand).toBe(0)
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getEnsemblGenesBySymbols(['ACE'])).rejects.toThrow(/HTTP 503/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getEnsemblGenesBySymbols(['ACE'])).rejects.toThrow(/network/)
  })
})
