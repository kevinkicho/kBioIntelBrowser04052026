/**
 * @jest-environment node
 */

import { clearEmaBulkMemoryCache, parseEmaMedicinesSheet, searchEmaBulkByName } from '../emaMedicinesBulk'
import { parseXlsxFirstSheet } from '@/lib/xlsx/parseSimpleSheet'
import { runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'

jest.mock('@/lib/xlsx/parseSimpleSheet', () => ({
  parseXlsxFirstSheet: jest.fn(),
}))

describe('emaMedicinesBulk', () => {
  beforeEach(() => clearEmaBulkMemoryCache())

  it('parses header + biosimilar flag rows', () => {
    const rows = [
      ['Content type:', 'Medicine'],
      [
        'Category',
        'Name of medicine',
        'EMA product number',
        'Medicine status',
        'International non-proprietary name (INN) / common name',
        'Active substance',
        'Therapeutic area (MeSH)',
        'ATC code (human)',
        'Biosimilar',
        'Orphan medicine',
        'Generic',
        'Advanced therapy',
        'Conditional approval',
        'Marketing authorisation developer / applicant / holder',
        'Marketing authorisation date',
      ],
      [
        'Human',
        'Amgevita',
        'EMEA/H/C/004212',
        'Authorised',
        'adalimumab',
        'adalimumab',
        'Arthritis',
        'L04AB04',
        'yes',
        'no',
        'no',
        'no',
        'no',
        'Amgen Europe B.V.',
        '2017-03-22',
      ],
      [
        'Human',
        'Humira',
        'EMEA/H/C/000481',
        'Authorised',
        'adalimumab',
        'adalimumab',
        'Arthritis',
        'L04AB04',
        'no',
        'no',
        'no',
        'no',
        'no',
        'AbbVie Deutschland GmbH',
        '2003-09-08',
      ],
    ]
    const cat = parseEmaMedicinesSheet(rows)
    expect(cat.products).toHaveLength(2)
    const amg = cat.products.find((p) => p.name === 'Amgevita')
    const hum = cat.products.find((p) => p.name === 'Humira')
    expect(amg?.biosimilar).toBe(true)
    expect(hum?.biosimilar).toBe(false)
    expect(amg?.inn).toBe('adalimumab')
    expect(amg?.emaProductNumber).toMatch(/004212/)
  })
})

const SAMPLE_ROWS = [
  ['Content type:', 'Medicine'],
  [
    'Category',
    'Name of medicine',
    'EMA product number',
    'Medicine status',
    'International non-proprietary name (INN) / common name',
    'Active substance',
    'Therapeutic area (MeSH)',
    'ATC code (human)',
    'Biosimilar',
    'Orphan medicine',
    'Generic',
    'Advanced therapy',
    'Conditional approval',
    'Marketing authorisation developer / applicant / holder',
    'Marketing authorisation date',
  ],
  [
    'Human',
    'Amgevita',
    'EMEA/H/C/004212',
    'Authorised',
    'adalimumab',
    'adalimumab',
    'Arthritis',
    'L04AB04',
    'yes',
    'no',
    'no',
    'no',
    'no',
    'Amgen Europe B.V.',
    '2017-03-22',
  ],
]

function xlsxRes(status = 200, contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', bytes = 1200) {
  const buf = Buffer.alloc(bytes)
  buf[0] = 0x50
  buf[1] = 0x4b
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    arrayBuffer: async () => Uint8Array.from(buf).buffer,
  }
}

describe('searchEmaBulkByName honesty', () => {
  const prevFetch = global.fetch
  beforeEach(() => {
    clearEmaBulkMemoryCache()
    global.fetch = jest.fn()
    ;(parseXlsxFirstSheet as jest.Mock).mockReturnValue(SAMPLE_ROWS)
  })
  afterEach(() => {
    global.fetch = prevFetch
    clearEmaBulkMemoryCache()
  })

  it('returns empty for short query without network', async () => {
    await expect(searchEmaBulkByName('a')).resolves.toEqual({ meta: null, products: [] })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps live catalog rows', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(xlsxRes())
    const result = await searchEmaBulkByName('adalimumab')
    expect(result.products.length).toBeGreaterThan(0)
    expect(result.products.some((p) => p.inn === 'adalimumab')).toBe(true)
  })

  it('zero-hit on a live catalog is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(xlsxRes())
    const result = await searchEmaBulkByName('unknownxyzmolecule')
    expect(result.products).toEqual([])
    expect(result.meta).not.toBeNull()
  })

  it('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(xlsxRes(404))
    expect(await searchEmaBulkByName('adalimumab')).toEqual({ meta: null, products: [] })
  })

  it('throws when catalog URL returns HTTP 503', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(xlsxRes(503))
    await expect(searchEmaBulkByName('adalimumab')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(xlsxRes(200, 'text/html'))
    await expect(searchEmaBulkByName('adalimumab')).rejects.toThrow(/HTML/)
  })

  it('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchEmaBulkByName('adalimumab')).rejects.toThrow(/network/)
  })
})

describe('EMA bulk trackedSafe honesty', () => {
  const prevFetch = global.fetch
  beforeEach(() => {
    clearEmaBulkMemoryCache()
    global.fetch = jest.fn()
  })
  afterEach(() => {
    global.fetch = prevFetch
    clearEmaBulkMemoryCache()
  })

  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(xlsxRes(503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('ema-bulk', searchEmaBulkByName('adalimumab'), { meta: null, products: [] }),
    )
    expect(value).toEqual({ meta: null, products: [] })
    const row = metrics.find((m) => m.source === 'ema-bulk')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(xlsxRes(404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('ema-bulk', searchEmaBulkByName('adalimumab'), { meta: null, products: [] }),
    )
    expect(value).toEqual({ meta: null, products: [] })
    const row = metrics.find((m) => m.source === 'ema-bulk')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
