import { getGhsHazardsByCid } from '@/lib/api/pubchem-hazards'
import { runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'
import { resetRateLimitBuckets } from '@/lib/rateLimit'

global.fetch = jest.fn()
beforeEach(() => {
  jest.resetAllMocks()
  resetRateLimitBuckets()
})

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

const mockGhsResponse = {
  Record: {
    Section: [
      {
        TOCHeading: 'Safety and Hazards',
        Section: [
          {
            TOCHeading: 'Hazards Identification',
            Section: [
              {
                TOCHeading: 'GHS Classification',
                Information: [
                  {
                    Name: 'Signal',
                    Value: { StringWithMarkup: [{ String: 'Danger' }] },
                  },
                  {
                    Name: 'Pictogram(s)',
                    Value: {
                      StringWithMarkup: [
                        {
                          String: 'GHS07',
                          Markup: [{ Type: 'Icon', URL: 'https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS07.svg' }],
                        },
                      ],
                    },
                  },
                  {
                    Name: 'GHS Hazard Statements',
                    Value: {
                      StringWithMarkup: [
                        { String: 'H302: Harmful if swallowed' },
                        { String: 'H315: Causes skin irritation' },
                      ],
                    },
                  },
                  {
                    Name: 'Precautionary Statement Codes',
                    Value: {
                      StringWithMarkup: [
                        { String: 'P264: Wash hands thoroughly after handling' },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
}

describe('getGhsHazardsByCid', () => {
  test('returns parsed GHS data on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes(mockGhsResponse))
    const data = await getGhsHazardsByCid(702)
    expect(data).not.toBeNull()
    expect(data!.signalWord).toBe('Danger')
    expect(data!.pictogramUrls).toContain('https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS07.svg')
    expect(data!.hazardStatements).toHaveLength(2)
    expect(data!.hazardStatements[0]).toBe('H302: Harmful if swallowed')
    expect(data!.precautionaryStatements).toHaveLength(1)
  })

  test('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getGhsHazardsByCid(702)).toBeNull()
  })

  test('throws when PubChem returns HTTP 503', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getGhsHazardsByCid(702)).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getGhsHazardsByCid(702)).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getGhsHazardsByCid(702)).rejects.toThrow(/network/)
  })

  test('returns null when no GHS section found', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ Record: { Section: [] } }))
    const data = await getGhsHazardsByCid(9999999)
    expect(data).toBeNull()
  })
})

describe('PubChem hazards trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('pubchem-hazards', getGhsHazardsByCid(702), null),
    )
    expect(value).toBeNull()
    const row = metrics.find((m) => m.source === 'pubchem-hazards')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('pubchem-hazards', getGhsHazardsByCid(702), null),
    )
    expect(value).toBeNull()
    const row = metrics.find((m) => m.source === 'pubchem-hazards')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
