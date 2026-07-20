import { buildEstablishmentDeepLinks } from '../establishmentDeepLinks'

describe('establishmentDeepLinks', () => {
  it('includes DRLS and FEI portals', () => {
    const links = buildEstablishmentDeepLinks('AbbVie Inc.')
    const ids = links.map((l) => l.id)
    expect(ids).toContain('drls')
    expect(ids).toContain('fei-portal')
    expect(ids).toContain('fda-data-dashboard')
    expect(links.some((l) => l.url.includes('datadashboard.fda.gov'))).toBe(true)
  })

  it('works with empty firm', () => {
    const links = buildEstablishmentDeepLinks('')
    expect(links.length).toBeGreaterThan(0)
  })
})
