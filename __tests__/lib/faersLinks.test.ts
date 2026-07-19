import {
  faersApiSearchUrl,
  faersEvidenceApiUrl,
  faersRowDeepLink,
} from '@/lib/faersLinks'

describe('faersLinks', () => {
  it('builds API search with reaction and drug', () => {
    const url = faersApiSearchUrl({ reaction: 'Nausea', drugName: 'Aspirin' })
    expect(url).toContain('api.fda.gov/drug/event.json')
    expect(url).toContain('reactionmeddrapt.exact')
    expect(url).toContain('Nausea')
    expect(url).toContain('Aspirin')
    expect(url).not.toContain('open.fda.gov/apis')
  })

  it('row deep link prefers human FAERS dashboard over raw JSON', () => {
    const href = faersRowDeepLink({
      reactionName: 'Headache',
      moleculeName: 'Aspirin',
    })
    expect(href).toContain('fis.fda.gov')
    expect(href).not.toContain('api.fda.gov')
  })

  it('evidence API URL still carries reaction + drug for secondary link', () => {
    const href = faersEvidenceApiUrl({
      reactionName: 'Headache',
      moleculeName: 'Aspirin',
    })
    expect(href).toContain('api.fda.gov')
    expect(href).toContain('Headache')
    expect(href).toContain('Aspirin')
  })

  it('falls back to dashboard when empty', () => {
    const href = faersRowDeepLink({})
    expect(href).toContain('fis.fda.gov')
  })
})
