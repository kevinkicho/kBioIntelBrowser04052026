import {
  buildOrgAffiliationJoins,
  parseSponsorHints,
  tokenOverlapScore,
  normalizeAffiliationTokens,
} from '@/lib/orgAffiliationJoin'
import type { RorOrganization } from '@/lib/api/ror'
import type { CmsHospital } from '@/lib/api/cmsHospitals'
import type { UsCollege } from '@/lib/api/collegeScorecard'

function ror(name: string, id = '00x'): RorOrganization {
  return {
    rorId: id,
    idUrl: `https://ror.org/${id}`,
    name,
    aliases: [],
    types: ['Education'],
    city: 'Boston',
    countryCode: 'US',
    countryName: 'United States',
    region: 'MA',
    website: null,
    wikipedia: null,
    established: null,
    status: 'active',
  }
}

describe('orgAffiliationJoin', () => {
  it('tokenizes and scores overlaps', () => {
    expect(normalizeAffiliationTokens('Mayo Clinic Hospital').length).toBeGreaterThan(0)
    expect(tokenOverlapScore('Mayo Clinic', 'Mayo Clinic Rochester')).toBeGreaterThan(0.3)
    expect(tokenOverlapScore('Pfizer Inc', 'Totally Unrelated Org')).toBe(0)
  })

  it('joins sponsors to ROR and ROR to hospitals/colleges', () => {
    const hospitals: CmsHospital[] = [
      {
        facilityId: '1',
        facilityName: 'Massachusetts General Hospital',
        address: '',
        city: 'Boston',
        state: 'MA',
        zip: '',
        phone: '',
        hospitalType: 'Acute',
        ownership: '',
        emergencyServices: 'Yes',
        overallRating: '5',
        careCompareUrl: 'https://www.medicare.gov/care-compare/',
      },
    ]
    const colleges: UsCollege[] = [
      {
        id: '1',
        name: 'Harvard University',
        city: 'Cambridge',
        state: 'MA',
        zip: '',
        schoolUrl: null,
        ownership: 'Private',
        predominantDegree: '4',
        studentSize: null,
        carnegieBasic: '',
        locale: '',
        scorecardUrl: 'https://collegescorecard.ed.gov/',
      },
    ]

    const { edges, notes } = buildOrgAffiliationJoins({
      sponsors: [{ name: 'Harvard Medical School', count: 2 }],
      rorOrgs: [ror('Harvard University', '00harv'), ror('Massachusetts General Hospital', '00mgh')],
      hospitals,
      colleges,
    })

    expect(edges.some((e) => e.kind === 'sponsor-ror')).toBe(true)
    expect(edges.some((e) => e.kind === 'ror-hospital' || e.kind === 'ror-college')).toBe(true)
    expect(notes.length).toBeGreaterThan(0)
  })

  it('parses sponsor paste text', () => {
    expect(parseSponsorHints('Pfizer\nNovartis, Roche').map((s) => s.name)).toEqual([
      'Pfizer',
      'Novartis',
      'Roche',
    ])
  })
})
