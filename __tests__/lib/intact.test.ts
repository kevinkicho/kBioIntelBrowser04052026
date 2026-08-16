import { getMolecularInteractionsByName } from '@/lib/api/intact'

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

function mitabLine(opts?: {
  nameA?: string
  nameB?: string
  ac?: string
  pubmed?: string
  method?: string
  type?: string
}) {
  const nameA = opts?.nameA ?? 'EGFR'
  const nameB = opts?.nameB ?? 'ERBB2'
  const ac = opts?.ac ?? 'EBI-12345'
  const pubmed = opts?.pubmed ?? '12345678'
  const method = opts?.method ?? 'two hybrid'
  const type = opts?.type ?? 'physical association'
  const cols = new Array(14).fill('')
  cols[0] = 'uniprotkb:P00533'
  cols[1] = 'uniprotkb:P04626'
  cols[4] = `uniprotkb:${nameA}(gene name)`
  cols[5] = `uniprotkb:${nameB}(gene name)`
  cols[6] = `psi-mi:\"MI:0018\"(${method})`
  cols[8] = `pubmed:${pubmed}`
  cols[11] = `psi-mi:\"MI:0915\"(${type})`
  cols[13] = `intact:${ac}`
  return cols.join('\t')
}

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getMolecularInteractionsByName', () => {
  test('parses PSICQUIC MITAB for a UniProt accession', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes(mitabLine(), 200, 'text/plain'),
    )
    const results = await getMolecularInteractionsByName('P00533')
    expect(results).toHaveLength(1)
    expect(results[0].interactorA).toBe('EGFR')
    expect(results[0].interactorB).toBe('ERBB2')
    expect(results[0].interactionType).toBe('physical association')
    expect(results[0].detectionMethod).toBe('two hybrid')
    expect(results[0].pubmedId).toBe('12345678')
    expect(results[0].url).toBe('https://www.ebi.ac.uk/intact/details/interaction/EBI-12345')
  })

  test('parses PSICQUIC MITAB for a gene symbol', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes(mitabLine({ nameA: 'ACE', nameB: 'AGT', ac: 'EBI-99' }), 200, 'text/plain'),
    )
    const results = await getMolecularInteractionsByName('ACE')
    expect(results).toHaveLength(1)
    expect(results[0].interactorA).toBe('ACE')
    expect(results[0].interactorB).toBe('AGT')
  })

  test('true empty MITAB is [] (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes('', 200, 'text/plain'))
    expect(await getMolecularInteractionsByName('P00533')).toEqual([])
  })

  test('blank name is empty without fetch', async () => {
    expect(await getMolecularInteractionsByName('  ')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('', 503, 'text/plain'))
    await expect(getMolecularInteractionsByName('P00533')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getMolecularInteractionsByName('P00533')).rejects.toThrow(/network/)
  })

  test('throws on HTML (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html></html>', 200, 'text/html'))
    await expect(getMolecularInteractionsByName('P00533')).rejects.toThrow(/HTML/)
  })

  test('throws on JSON body from PSICQUIC (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ error: 'down' }, 200, 'application/json'))
    await expect(getMolecularInteractionsByName('P00533')).rejects.toThrow(/non-MITAB/)
  })
})
