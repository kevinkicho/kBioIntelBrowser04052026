/**
 * Landscape dual strip + watchlist density pure builders.
 */

import { buildLandscapeDualStrip } from '@/lib/landscapeDualStrip'
import {
  buildWatchlistDensity,
  watchlistDensityToCsv,
  emptyWatchlistDensity,
} from '@/lib/watchlistSummary'
import type { ClinicalTrial } from '@/lib/types'
import type { PurpleBookProduct } from '@/lib/api/purpleBookCache'
import type { BiologicLicensedProduct } from '@/lib/api/biologicsLicensed'
import type { HealthCanadaDpdProduct } from '@/lib/api/healthCanadaDpd'
import type { RorOrganization } from '@/lib/api/ror'

function pb(overrides: Partial<PurpleBookProduct> = {}): PurpleBookProduct {
  return {
    applicant: 'AbbVie',
    blaNumber: 'BLA125057',
    proprietaryName: 'Humira',
    properName: 'adalimumab',
    licenseType: '351(a)',
    strength: '40 mg',
    dosageForm: 'INJECTION',
    route: 'SC',
    productPresentation: 'PFS',
    marketingStatus: 'Rx',
    licensure: 'Licensed',
    approvalDate: '2002-12-31',
    interApprovalDate: '',
    refProductProperName: '',
    refProductProprietaryName: '',
    center: 'CDER',
    patentListProvided: 'Yes',
    sourceMonth: '2026-06',
    purpleBookUrl: 'https://purplebooksearch.fda.gov/',
    drugsAtFdaUrl: 'https://www.accessdata.fda.gov/scripts/cder/daf/',
    ...overrides,
  }
}

describe('buildLandscapeDualStrip', () => {
  it('builds family + neighborhood chips and US/CA jurisdictions', () => {
    const trials: ClinicalTrial[] = [
      {
        nctId: 'NCT1',
        title: 'T',
        status: 'RECRUITING',
        phase: 'Phase 2',
        startDate: '',
        completionDate: '',
        conditions: [],
        interventions: [],
        sponsor: 'Acme',
        facilities: [{ name: 'Site A', city: 'Boston', country: 'US' }],
      },
    ]
    const ror: RorOrganization[] = [
      {
        rorId: '00x',
        idUrl: 'https://ror.org/00x',
        name: 'Test U',
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
      },
    ]
    const hc: HealthCanadaDpdProduct[] = [
      {
        drugCode: 1,
        din: '12345678',
        brandName: 'Humira',
        companyName: 'AbbVie',
        className: 'Human',
        descriptor: '',
        numberOfAis: '1',
        lastUpdateDate: '',
        status: 'Marketed',
        historyDate: '',
        originalMarketDate: '',
        forms: [],
        routes: [],
        ingredients: [],
        url: 'https://health-products.canada.ca/',
      },
    ]

    const strip = buildLandscapeDualStrip({
      moleculeName: 'adalimumab',
      purpleBookProducts: [
        pb(),
        pb({
          blaNumber: 'BLA761024',
          proprietaryName: 'Amjevita',
          properName: 'adalimumab-atto',
          licenseType: '351(k)',
          refProductProperName: 'adalimumab',
        }),
      ],
      clinicalTrials: trials,
      researchOrgs: ror,
      healthCanadaProducts: hc,
      internationalRegulatorLinks: [
        {
          id: 'mhra',
          label: 'MHRA products',
          region: 'UK',
          description: 'UK portal',
          url: 'https://products.mhra.gov.uk/',
          kind: 'search',
        },
      ],
    })

    expect(strip.ready).toBe(true)
    expect(strip.hasSignal).toBe(true)
    expect(strip.family.biosimilars).toBeGreaterThanOrEqual(1)
    expect(strip.neighborhood.trialCount).toBe(1)
    expect(strip.neighborhood.sponsors).toBe(1)
    expect(strip.neighborhood.rorOrgs).toBe(1)
    expect(strip.familyChips.some((c) => c.id === 'biosimilars')).toBe(true)
    expect(strip.neighborhoodChips.some((c) => c.id === 'sponsors')).toBe(true)
    expect(strip.jurisdictions.some((j) => j.id === 'us')).toBe(true)
    expect(strip.jurisdictions.some((j) => j.id === 'ca')).toBe(true)
    expect(strip.jurisdictions.some((j) => j.id === 'mhra')).toBe(true)
  })

  it('returns empty signal notes when no data', () => {
    const strip = buildLandscapeDualStrip({ moleculeName: 'aspirin' })
    expect(strip.hasSignal).toBe(false)
    expect(strip.notes.length).toBeGreaterThan(0)
  })
})

describe('buildWatchlistDensity', () => {
  it('aggregates free category bags', () => {
    const density = buildWatchlistDensity({
      pharma: {
        companies: [{ name: 'A' }],
        biologicsLicensed: [
          { roleGuess: 'likely_biosimilar' },
          { roleGuess: 'reference_or_originator' },
        ] as BiologicLicensedProduct[],
        purpleBookProducts: [pb({ licenseType: '351(k)' })],
        healthCanadaProducts: [{ din: '1' }],
        emaBulkMedicines: [{ name: 'X', biosimilar: true }],
      },
      clinical: {
        clinicalTrials: [
          { sponsor: 'Acme' },
          { sponsor: 'Acme' },
          { sponsor: 'Beta' },
        ],
        adverseEvents: [{ id: 1 }, { id: 2 }],
        researchOrgs: [{ rorId: '1' }],
      },
      research: {
        patents: [{ id: 1 }],
        literature: [{ id: 1 }, { id: 2 }, { id: 3 }],
        nihGrants: [{ institute: 'NIA' }],
        euResearchOrgs: [{ rorId: '2' }],
      },
    })

    expect(density.approvedProducts).toBe(1)
    expect(density.activeTrials).toBe(3)
    expect(density.sponsorCount).toBe(2)
    expect(density.adverseEvents).toBe(2)
    expect(density.blaCount).toBe(2)
    expect(density.biosimilarCount).toBeGreaterThanOrEqual(1)
    expect(density.rorCount).toBe(2)
    expect(density.grantCount).toBe(1)
    expect(density.healthCanadaCount).toBe(1)
    expect(density.emaCount).toBe(1)
    expect(density.publications).toBe(3)
  })

  it('exports CSV header and rows', () => {
    const csv = watchlistDensityToCsv([
      { cid: 1, name: 'Aspirin', summary: emptyWatchlistDensity() },
      { cid: 2, name: 'Has, comma', summary: { ...emptyWatchlistDensity(), activeTrials: 4 } },
    ])
    expect(csv.split('\n')[0]).toContain('cid')
    expect(csv).toContain('Aspirin')
    expect(csv).toContain('"Has, comma"')
    expect(csv).toContain(',4,')
  })
})
