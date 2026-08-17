import {
  mapCancerClassification,
  parseToxValue,
  searchIRIS,
} from '@/lib/api/iris'
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

function mockByUrl(handler: (url: string) => ReturnType<typeof jsonRes>) {
  ;(fetch as jest.Mock).mockImplementation(async (input: unknown) => handler(String(input)))
}

global.fetch = jest.fn()
beforeEach(() => {
  jest.resetAllMocks()
  resetRateLimitBuckets()
})

describe('parseToxValue', () => {
  test('parses scientific notation with units', () => {
    const r = parseToxValue('4 x 10 ^-3 mg/kg-day')
    expect(r.value).toBeCloseTo(0.004)
    expect(r.units).toMatch(/mg/)
    expect(r.display).toContain('4 x 10')
  })

  test('parses plain numbers', () => {
    const r = parseToxValue('0.05 mg/m3')
    expect(r.value).toBeCloseTo(0.05)
    expect(r.units).toContain('mg')
  })
})

describe('mapCancerClassification', () => {
  test('maps known human carcinogen', () => {
    expect(mapCancerClassification('Carcinogenic to Humans')).toBe('Carcinogenic')
  })

  test('maps inadequate data', () => {
    expect(mapCancerClassification('Data are inadequate for an assessment')).toBe('Inadequate')
  })
})

describe('searchIRIS', () => {
  test('fills CAS and RfD from PubChem EPA IRIS section', async () => {
    mockByUrl((url) => {
      if (url.includes('comptox.epa.gov')) {
        return jsonRes([
          { dtxsid: 'DTXSID3039242', searchWord: 'Benzene', searchMatch: 'Approved Name' },
        ])
      }
      if (url.includes('/cids/')) {
        return jsonRes({ IdentifierList: { CID: [241] } })
      }
      if (url.includes('/synonyms/')) {
        return jsonRes({
          InformationList: {
            Information: [{ Synonym: ['benzene', '71-43-2', 'other'] }],
          },
        })
      }
      if (url.includes('EPA%20IRIS') || url.includes('EPA IRIS')) {
        return jsonRes({
          Record: {
            Section: [
              {
                TOCHeading: 'EPA IRIS Information',
                Information: [
                  {
                    Name: 'Substance',
                    Value: { StringWithMarkup: [{ String: 'Benzene' }] },
                  },
                  {
                    Name: 'Reference Dose (RfD), chronic',
                    Value: { StringWithMarkup: [{ String: '4 x 10 ^-3 mg/kg-day' }] },
                  },
                  {
                    Name: 'Reference Concentration (RfC), chronic',
                    Value: { StringWithMarkup: [{ String: '3 x 10 ^-2 mg/m^3' }] },
                  },
                  {
                    Name: 'Critical Effect Systems',
                    Value: { StringWithMarkup: [{ String: 'Immune' }] },
                  },
                  {
                    Name: 'Cancer Sites',
                    Value: { StringWithMarkup: [{ String: 'Hematologic' }] },
                  },
                ],
              },
            ],
          },
        })
      }
      return jsonRes({
        Record: {
          Section: [
            {
              TOCHeading: 'Evidence for Carcinogenicity',
              Information: [
                {
                  Value: {
                    StringWithMarkup: [{ String: 'Cancer Classification: Carcinogenic to Humans' }],
                  },
                },
              ],
            },
          ],
        },
      })
    })

    const results = await searchIRIS('benzene')
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0].casNumber).toBe('71-43-2')
    expect(results[0].chemicalName).toBe('Benzene')
    expect(results[0].oralRfD).toBeCloseTo(0.004)
    expect(results[0].inhalationRfC).toBeCloseTo(0.03)
    expect(results[0].hasIrisData).toBe(true)
    expect(results[0].criticalEffects).toContain('Immune')
    expect(results[0].cancerClassification).toBe('Carcinogenic')
    expect(results[0].url).toBeTruthy()
  })

  test('returns CAS even when chemical has no IRIS tox section', async () => {
    mockByUrl((url) => {
      if (url.includes('comptox.epa.gov')) {
        return jsonRes([
          { dtxsid: 'DTXSID5020108', searchWord: 'Aspirin', searchMatch: 'Approved Name' },
        ])
      }
      if (url.includes('/cids/')) {
        return jsonRes({ IdentifierList: { CID: [2244] } })
      }
      if (url.includes('/synonyms/')) {
        return jsonRes({
          InformationList: {
            Information: [{ Synonym: ['Aspirin', '50-78-2'] }],
          },
        })
      }
      return jsonRes({ Record: { Section: [] } })
    })

    const results = await searchIRIS('aspirin')
    expect(results[0].casNumber).toBe('50-78-2')
    expect(results[0].oralRfD).toBeNull()
    expect(results[0].hasIrisData).toBe(false)
  })

  test('returns empty array when nothing resolves', async () => {
    mockByUrl((url) => {
      if (url.includes('comptox.epa.gov')) return jsonRes([])
      if (url.includes('/cids/')) return jsonRes({}, 404)
      return jsonRes({}, 404)
    })
    expect(await searchIRIS('zzzz-unknown-chem')).toEqual([])
  })
})
