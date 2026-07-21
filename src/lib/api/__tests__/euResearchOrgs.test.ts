/**
 * @jest-environment node
 */

import { searchEuResearchOrgsByCountry, EU_CORE_RESEARCH_COUNTRIES } from '../euResearchOrgs'

jest.mock('../ror', () => ({
  searchRorOrganizations: jest.fn(async (q: string, opts?: { types?: string[]; countryCode?: string }) => {
    if (opts?.countryCode !== 'DE') return []
    return [
      {
        rorId: 'test-de-1',
        idUrl: 'https://ror.org/test-de-1',
        name: `DE ${opts?.types?.[0] || 'org'} ${q}`,
        aliases: [],
        types: opts?.types || [],
        countryCode: 'DE',
        countryName: 'Germany',
        city: 'Berlin',
        region: '',
        website: null,
        wikipedia: null,
        established: null,
        status: 'active',
      },
    ]
  }),
}))

describe('euResearchOrgs', () => {
  it('lists core EU countries', () => {
    expect(EU_CORE_RESEARCH_COUNTRIES).toContain('DE')
    expect(EU_CORE_RESEARCH_COUNTRIES).toContain('FR')
  })

  it('merges type filters for one country', async () => {
    const rows = await searchEuResearchOrgsByCountry('Pasteur', 'DE', 10)
    expect(rows.length).toBeGreaterThanOrEqual(1)
    expect(rows.every((r) => r.countryCode === 'DE' || r.matchSource?.startsWith('eu:'))).toBe(true)
  })
})
