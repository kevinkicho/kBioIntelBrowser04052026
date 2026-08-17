/**
 * @jest-environment node
 */

import { searchIRIS } from '../iris'
import { runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'
import { resetRateLimitBuckets } from '@/lib/rateLimit'

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

function urlOf(input: unknown): string {
  return String(input)
}

function mockByUrl(handler: (url: string) => ReturnType<typeof jsonRes>) {
  ;(fetch as jest.Mock).mockImplementation(async (input: unknown) => handler(urlOf(input)))
}

global.fetch = jest.fn()
beforeEach(() => {
  jest.resetAllMocks()
  resetRateLimitBuckets()
})

describe('searchIRIS', () => {
  it('returns empty for blank query without network', async () => {
    await expect(searchIRIS('')).resolves.toEqual([])
    await expect(searchIRIS('   ')).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('zero-hit JSON from both sources is empty (not error)', async () => {
    mockByUrl((url) => {
      if (url.includes('comptox.epa.gov')) return jsonRes([])
      if (url.includes('pubchem.ncbi.nlm.nih.gov') && url.includes('/cids/')) return jsonRes({}, 404)
      return jsonRes({}, 404)
    })
    expect(await searchIRIS('zzzz-unknown-chem')).toEqual([])
  })

  it('404 on last-leg CompTox + PubChem CID is honest EMPTY', async () => {
    mockByUrl((url) => {
      if (url.includes('comptox.epa.gov')) return jsonRes({}, 404)
      if (url.includes('/cids/')) return jsonRes({}, 404)
      return jsonRes({}, 404)
    })
    expect(await searchIRIS('benzene')).toEqual([])
  })

  it('throws when CompTox and PubChem both return HTTP 503', async () => {
    mockByUrl(() => jsonRes({}, 503))
    await expect(searchIRIS('benzene')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body when both sources fail', async () => {
    mockByUrl(() => jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(searchIRIS('benzene')).rejects.toThrow(/HTML/)
  })

  it('throws on network error when both sources fail', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('network'))
    await expect(searchIRIS('benzene')).rejects.toThrow(/network/)
  })

  it('CompTox 503 still uses PubChem CID; PubChem 503 + CompTox empty is empty', async () => {
    mockByUrl((url) => {
      if (url.includes('comptox.epa.gov')) return jsonRes({}, 503)
      if (url.includes('/cids/')) return jsonRes({ IdentifierList: { CID: [241] } })
      if (url.includes('/synonyms/')) return jsonRes({ InformationList: { Information: [{ Synonym: ['71-43-2'] }] } })
      if (url.includes('EPA%20IRIS') || url.includes('EPA IRIS')) {
        return jsonRes({ Record: { Section: [] } })
      }
      return jsonRes({ Record: { Section: [] } })
    })
    const rows = await searchIRIS('benzene')
    expect(rows.length).toBeGreaterThanOrEqual(1)
    expect(rows[0].casNumber).toBe('71-43-2')
    expect(rows[0].hasIrisData).toBe(false)
  })

  it('PubChem 503 still uses CompTox identity rows', async () => {
    mockByUrl((url) => {
      if (url.includes('comptox.epa.gov')) {
        return jsonRes([{ dtxsid: 'DTXSID3039242', searchWord: 'Benzene', searchMatch: 'Approved Name' }])
      }
      return jsonRes({}, 503)
    })
    const rows = await searchIRIS('benzene')
    expect(rows).toHaveLength(1)
    expect(rows[0].chemicalName).toBe('Benzene')
    expect(rows[0].hasIrisData).toBe(false)
  })
})

describe('IRIS trackedSafe honesty', () => {
  test('both-fail HTTP 503 is error, not empty, in category metrics', async () => {
    mockByUrl(() => jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('iris', searchIRIS('benzene'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'iris')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    mockByUrl(() => jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('iris', searchIRIS('benzene'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'iris')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
