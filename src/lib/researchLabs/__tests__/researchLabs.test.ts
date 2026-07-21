/**
 * Research-lab dossier: pure build + claim extract + pack.
 */

import { buildResearchLabDossier } from '@/lib/researchLabs/buildDossier'
import {
  extractClaimsFromResearchLabDossier,
  researchLabDossierToEvidencePack,
  RESEARCH_LAB_SOURCE,
} from '@/lib/researchLabs/extractClaims'
import type { RorOrganization } from '@/lib/api/ror'
import type { OpenAlexInstitution } from '@/lib/api/openAlexInstitutions'
import type { UsCollege } from '@/lib/api/collegeScorecard'

function ror(name: string, id = '00h'): RorOrganization {
  return {
    rorId: id,
    idUrl: `https://ror.org/${id}`,
    name,
    aliases: [],
    types: ['Education'],
    city: 'Cambridge',
    countryCode: 'US',
    countryName: 'United States',
    region: 'MA',
    website: null,
    wikipedia: null,
    established: 1636,
    status: 'active',
    matchSource: 'query',
  }
}

describe('researchLabs', () => {
  it('builds dossier with stats and kind university', () => {
    const oa: OpenAlexInstitution = {
      openAlexId: 'I123',
      name: 'Harvard University',
      type: 'education',
      countryCode: 'US',
      city: 'Cambridge',
      region: 'MA',
      rorId: '00h',
      homepage: null,
      worksCount: 1000,
      unitid: null,
      openAlexUrl: 'https://openalex.org/I123',
    }
    const colleges: UsCollege[] = [
      {
        id: '166027',
        name: 'Harvard University',
        city: 'Cambridge',
        state: 'MA',
        zip: '',
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

    const dossier = buildResearchLabDossier({
      query: 'Harvard',
      rorOrgs: [ror('Harvard University')],
      openAlexInstitutions: [oa],
      colleges,
      grants: [
        {
          projectNumber: 'R01X',
          title: 'Example grant',
          institute: 'Harvard University',
          piName: 'A. PI',
          fundingAmount: 1,
          startDate: '',
          endDate: '',
        },
      ],
      builtAt: '2026-07-21T00:00:00.000Z',
    })

    expect(dossier.ready).toBe(true)
    expect(dossier.name).toMatch(/Harvard/)
    expect(dossier.kind).toBe('university')
    expect(dossier.stats.rorCount).toBe(1)
    expect(dossier.stats.openAlexCount).toBe(1)
    expect(dossier.stats.grantCount).toBe(1)
    expect(dossier.stats.totalWorksHint).toBe(1000)
    expect(dossier.deepLinks.length).toBeGreaterThan(0)
  })

  it('extracts claim-bound facts and builds evidence pack', () => {
    const dossier = buildResearchLabDossier({
      query: 'MIT',
      rorOrgs: [ror('Massachusetts Institute of Technology', '00mit')],
      grants: [
        {
          projectNumber: 'R01Y',
          title: 'MIT project',
          institute: 'MIT',
          piName: 'B. PI',
          fundingAmount: 2,
          startDate: '',
          endDate: '',
        },
      ],
      builtAt: '2026-07-21T00:00:00.000Z',
    })

    const claims = extractClaimsFromResearchLabDossier(dossier)
    expect(claims.length).toBeGreaterThan(2)
    expect(claims.every((c) => c.provenance.source === RESEARCH_LAB_SOURCE)).toBe(true)
    expect(claims.every((c) => c.claimType === 'other')).toBe(true)
    expect(claims.every((c) => c.provenance.retrievedAt)).toBeTruthy()

    const pack = researchLabDossierToEvidencePack(dossier)
    expect(pack.claimCount).toBe(claims.length)
    expect(pack.title).toMatch(/research-lab dossier/i)
    expect(pack.contentHash).toBeTruthy()
  })
})
