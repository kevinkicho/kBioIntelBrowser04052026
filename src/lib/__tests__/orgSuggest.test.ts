/**
 * @jest-environment node
 */

import { orgSuggestSourceLabel, searchOrgSuggestions } from '@/lib/orgs/orgSuggest'

jest.mock('@/lib/api/ror', () => ({
  searchRorOrganizations: jest.fn(async (q: string) => {
    if (q.toLowerCase().includes('harvard')) {
      return [
        {
          rorId: '00dvg7y05',
          idUrl: 'https://ror.org/00dvg7y05',
          name: 'Harvard University',
          aliases: [],
          types: ['education'],
          countryCode: 'US',
          countryName: 'United States',
          city: 'Cambridge',
          region: 'Massachusetts',
          website: null,
          wikipedia: null,
          established: null,
          status: 'active',
        },
      ]
    }
    return []
  }),
}))

jest.mock('@/lib/api/collegeScorecard', () => ({
  searchUsCollegesByName: jest.fn(async (q: string) => {
    if (q.toLowerCase().includes('harvard')) {
      return [
        {
          id: '166027',
          name: 'Harvard University',
          city: 'Cambridge',
          state: 'MA',
          ownership: 'Private nonprofit',
          scorecardUrl: 'https://collegescorecard.ed.gov/',
          source: 'scorecard',
        },
      ]
    }
    return []
  }),
}))

const openAlexHarvard = {
  openAlexId: 'I136199984',
  name: 'Harvard Medical School',
  countryCode: 'US',
  city: 'Boston',
  type: 'education',
  homepage: null,
  openAlexUrl: 'https://openalex.org/I136199984',
  region: '',
  rorId: null,
  worksCount: null,
  unitid: null,
}

jest.mock('@/lib/api/openAlexInstitutions', () => ({
  searchOpenAlexInstitutions: jest.fn(async () => [openAlexHarvard]),
  searchOpenAlexResearchLabs: jest.fn(async () => [openAlexHarvard]),
}))

describe('orgSuggest', () => {
  it('labels sources', () => {
    expect(orgSuggestSourceLabel('ror')).toBe('ROR')
    expect(orgSuggestSourceLabel('college')).toBe('Scorecard')
    expect(orgSuggestSourceLabel('openalex')).toBe('OpenAlex')
  })

  it('returns empty for short queries', async () => {
    expect(await searchOrgSuggestions('a')).toEqual([])
  })

  it('dedupes Harvard name and prefers ROR, keeps OpenAlex sibling', async () => {
    const rows = await searchOrgSuggestions('Harvard', { limit: 12 })
    expect(rows.length).toBeGreaterThanOrEqual(2)
    const names = rows.map((r) => r.name)
    // Harvard University only once (ROR wins over Scorecard)
    expect(names.filter((n) => n === 'Harvard University').length).toBe(1)
    expect(rows.find((r) => r.name === 'Harvard University')?.source).toBe('ror')
    expect(names).toContain('Harvard Medical School')
  })
})
