import {
  buildDiscoverHref,
  parseTargetsParam,
  MAX_DISCOVER_TARGETS,
} from '@/lib/discovery/discoverUrl'

describe('parseTargetsParam', () => {
  it('returns empty for null/blank', () => {
    expect(parseTargetsParam(null)).toEqual([])
    expect(parseTargetsParam('')).toEqual([])
    expect(parseTargetsParam('  ')).toEqual([])
  })

  it('splits on comma, plus, or pipe', () => {
    expect(parseTargetsParam('EGFR,BRCA1')).toEqual(['EGFR', 'BRCA1'])
    expect(parseTargetsParam('EGFR+BRCA1|TP53')).toEqual(['EGFR', 'BRCA1', 'TP53'])
  })

  it('dedupes case-insensitively (first wins)', () => {
    expect(parseTargetsParam('EGFR,egfr,Egfr')).toEqual(['EGFR'])
  })

  it(`caps at ${MAX_DISCOVER_TARGETS}`, () => {
    const many = Array.from({ length: 15 }, (_, i) => `G${i}`).join(',')
    expect(parseTargetsParam(many)).toHaveLength(MAX_DISCOVER_TARGETS)
  })
})

describe('buildDiscoverHref', () => {
  it('returns bare /discover with no params', () => {
    expect(buildDiscoverHref()).toBe('/discover')
    expect(buildDiscoverHref({})).toBe('/discover')
  })

  it('includes q and diseaseId', () => {
    expect(
      buildDiscoverHref({ q: 'Alzheimer disease', diseaseId: 'EFO_0000249' }),
    ).toBe('/discover?q=Alzheimer+disease&diseaseId=EFO_0000249')
  })

  it('includes targets as comma-joined list', () => {
    expect(
      buildDiscoverHref({
        q: 'breast cancer',
        diseaseId: 'EFO_0000305',
        targets: ['BRCA1', 'BRCA2'],
      }),
    ).toBe(
      '/discover?q=breast+cancer&diseaseId=EFO_0000305&targets=BRCA1%2CBRCA2',
    )
  })

  it('accepts targets string', () => {
    expect(buildDiscoverHref({ targets: 'EGFR' })).toBe('/discover?targets=EGFR')
  })

  it('gene-only CTA omits disease fields', () => {
    expect(buildDiscoverHref({ targets: ['TP53'] })).toBe('/discover?targets=TP53')
  })
})
