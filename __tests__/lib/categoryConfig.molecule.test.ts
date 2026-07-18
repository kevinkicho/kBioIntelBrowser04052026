import {
  CATEGORIES,
  MOLECULE_CATEGORIES,
  MOLECULE_CATEGORY_IDS,
} from '@/lib/categoryConfig'

describe('molecule vs gene categories', () => {
  it('MOLECULE_CATEGORY_IDS excludes gene explorer category', () => {
    expect(MOLECULE_CATEGORY_IDS).not.toContain('gene')
    expect(MOLECULE_CATEGORY_IDS).toHaveLength(9)
    expect(CATEGORIES.some((c) => c.id === 'gene')).toBe(true)
    expect(MOLECULE_CATEGORIES.every((c) => c.id !== 'gene')).toBe(true)
  })
})
