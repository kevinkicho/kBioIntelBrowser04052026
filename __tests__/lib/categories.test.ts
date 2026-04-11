import { CATEGORIES, getCategoryBySlug } from '@/lib/data/categories'

describe('CATEGORIES', () => {
  test('contains 5 categories', () => {
    expect(Object.keys(CATEGORIES)).toHaveLength(5)
  })

  test('each category has title, description, and molecules array', () => {
    for (const slug of Object.keys(CATEGORIES)) {
      const cat = CATEGORIES[slug]
      expect(cat.title).toBeTruthy()
      expect(cat.description).toBeTruthy()
      expect(Array.isArray(cat.molecules)).toBe(true)
      expect(cat.molecules.length).toBeGreaterThan(0)
    }
  })
})

describe('getCategoryBySlug', () => {
  test('returns category for valid slug', () => {
    const cat = getCategoryBySlug('therapeutics')
    expect(cat).toBeDefined()
    expect(cat?.title).toBe('Therapeutics')
  })

  test('returns undefined for invalid slug', () => {
    const cat = getCategoryBySlug('nonexistent')
    expect(cat).toBeUndefined()
  })
})
