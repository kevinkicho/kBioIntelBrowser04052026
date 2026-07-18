import {
  emptyDataClass,
  isEmptyMetric,
  panelHasData,
  summaryCardHasData,
} from '@/lib/summaryEmpty'

describe('summaryEmpty helpers', () => {
  test('isEmptyMetric covers zeros and placeholders', () => {
    expect(isEmptyMetric(0)).toBe(true)
    expect(isEmptyMetric(null)).toBe(true)
    expect(isEmptyMetric('—')).toBe(true)
    expect(isEmptyMetric(10)).toBe(false)
    expect(isEmptyMetric('P1: 2')).toBe(false)
  })

  test('summaryCardHasData', () => {
    expect(
      summaryCardHasData({ primaryValue: 0, secondaryMetrics: [{ value: 0 }] }),
    ).toBe(false)
    expect(
      summaryCardHasData({ primaryValue: 0, secondaryMetrics: [{ value: 1 }] }),
    ).toBe(true)
    expect(summaryCardHasData({ primaryValue: 5, secondaryMetrics: [] })).toBe(true)
  })

  test('panelHasData', () => {
    expect(panelHasData([])).toBe(false)
    expect(panelHasData(null)).toBe(false)
    expect(panelHasData([{ id: 1 }])).toBe(true)
    expect(panelHasData({})).toBe(false)
    expect(panelHasData({ a: 1 })).toBe(true)
  })

  test('emptyDataClass', () => {
    expect(emptyDataClass(true)).toBe('opacity-20')
    expect(emptyDataClass(false)).toBe('')
  })
})
