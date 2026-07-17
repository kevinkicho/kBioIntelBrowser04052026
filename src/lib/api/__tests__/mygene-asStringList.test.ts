import { asStringList } from '@/lib/api/mygene'

describe('asStringList (MyGene scalar-or-array fields)', () => {
  test('null/undefined → []', () => {
    expect(asStringList(null)).toEqual([])
    expect(asStringList(undefined)).toEqual([])
  })

  test('single string → one-element array (MyGene alias shape)', () => {
    expect(asStringList('37LRP')).toEqual(['37LRP'])
  })

  test('array of strings', () => {
    expect(asStringList(['a', 'b'])).toEqual(['a', 'b'])
  })

  test('empty string → []', () => {
    expect(asStringList('')).toEqual([])
    expect(asStringList('  ')).toEqual([])
  })
})
