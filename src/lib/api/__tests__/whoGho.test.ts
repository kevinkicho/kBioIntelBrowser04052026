/**
 * @jest-environment node
 */

import { searchWhoGhoIndicators, getWhoGhoIndicatorFacts } from '../whoGho'

describe('whoGho', () => {
  it('returns empty for short query', async () => {
    await expect(searchWhoGhoIndicators('x')).resolves.toEqual([])
  })

  it('parses indicator search payload', async () => {
    // @ts-expect-error test mock
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        value: [
          { IndicatorCode: 'WHOSIS_000001', IndicatorName: 'Life expectancy at birth' },
        ],
      }),
    }))
    const rows = await searchWhoGhoIndicators('Life expectancy')
    expect(rows[0].code).toBe('WHOSIS_000001')
  })

  it('parses indicator facts', async () => {
    // @ts-expect-error test mock
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        value: [
          {
            IndicatorCode: 'WHOSIS_000001',
            SpatialDim: 'USA',
            TimeDim: 2019,
            Value: '78.5',
            NumericValue: 78.5,
            Dim1: 'MLE',
          },
        ],
      }),
    }))
    const facts = await getWhoGhoIndicatorFacts('WHOSIS_000001')
    expect(facts[0].spatialDim).toBe('USA')
    expect(facts[0].numericValue).toBe(78.5)
  })
})
