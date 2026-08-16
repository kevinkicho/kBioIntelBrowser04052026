import {
  atcDeepLink,
  atcLevelLabel,
  dedupeAtcClassifications,
  getAtcClassificationsByName,
  isWhoAtcCode,
} from '@/lib/api/atc'
import * as rxnorm from '@/lib/api/rxnorm'
import { runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'

jest.mock('@/lib/api/rxnorm')
global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('isWhoAtcCode / atcDeepLink', () => {
  test('accepts WHO ATC hierarchy codes', () => {
    expect(isWhoAtcCode('N')).toBe(true)
    expect(isWhoAtcCode('N02')).toBe(true)
    expect(isWhoAtcCode('N02B')).toBe(true)
    expect(isWhoAtcCode('N02BA')).toBe(true)
    expect(isWhoAtcCode('N02BA01')).toBe(true)
    expect(isWhoAtcCode('A10BA02')).toBe(true)
  })

  test('rejects VA and junk class ids', () => {
    expect(isWhoAtcCode('CN103')).toBe(false)
    expect(isWhoAtcCode('GA110')).toBe(false)
    expect(isWhoAtcCode('')).toBe(false)
  })

  test('builds WHO ATC/DDD Index deep links', () => {
    expect(atcDeepLink('A10BA02')).toBe(
      'https://atcddd.fhi.no/atc_ddd_index/?code=A10BA02&showdescription=yes',
    )
    expect(atcDeepLink('cn103')).toBe('https://atcddd.fhi.no/atc_ddd_index/')
  })

  test('level labels', () => {
    expect(atcLevelLabel('N02BA01')).toContain('Level 5')
    expect(atcLevelLabel('N02BA')).toContain('Level 4')
    expect(atcLevelLabel('N')).toContain('Level 1')
  })
})

describe('getAtcClassificationsByName', () => {
  test('returns deduped WHO ATC rows with deep links', async () => {
    ;(rxnorm.getRxcuiByName as jest.Mock).mockResolvedValue('1191')
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        rxclassDrugInfoList: {
          rxclassDrugInfo: [
            {
              rxclassMinConceptItem: {
                classId: 'N02BA',
                className: 'Salicylic acid and derivatives',
                classType: 'ATC1-4',
              },
            },
            {
              rxclassMinConceptItem: {
                classId: 'N02BA',
                className: 'Salicylic acid and derivatives',
                classType: 'ATC1-4',
              },
            },
            {
              rxclassMinConceptItem: {
                classId: 'CN103',
                className: 'NON-OPIOID ANALGESICS',
                classType: 'VA',
              },
            },
            {
              rxclassMinConceptItem: {
                classId: 'B01AC',
                className: 'Platelet aggregation inhibitors excl. heparin',
                classType: 'ATC1-4',
              },
            },
          ],
        },
      }),
    })
    const results = await getAtcClassificationsByName('aspirin')
    expect(results.map((r) => r.code)).toEqual(['B01AC', 'N02BA'])
    expect(results.every((r) => (r.url ?? '').includes('code='))).toBe(true)
    expect(results.find((r) => r.code === 'CN103')).toBeUndefined()
    const called = String((fetch as jest.Mock).mock.calls[0][0])
    expect(called).toContain('relaSource=ATC')
  })

  test('returns empty when RxCUI missing', async () => {
    ;(rxnorm.getRxcuiByName as jest.Mock).mockResolvedValue(null)
    expect(await getAtcClassificationsByName('zzz')).toEqual([])
  })

  test('collapses repeated classId rows from multi-relation RxClass payloads', async () => {
    ;(rxnorm.getRxcuiByName as jest.Mock).mockResolvedValue('1242999')
    const dup = {
      rxclassMinConceptItem: {
        classId: 'L01EK',
        className: 'Vascular endothelial growth factor receptor (VEGFR) tyrosine kinase inhibitors',
        classType: 'ATC1-4',
      },
    }
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        rxclassDrugInfoList: {
          // Real-world shape: same ATC classId once per relation type
          rxclassDrugInfo: [dup, dup, dup, dup, dup],
        },
      }),
    })
    const results = await getAtcClassificationsByName('axitinib')
    expect(results).toHaveLength(1)
    expect(results[0].code).toBe('L01EK')
    expect(results[0].url).toContain('code=L01EK')
  })
})

describe('dedupeAtcClassifications', () => {
  test('drops non-WHO and collapses same code', () => {
    const out = dedupeAtcClassifications([
      {
        code: 'L01EK',
        name: 'Short',
        classType: 'ATC1-4',
        url: 'https://atcddd.fhi.no/atc_ddd_index/?code=L01EK&showdescription=yes',
      },
      {
        code: 'L01EK',
        name: 'Vascular endothelial growth factor receptor (VEGFR) tyrosine kinase inhibitors',
        classType: 'ATC1-4',
        url: 'https://atcddd.fhi.no/atc_ddd_index/?code=L01EK&showdescription=yes',
      },
      {
        code: 'CN103',
        name: 'VA junk',
        classType: 'VA',
        url: '',
      },
      {
        code: 'l01ek',
        name: 'lowercase dup',
        classType: 'ATC1-4',
        url: '',
      },
    ])
    expect(out).toHaveLength(1)
    expect(out[0].code).toBe('L01EK')
    // Prefer the longer informative name
    expect(out[0].name).toContain('VEGFR')
  })
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

describe('getAtcClassificationsByName honesty', () => {
  beforeEach(() => {
    ;(rxnorm.getRxcuiByName as jest.Mock).mockResolvedValue('1191')
  })

  test('404 no-classes is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getAtcClassificationsByName('aspirin')).toEqual([])
  })

  test('true empty JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}))
    expect(await getAtcClassificationsByName('aspirin')).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getAtcClassificationsByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getAtcClassificationsByName('aspirin')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getAtcClassificationsByName('aspirin')).rejects.toThrow(/network/)
  })

  test('propagates RxNorm HTTP failure (not EMPTY)', async () => {
    ;(rxnorm.getRxcuiByName as jest.Mock).mockRejectedValueOnce(new Error('HTTP 503'))
    await expect(getAtcClassificationsByName('aspirin')).rejects.toThrow(/HTTP 503/)
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('ATC trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(rxnorm.getRxcuiByName as jest.Mock).mockResolvedValue('1191')
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('atc', getAtcClassificationsByName('aspirin'), []),
    )
    expect(value).toEqual([])
    const atc = metrics.find((m) => m.source === 'atc')
    expect(atc?.loadStatus).toBe('error')
    expect(atc?.error).toMatch(/HTTP 503/)
    expect(atc?.has_data).toBe(false)
  })

  test('true missing RxCUI is empty, not error', async () => {
    ;(rxnorm.getRxcuiByName as jest.Mock).mockResolvedValue(null)
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('atc', getAtcClassificationsByName('zzz'), []),
    )
    expect(value).toEqual([])
    const atc = metrics.find((m) => m.source === 'atc')
    expect(atc?.loadStatus).not.toBe('error')
    expect(atc?.loadStatus).not.toBe('timeout')
    expect(atc?.error).toBeUndefined()
  })
})
