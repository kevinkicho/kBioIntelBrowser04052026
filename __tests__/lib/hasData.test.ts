import { payloadHasData } from '@/lib/hasData'

describe('payloadHasData', () => {
  test('arrays', () => {
    expect(payloadHasData([])).toBe(false)
    expect(payloadHasData([1])).toBe(true)
  })

  test('nullish', () => {
    expect(payloadHasData(null)).toBe(false)
    expect(payloadHasData(undefined)).toBe(false)
  })

  test('empty object wrappers count as no data', () => {
    expect(payloadHasData({ associations: [] })).toBe(false)
    expect(payloadHasData({ data: { studies: [] }, source: 'X', timestamp: 't' })).toBe(false)
    expect(payloadHasData({ sideEffects: [] })).toBe(false)
  })

  test('objects with nested data count as has data', () => {
    expect(payloadHasData({ associations: [{ id: 1 }] })).toBe(true)
    expect(payloadHasData({ data: { studies: [{ id: 'a' }] }, source: 'X' })).toBe(true)
  })

  test('primitives', () => {
    expect(payloadHasData('')).toBe(false)
    expect(payloadHasData('ok')).toBe(true)
    expect(payloadHasData(0)).toBe(true)
    expect(payloadHasData(false)).toBe(true)
  })
})
