import {
  doiUrl,
  normalizeDoi,
  openAlexWorkDeepLink,
  openAlexWorkPageUrl,
} from '@/lib/openalexLinks'

describe('openalexLinks', () => {
  it('normalizes DOI', () => {
    expect(normalizeDoi('https://doi.org/10.1234/x')).toBe('10.1234/x')
    expect(normalizeDoi('doi:10.1234/x')).toBe('10.1234/x')
  })

  it('builds openalex.org work page from id', () => {
    expect(openAlexWorkPageUrl('https://openalex.org/W2741809807')).toBe(
      'https://openalex.org/W2741809807',
    )
    expect(openAlexWorkPageUrl('https://api.openalex.org/W2741809807')).toBe(
      'https://openalex.org/W2741809807',
    )
    expect(openAlexWorkPageUrl('W2741809807')).toBe('https://openalex.org/W2741809807')
  })

  it('prefers DOI for review deep link', () => {
    expect(
      openAlexWorkDeepLink({
        workId: 'W1',
        doi: '10.1234/test',
      }),
    ).toBe('https://doi.org/10.1234/test')
  })

  it('falls back to OpenAlex page', () => {
    expect(openAlexWorkDeepLink({ workId: 'W99' })).toBe('https://openalex.org/W99')
  })

  it('doiUrl helper', () => {
    expect(doiUrl('10.1/x')).toBe('https://doi.org/10.1/x')
  })
})
