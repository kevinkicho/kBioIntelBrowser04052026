import {
  dailyMedNdcSearchUrl,
  ndcProductDeepLink,
  normalizeProductNdc,
  openFdaNdcApiUrl,
} from '@/lib/ndcLinks'

describe('ndcLinks', () => {
  it('normalizes product NDC', () => {
    expect(normalizeProductNdc('0002-3227')).toBe('0002-3227')
    expect(normalizeProductNdc('')).toBeNull()
  })

  it('builds openFDA exact product_ndc query', () => {
    const url = openFdaNdcApiUrl('0002-3227')
    expect(url).toContain('api.fda.gov/drug/ndc.json')
    expect(url).toContain('product_ndc')
    expect(url).toContain('0002-3227')
  })

  it('row deep link prefers openFDA over DailyMed', () => {
    const href = ndcProductDeepLink({
      productNdc: '0002-3227',
      brandName: 'PROZAC',
      url: 'https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=0002-3227',
    })
    expect(href).toContain('api.fda.gov/drug/ndc.json')
    expect(href).toContain('0002-3227')
  })

  it('dailyMed NDC search', () => {
    expect(dailyMedNdcSearchUrl('0002-3227')).toContain('dailymed')
    expect(dailyMedNdcSearchUrl('0002-3227')).toContain('0002-3227')
  })
})
