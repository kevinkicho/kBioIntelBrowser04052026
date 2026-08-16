/**
 * @jest-environment node
 */

import { getPdbeLigandsByName } from '../pdbe-ligands'
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

describe('getPdbeLigandsByName', () => {
  it('returns empty for blank query without network', async () => {
    await expect(getPdbeLigandsByName('')).resolves.toEqual([])
    await expect(getPdbeLigandsByName('   ')).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps PDBe HET compound summary', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
      AIN: [{
        name: 'ASPIRIN',
        formula: 'C9 H8 O4',
        formula_weight: 180.16,
        inchi_key: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
        drugbank_id: 'DB00945',
      }],
    }))
    const rows = await getPdbeLigandsByName('aspirin')
    expect(rows).toHaveLength(1)
    expect(rows[0].compId).toBe('AIN')
    expect(rows[0].name).toBe('ASPIRIN')
    expect(rows[0].url).toContain('AIN')
    expect(JSON.stringify((fetch as jest.Mock).mock.calls)).toContain('ebi.ac.uk')
  })

  it('zero-hit JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ response: { docs: [] } }))
    expect(await getPdbeLigandsByName('unknownxyzpdbe')).toEqual([])
  })

  it('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getPdbeLigandsByName('unknownxyzpdbe')).toEqual([])
  })

  it('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getPdbeLigandsByName('unknownxyzpdbe')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getPdbeLigandsByName('unknownxyzpdbe')).rejects.toThrow(/HTML/)
  })

  it('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getPdbeLigandsByName('unknownxyzpdbe')).rejects.toThrow(/network/)
  })

  it('HET 503 still uses search fallback; search 503 throws', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getPdbeLigandsByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  it('HET 503 then zero-hit search is empty (not error)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({ response: { docs: [] } }))
    expect(await getPdbeLigandsByName('aspirin')).toEqual([])
  })
})

describe('PDBe ligands trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('pdbe-ligands', getPdbeLigandsByName('unknownxyzpdbe'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'pdbe-ligands')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('pdbe-ligands', getPdbeLigandsByName('unknownxyzpdbe'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'pdbe-ligands')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
