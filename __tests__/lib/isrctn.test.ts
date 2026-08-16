import { getISRCTNByCountry, getISRCTNTrial, searchISRCTN } from '@/lib/api/isrctn'
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

function study(nctId = 'NCT00000001', title = 'Aspirin trial') {
  return {
    protocolSection: {
      identificationModule: {
        nctId,
        briefTitle: title,
        secondaryIdInfos: [{ id: 'ISRCTN12345678' }],
      },
      statusModule: {
        overallStatus: 'Recruiting',
        startDateStruct: { date: '2020-01-01' },
        completionDateStruct: { date: '2024-01-01' },
      },
      designModule: { phases: ['PHASE2'], enrollmentInfo: { count: 100 } },
      sponsorCollaboratorsModule: { leadSponsor: { name: 'NIH' } },
      conditionsModule: { conditions: ['pain'] },
      contactsLocationsModule: { locations: [{ country: 'United Kingdom' }] },
      outcomesModule: { primaryOutcomes: [{ measure: 'pain score' }] },
    },
  }
}

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('searchISRCTN', () => {
  test('returns mapped trials on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ studies: [study()] }))
    const rows = await searchISRCTN('aspirin')
    expect(rows).toHaveLength(1)
    expect(rows[0].isRCTN).toBe('ISRCTN12345678')
    expect(rows[0].title).toBe('Aspirin trial')
    expect(rows[0].url).toContain('NCT00000001')
  })

  test('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await searchISRCTN('zzz')).toEqual([])
  })

  test('true empty JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ studies: [] }))
    expect(await searchISRCTN('zzz')).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchISRCTN('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(searchISRCTN('aspirin')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchISRCTN('aspirin')).rejects.toThrow(/network/)
  })
})

describe('getISRCTNTrial', () => {
  test('404 missing id is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getISRCTNTrial('NCT99999999')).toBeNull()
  })

  test('503 throws (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getISRCTNTrial('NCT00000001')).rejects.toThrow(/HTTP 503/)
  })
})

describe('getISRCTNByCountry', () => {
  test('503 throws (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getISRCTNByCountry('United Kingdom')).rejects.toThrow(/HTTP 503/)
  })
})

describe('ISRCTN trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('isrctn', searchISRCTN('aspirin'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'isrctn')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('isrctn', searchISRCTN('zzz'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'isrctn')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
