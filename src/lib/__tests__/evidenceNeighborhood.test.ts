/**
 * Evidence neighborhood — deterministic free-API joins.
 */

import { buildEvidenceNeighborhood } from '@/lib/evidenceNeighborhood'
import type { ClinicalTrial } from '@/lib/types'
import type { RorOrganization } from '@/lib/api/ror'
import type { CmsHospital } from '@/lib/api/cmsHospitals'
import type { UsCollege } from '@/lib/api/collegeScorecard'

function trial(overrides: Partial<ClinicalTrial> = {}): ClinicalTrial {
  return {
    nctId: 'NCT00000001',
    title: 'Example trial',
    status: 'RECRUITING',
    phase: 'Phase 2',
    startDate: '2020-01-01',
    completionDate: '',
    conditions: ['Amyloidosis'],
    interventions: ['Drug X'],
    sponsor: 'Acme Pharma',
    facilities: [{ name: 'Metro General', city: 'Boston', country: 'United States' }],
    ...overrides,
  }
}

function ror(overrides: Partial<RorOrganization> = {}): RorOrganization {
  return {
    rorId: '00abc',
    idUrl: 'https://ror.org/00abc',
    name: 'Example University',
    aliases: [],
    types: ['Education'],
    city: 'Cambridge',
    countryCode: 'US',
    countryName: 'United States',
    region: 'MA',
    website: null,
    wikipedia: null,
    established: null,
    status: 'active',
    matchSource: 'name',
    ...overrides,
  }
}

describe('buildEvidenceNeighborhood', () => {
  it('joins trials, ROR, hospitals, colleges, grants, and literature', () => {
    const hospitals: CmsHospital[] = [
      {
        facilityId: '220001',
        facilityName: 'Metro General Hospital',
        address: '1 Main St',
        city: 'Boston',
        state: 'MA',
        zip: '02115',
        phone: '',
        hospitalType: 'Acute Care',
        ownership: 'Voluntary',
        emergencyServices: 'Yes',
        overallRating: '4',
        careCompareUrl: 'https://www.medicare.gov/care-compare/',
      },
    ]
    const colleges: UsCollege[] = [
      {
        id: '166027',
        name: 'Harvard University',
        city: 'Cambridge',
        state: 'MA',
        zip: '02138',
        schoolUrl: null,
        ownership: 'Private nonprofit',
        predominantDegree: '4',
        studentSize: null,
        carnegieBasic: '',
        locale: '',
        scorecardUrl: 'https://collegescorecard.ed.gov/',
        source: 'scorecard',
      },
    ]

    const map = buildEvidenceNeighborhood({
      moleculeName: 'Tafamidis',
      clinicalTrials: [
        trial(),
        trial({
          nctId: 'NCT00000002',
          sponsor: 'Acme Pharma',
          facilities: [{ name: 'West Clinic', city: 'Seattle', country: 'United States' }],
        }),
      ],
      researchOrgs: [ror()],
      euResearchOrgs: [
        ror({
          rorId: '00eu',
          idUrl: 'https://ror.org/00eu',
          name: 'EU Research Centre',
          countryCode: 'DE',
          countryName: 'Germany',
          matchSource: 'eu-name',
        }),
      ],
      usHospitals: hospitals,
      usColleges: colleges,
      nihGrants: [
        { institute: 'NIA', title: 'Amyloid project A' },
        { institute: 'NIA', title: 'Amyloid project B' },
        { institute: 'NHLBI', title: 'Cardiac' },
      ],
      literature: [{ id: 1 }],
      pubmedArticles: [{ id: 2 }, { id: 3 }],
      openAlexWorks: [{ id: 4 }],
    })

    expect(map.ready).toBe(true)
    expect(map.stats.trialCount).toBe(2)
    expect(map.stats.uniqueSponsors).toBe(1)
    expect(map.stats.uniqueFacilities).toBe(2)
    expect(map.stats.rorOrgCount).toBe(2)
    expect(map.stats.hospitalCount).toBe(1)
    expect(map.stats.collegeCount).toBe(1)
    expect(map.stats.grantInstituteCount).toBe(2)
    expect(map.stats.literatureCount).toBe(4)
    expect(map.nodes.some((n) => n.kind === 'sponsor' && n.label === 'Acme Pharma')).toBe(true)
    expect(map.nodes.some((n) => n.kind === 'ror')).toBe(true)
    expect(map.nodes.some((n) => n.kind === 'hospital')).toBe(true)
    expect(map.nodes.some((n) => n.kind === 'grant-org' && n.label === 'NIA')).toBe(true)
    expect(map.edges.length).toBeGreaterThan(0)
  })

  it('returns honest notes when sparse', () => {
    const map = buildEvidenceNeighborhood({
      moleculeName: 'UnknownMol',
      clinicalTrials: [],
      researchOrgs: [],
    })
    expect(map.stats.trialCount).toBe(0)
    expect(map.notes.some((n) => /Load Clinical/i.test(n))).toBe(true)
    expect(map.ready).toBe(true)
  })
})
