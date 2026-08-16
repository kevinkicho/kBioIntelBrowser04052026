/**
 * @jest-environment node
 */

import { searchPRIDE } from '../pride'
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

describe('searchPRIDE', () => {
  it('returns empty for short query without network', async () => {
    await expect(searchPRIDE('a')).resolves.toEqual([])
    await expect(searchPRIDE('')).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps PRIDE project search response', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        _embedded: {
          projects: [
            {
              accession: 'PXD000001',
              title: 'Human proteome draft',
              description: 'Shotgun proteomics',
              species: 'Homo sapiens',
              tissue: 'liver',
              instrument: 'Orbitrap',
              ptm: 'phosphorylation',
              disease: '',
              submitter: 'Example Lab',
              publicationDate: '2012-01-01',
              numProteins: 12,
              numPeptides: 40,
              numSpectra: 100,
            },
          ],
        },
      }),
    )
    const rows = await searchPRIDE('aspirin', 5)
    expect(rows).toHaveLength(1)
    expect(rows[0].accession).toBe('PXD000001')
    expect(rows[0].title).toBe('Human proteome draft')
    expect(rows[0].url).toContain('PXD000001')
    expect(JSON.stringify((fetch as jest.Mock).mock.calls)).toContain('ebi.ac.uk/pride')
  })

  it('zero-hit JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ _embedded: { projects: [] } }))
    expect(await searchPRIDE('unknownxyzpride')).toEqual([])
  })

  it('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await searchPRIDE('aspirin')).toEqual([])
  })

  it('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchPRIDE('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(searchPRIDE('aspirin')).rejects.toThrow(/HTML/)
  })

  it('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchPRIDE('aspirin')).rejects.toThrow(/network/)
  })
})

describe('PRIDE trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('pride', searchPRIDE('aspirin'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'pride')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('pride', searchPRIDE('aspirin'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'pride')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})