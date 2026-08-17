import {
  extractUniProtProteinName,
  getUniprotEntriesByName,
  getUniProtProtein,
} from '@/lib/api/uniprot'
import { runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('extractUniProtProteinName', () => {
  test('reads recommendedName.fullName.value', () => {
    expect(
      extractUniProtProteinName({
        recommendedName: { fullName: { value: 'Prothrombin' } },
        alternativeNames: [{ fullName: { value: 'Coagulation factor II' } }],
      }),
    ).toBe('Prothrombin')
  })

  test('falls back to alternativeNames when recommended missing', () => {
    expect(
      extractUniProtProteinName({
        alternativeNames: [{ fullName: { value: 'Coagulation factor II' } }],
      }),
    ).toBe('Coagulation factor II')
  })

  test('never returns a nested object (React-safe string)', () => {
    const name = extractUniProtProteinName({
      recommendedName: { fullName: { value: 'Aspirin target' } },
      alternativeNames: [],
    })
    expect(typeof name).toBe('string')
    expect(name).not.toEqual(expect.objectContaining({ recommendedName: expect.anything() }))
  })
})

describe('getUniProtProtein', () => {
  test('maps proteinDescription object to a string proteinName', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        primaryAccession: 'P00734',
        uniProtkbId: 'THRB_HUMAN',
        proteinDescription: {
          recommendedName: { fullName: { value: 'Prothrombin' } },
          alternativeNames: [{ fullName: { value: 'Coagulation factor II' } }],
        },
        genes: [{ geneName: { value: 'F2' } }],
        organism: { scientificName: 'Homo sapiens' },
        sequence: { length: 622, sequence: 'MAH…' },
        comments: [
          {
            commentType: 'FUNCTION',
            texts: [{ value: 'Thrombin cleaves fibrinogen.' }],
          },
          {
            commentType: 'SUBCELLULAR LOCATION',
            subcellularLocations: [{ location: { value: 'Secreted' } }],
          },
        ],
        features: [
          {
            type: 'VARIANT',
            location: { start: { value: 10 }, end: { value: 10 } },
            alternativeSequence: {
              originalSequence: 'A',
              alternativeSequences: ['V'],
            },
            description: 'In dbSNP:rs1',
          },
        ],
      }),
    })
    const p = await getUniProtProtein('P00734')
    expect(p).not.toBeNull()
    expect(typeof p!.proteinName).toBe('string')
    expect(p!.proteinName).toBe('Prothrombin')
    expect(p!.geneName).toBe('F2')
    expect(p!.subcellularLocation).toBe('Secreted')
    expect(p!.variants?.[0]?.sequence).toBe('A→V')
  })

  test('blank accession is empty without network', async () => {
    expect(await getUniProtProtein('')).toBeNull()
    expect(await getUniProtProtein('   ')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  test('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getUniProtProtein('P04637')).toBeNull()
  })

  test('throws on HTTP 503 for detail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getUniProtProtein('P04637')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body for detail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getUniProtProtein('P04637')).rejects.toThrow(/HTML/)
  })

  test('throws on network error for detail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getUniProtProtein('P04637')).rejects.toThrow(/network/)
  })

  test('trackedSafe records HTTP 503 as error, not empty', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { metrics } = await runWithApiMetrics(async () => {
      await trackedSafe('uniprot-extended', getUniProtProtein('P04637'), null)
    })
    expect(metrics[0].loadStatus).toBe('error')
    expect(metrics[0].has_data).toBe(false)
    expect(metrics[0].error).toMatch(/HTTP 503/)
  })
})

describe('getUniprotEntriesByName', () => {
  test('returns parsed entries on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        results: [
          {
            primaryAccession: 'P00734',
            proteinDescription: {
              recommendedName: {
                fullName: { value: 'Prothrombin' },
              },
            },
            genes: [{ geneName: { value: 'F2' } }],
            organism: { scientificName: 'Homo sapiens' },
            comments: [
              {
                commentType: 'FUNCTION',
                texts: [{ value: 'Thrombin cleaves fibrinogen to form fibrin.' }],
              },
            ],
          },
        ],
      }),
    })
    const results = await getUniprotEntriesByName('thrombin')
    expect(results).toHaveLength(1)
    expect(results[0].accession).toBe('P00734')
    expect(results[0].proteinName).toBe('Prothrombin')
    expect(results[0].geneName).toBe('F2')
    expect(results[0].organism).toBe('Homo sapiens')
    expect(results[0].functionSummary).toBe('Thrombin cleaves fibrinogen to form fibrin.')
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getUniprotEntriesByName('unknownxyz')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getUniprotEntriesByName('aspirin')).rejects.toThrow(/HTML/)
  })

  test('returns empty array when results key is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}))
    const results = await getUniprotEntriesByName('aspirin')
    expect(results).toEqual([])
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getUniprotEntriesByName('aspirin')).rejects.toThrow(/network/)
  })

  test('handles missing optional fields gracefully', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        results: [
          {
            primaryAccession: 'Q12345',
            proteinDescription: {},
            genes: [],
            organism: { scientificName: 'Unknown' },
            comments: [],
          },
        ],
      }),
    })
    const results = await getUniprotEntriesByName('something')
    expect(results).toHaveLength(1)
    expect(results[0].proteinName).toBe('Unknown protein')
    expect(results[0].geneName).toBe('')
    expect(results[0].functionSummary).toBe('')
  })
})
