import {
  ALGORITHM_CATALOG,
  PROMPT_CATALOG,
  PRODUCT_LAW_BULLETS,
  promptsBySurface,
} from '@/lib/methods/systemWiringCatalog'

describe('systemWiringCatalog', () => {
  test('every prompt declares non-rank path for Discover', () => {
    expect(PROMPT_CATALOG.every((p) => p.affectsDiscoverRank === false)).toBe(true)
  })

  test('discover rank algorithm is deterministic (no LLM)', () => {
    const rank = ALGORITHM_CATALOG.find((a) => a.id === 'discover_rank')
    expect(rank).toBeDefined()
    expect(rank!.usesLlm).toBe(false)
  })

  test('pack AI modes are listed', () => {
    const pack = promptsBySurface('pack_ai')
    expect(pack.length).toBeGreaterThanOrEqual(4)
    expect(pack.some((p) => p.id === 'pack_executive_brief')).toBe(true)
  })

  test('product law bullets present', () => {
    expect(PRODUCT_LAW_BULLETS.length).toBeGreaterThanOrEqual(4)
  })
})
