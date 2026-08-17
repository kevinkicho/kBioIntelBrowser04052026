/**
 * @jest-environment node
 */

import { getProteinVariations, getProteomicsMappings, getProteinCrossReferences } from '../ebi-proteins-variation'
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

const variationHit = [{
  accession: 'P04637',
  entryName: 'P53_HUMAN',
  geneName: [{ value: 'TP53' }],
  variations: [{
    type: 'VARIANT',
    featureLocation: { start: { position: 175 }, end: { position: 175 } },
    source: 'ClinVar',
    sourceId: '123',
  }],
}]

const proteomicsHit = [{
  accession: 'P04637',
  entryName: 'P53_HUMAN',
  proteomics: [{ proteinId: 'P04637', peptideCount: 4, uniquePeptideCount: 3, coverage: 12, experiments: ['PXD1'] }],
}]

const xrefHit = [{
  accession: 'P04637',
  entryName: 'P53_HUMAN',
  crossReferences: [{ database: { name: 'PDB' }, id: '1TUP', url: 'https://www.rcsb.org/structure/1TUP' }],
}]

describe('EBI proteins variation / proteomics / cross-ref honesty', () => {
  test('blank accession is empty without network', async () => {
    expect(await getProteinVariations('')).toBeNull()
    expect(await getProteomicsMappings('  ')).toBeNull()
    expect(await getProteinCrossReferences('')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  test('maps variation JSON', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes(variationHit))
    const row = await getProteinVariations('P04637')
    expect(row?.accession).toBe('P04637')
    expect(row?.variations).toHaveLength(1)
    expect(row?.variations[0].source).toBe('ClinVar')
  })

  test('zero-hit JSON is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes([]))
    expect(await getProteinVariations('P04637')).toBeNull()
    expect(await getProteomicsMappings('P04637')).toBeNull()
    expect(await getProteinCrossReferences('P04637')).toBeNull()
  })

  test('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    expect(await getProteinVariations('P04637')).toBeNull()
    expect(await getProteomicsMappings('P04637')).toBeNull()
    expect(await getProteinCrossReferences('P04637')).toBeNull()
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    await expect(getProteinVariations('P04637')).rejects.toThrow(/HTTP 503/)
    await expect(getProteomicsMappings('P04637')).rejects.toThrow(/HTTP 503/)
    await expect(getProteinCrossReferences('P04637')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getProteinVariations('P04637')).rejects.toThrow(/HTML/)
    await expect(getProteomicsMappings('P04637')).rejects.toThrow(/HTML/)
    await expect(getProteinCrossReferences('P04637')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('network'))
    await expect(getProteinVariations('P04637')).rejects.toThrow(/network/)
    await expect(getProteomicsMappings('P04637')).rejects.toThrow(/network/)
    await expect(getProteinCrossReferences('P04637')).rejects.toThrow(/network/)
  })

  test('maps proteomics and cross-ref JSON', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes(proteomicsHit))
      .mockResolvedValueOnce(jsonRes(xrefHit))
    const prot = await getProteomicsMappings('P04637')
    const xr = await getProteinCrossReferences('P04637')
    expect(prot?.proteomicsData[0].peptideCount).toBe(4)
    expect(xr?.crossReferences[0].database).toBe('PDB')
  })

  test('trackedSafe records HTTP 503 as error, not empty', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    const { metrics } = await runWithApiMetrics(async () => {
      await trackedSafe('ebi-proteins', getProteinVariations('P04637'), null)
      await trackedSafe('ebi-proteomics', getProteomicsMappings('P04637'), null)
      await trackedSafe('ebi-crossrefs', getProteinCrossReferences('P04637'), null)
    })
    expect(metrics).toHaveLength(3)
    for (const m of metrics) {
      expect(m.loadStatus).toBe('error')
      expect(m.has_data).toBe(false)
      expect(m.error).toMatch(/HTTP 503/)
    }
  })
})
