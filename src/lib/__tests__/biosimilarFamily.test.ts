/**
 * Biosimilar family navigator — pure join of Purple Book / BLA / BPPT / EMA bulk.
 */

import { buildBiosimilarFamily } from '@/lib/biosimilarFamily'
import type { PurpleBookProduct } from '@/lib/api/purpleBookCache'
import type { BiologicLicensedProduct } from '@/lib/api/biologicsLicensed'
import type { PurpleBookPatent } from '@/lib/api/purpleBookPatents'
import type { EmaBulkMedicine } from '@/lib/api/emaMedicinesBulk'

function pb(overrides: Partial<PurpleBookProduct> = {}): PurpleBookProduct {
  return {
    applicant: 'Example Biologics',
    blaNumber: 'BLA125057',
    proprietaryName: 'Humira',
    properName: 'adalimumab',
    licenseType: '351(a)',
    strength: '40 mg/0.8 mL',
    dosageForm: 'INJECTION',
    route: 'SUBCUTANEOUS',
    productPresentation: 'SINGLE-DOSE PREFILLED SYRINGE',
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

function bla(overrides: Partial<BiologicLicensedProduct> = {}): BiologicLicensedProduct {
  return {
    applicationNumber: 'BLA761024',
    sponsorName: 'Amgen',
    brandName: 'Amjevita',
    nonproprietaryName: 'adalimumab-atto',
    strength: '40 mg/0.8 mL',
    dosageForm: 'INJECTION',
    marketingStatus: 'Prescription',
    roleGuess: 'likely_biosimilar',
    approvalDate: '2016-09-23',
    drugsAtFdaUrl: 'https://www.accessdata.fda.gov/scripts/cder/daf/',
    purpleBookSearchUrl: 'https://purplebooksearch.fda.gov/',
    establishmentSearchUrl: 'https://www.accessdata.fda.gov/scripts/cder/daf/',
    ...overrides,
  }
}

describe('buildBiosimilarFamily', () => {
  it('classifies originator vs biosimilar vs interchangeable from Purple Book', () => {
    const family = buildBiosimilarFamily({
      moleculeName: 'adalimumab',
      purpleBookProducts: [
        pb(),
        pb({
          blaNumber: 'BLA761024',
          proprietaryName: 'Amjevita',
          properName: 'adalimumab-atto',
          licenseType: '351(k)',
          applicant: 'Amgen',
          approvalDate: '2016-09-23',
          refProductProperName: 'adalimumab',
          patentListProvided: 'No',
        }),
        pb({
          blaNumber: 'BLA761071',
          proprietaryName: 'Cyltezo',
          properName: 'adalimumab-adbm',
          licenseType: 'Interchangeable',
          applicant: 'Boehringer',
          approvalDate: '2017-08-25',
          refProductProperName: 'adalimumab',
          patentListProvided: 'No',
        }),
      ],
    })

    expect(family.ready).toBe(true)
    expect(family.stem.toLowerCase()).toContain('adalimumab')
    expect(family.originators.length).toBeGreaterThanOrEqual(1)
    expect(family.biosimilars.length).toBeGreaterThanOrEqual(1)
    expect(family.interchangeables.length).toBeGreaterThanOrEqual(1)
    expect(family.members.some((m) => m.source === 'purple-book')).toBe(true)
  })

  it('falls back to openFDA BLA heuristics when Purple Book empty', () => {
    const family = buildBiosimilarFamily({
      moleculeName: 'adalimumab',
      purpleBookProducts: [],
      biologicsLicensed: [
        bla({
          applicationNumber: 'BLA125057',
          brandName: 'Humira',
          nonproprietaryName: 'adalimumab',
          roleGuess: 'reference_or_originator',
        }),
        bla(),
      ],
    })

    expect(family.members.length).toBe(2)
    expect(family.members.every((m) => m.source === 'openfda-bla')).toBe(true)
    expect(family.notes.some((n) => /openFDA BLA/i.test(n))).toBe(true)
    expect(family.biosimilars.length).toBeGreaterThanOrEqual(1)
  })

  it('includes BPPT patents and EMA biosimilar dump rows', () => {
    const patents: PurpleBookPatent[] = [
      {
        blaNumber: 'BLA125057',
        applicant: 'AbbVie',
        patentNumber: '1234567',
        patentExpirationDate: '2030-01-01',
        proprietaryName: 'Humira',
        properName: 'adalimumab',
        usptoUrl: 'https://patents.google.com/',
        googlePatentsUrl: 'https://patents.google.com/patent/US1234567',
        purpleBookProductUrl: 'https://purplebooksearch.fda.gov/',
      },
    ]
    const ema: EmaBulkMedicine[] = [
      {
        name: 'Amgevita',
        inn: 'adalimumab',
        emaProductNumber: 'EMEA/H/C/004212',
        applicantHolder: 'Amgen',
        biosimilar: true,
        orphanMedicine: false,
        generic: false,
        advancedTherapy: false,
        conditionalApproval: false,
        medicineStatus: 'Authorised',
        atcCode: '',
        therapeuticArea: '',
        activeSubstance: 'adalimumab',
        marketingAuthorisationDate: '',
        emaUrl: '',
      },
    ]

    const family = buildBiosimilarFamily({
      moleculeName: 'Humira',
      purpleBookProducts: [pb()],
      purpleBookPatents: patents,
      emaBulkMedicines: ema,
    })

    expect(family.patents).toHaveLength(1)
    expect(family.patents[0].patentNumber).toBe('1234567')
    expect(family.emaBiosimilars).toHaveLength(1)
    expect(family.emaBiosimilars[0].name).toBe('Amgevita')
  })

  it('notes empty for small-molecule style names with no BLA rows', () => {
    const family = buildBiosimilarFamily({
      moleculeName: 'aspirin',
      purpleBookProducts: [],
      biologicsLicensed: [],
    })
    expect(family.members).toHaveLength(0)
    expect(family.ready).toBe(true)
    expect(family.notes.some((n) => /No BLA|Orange Book/i.test(n))).toBe(true)
  })
})
