import {
  CATEGORIES,
  getCategoryDataCounts,
  CategoryId,
  CategoryDataCount,
  PanelDef,
  CategoryDef,
} from '@/lib/categoryConfig'

describe('categoryConfig', () => {
  describe('CATEGORIES', () => {
    it('defines exactly 10 categories', () => {
      expect(CATEGORIES).toHaveLength(10)
    })

    it('contains 119 total panels across all categories', () => {
      const totalPanels = CATEGORIES.reduce(
        (sum, cat) => sum + cat.panels.length,
        0
      )
      expect(totalPanels).toBe(119)
    })

    it('has no duplicate panel IDs', () => {
      const allIds = CATEGORIES.flatMap((cat) => cat.panels.map((p) => p.id))
      const uniqueIds = new Set(allIds)
      expect(uniqueIds.size).toBe(allIds.length)
    })

    it('has no duplicate category IDs', () => {
      const catIds = CATEGORIES.map((cat) => cat.id)
      const uniqueIds = new Set(catIds)
      expect(uniqueIds.size).toBe(catIds.length)
    })

    it('each category has id, label, icon, and panels', () => {
      for (const cat of CATEGORIES) {
        expect(cat.id).toBeDefined()
        expect(cat.label).toBeDefined()
        expect(cat.icon).toBeDefined()
        expect(cat.panels.length).toBeGreaterThan(0)
      }
    })

    it('each panel has id, title, propKey, and isNullable', () => {
      for (const cat of CATEGORIES) {
        for (const panel of cat.panels) {
          expect(panel.id).toBeDefined()
          expect(panel.title).toBeDefined()
          expect(panel.propKey).toBeDefined()
          expect(typeof panel.isNullable).toBe('boolean')
        }
      }
    })
  })

  describe('getCategoryDataCounts', () => {
    it('counts array props with data correctly', () => {
      const props: Record<string, unknown> = {
        companies: [{ name: 'Pfizer' }],
        ndcProducts: [],
        orangeBookEntries: [],
        drugPrices: [],
        drugInteractions: [],
        drugLabels: [],
        atcClassifications: [],
      }
      const counts = getCategoryDataCounts(props)
      expect(counts['pharmaceutical'].withData).toBe(1)
      expect(counts['pharmaceutical'].total).toBe(11)
    })

    it('counts nullable props with data correctly', () => {
      const props: Record<string, unknown> = {
        computedProperties: { mw: 100 },
        ghsHazards: null,
        chebiAnnotation: undefined,
        compToxData: { toxicity: 'low' },
        routes: [{ step: 1 }],
      }
      const counts = getCategoryDataCounts(props)
      expect(counts['molecular-chemical'].withData).toBe(3)
      expect(counts['molecular-chemical'].total).toBe(15)
    })

    it('returns zero withData when all props are empty', () => {
      const props: Record<string, unknown> = {}
      const counts = getCategoryDataCounts(props)
      for (const cat of CATEGORIES) {
        expect(counts[cat.id as CategoryId].withData).toBe(0)
      }
    })

    it('returns correct totals for all categories', () => {
      const props: Record<string, unknown> = {}
      const counts = getCategoryDataCounts(props)
      for (const cat of CATEGORIES) {
        expect(counts[cat.id as CategoryId].total).toBe(cat.panels.length)
      }
    })
  })
})
