import {
  filterMoleculeSuggestionLabels,
  isDatabaseIdNoise,
  looksLikeGeneSymbol,
} from '@/lib/search/entityHints'

describe('entityHints', () => {
  it('flags WikiPathways WP1220 as noise, not a gene', () => {
    expect(isDatabaseIdNoise('WP1220')).toBe(true)
    expect(looksLikeGeneSymbol('WP1220')).toBe(false)
    expect(looksLikeGeneSymbol('wp1220')).toBe(false)
  })

  it('still recognizes real gene symbols', () => {
    expect(looksLikeGeneSymbol('TP53')).toBe(true)
    expect(looksLikeGeneSymbol('BRCA1')).toBe(true)
    expect(looksLikeGeneSymbol('HLA-A')).toBe(true)
  })

  it('filters pathway ids from molecule suggestions', () => {
    expect(
      filterMoleculeSuggestionLabels(['Aspirin', 'WP1220', 'R-HSA-123', 'Imatinib']),
    ).toEqual(['Aspirin', 'Imatinib'])
  })
})
