/**
 * @jest-environment node
 */

import {
  clearPurpleBookMemoryCache,
  isPurpleBookBiosimilarLicense,
  isPurpleBookInterchangeableLicense,
  parsePurpleBookCsv,
  purpleBookCandidateMonths,
  purpleBookCsvUrl,
} from '../purpleBookCache'

const SAMPLE = `Purple Book Monthly Historical Data Changes Report - June 2026,,,,,,,,
,,,,,,,,
N/R/U,Applicant,BLA Number,Proprietary Name,Proper Name,License Type,Strength,Dosage Form,Route of Administration,Product Presentation,Marketing Status,Licensure,Approval Date,Inter. Approval Date,Ref. Product Proper Name,Ref. Product Proprietary Name,Supplement Number,Submission Type,Inter. Supplement Number,License Number,Product Number,Center,Date of First Licensure,Exclusivity Expiration Date,First Interchangeable Exclusivity Exp. Date,Ref. Product Exclusivity Exp. Date,Orphan Exclusivity Exp. Date,Patent List Provided
,AbbVie Inc.,125057,Humira,adalimumab,351(a),40MG/0.8ML,Injection,Subcutaneous,Autoinjector,Rx,Licensed,31-Dec-02,,N/A,N/A,,Original,,1889,001,CDER,,,,,24-Feb-28,YES
,Amgen Inc.,761024,Amjevita,adalimumab-atto,351(k) Interchangeable,40MG/0.8ML,Injection,Subcutaneous,Pre-Filled Syringe,Rx,Licensed,23-Sep-16,20-Aug-24,adalimumab,Humira,,Original,19,1080,002,CDER,,,,,,
N,Accord BioPharma Inc.,761027,Filkri,filgrastim-laha,351(k) Biosimilar,300MCG/0.5ML,Injection,Subcutaneous,Pre-Filled Syringe,Rx,Licensed,15-Jan-26,,filgrastim,Neupogen,,Original,,2105,001,CDER,,,,,,
`

describe('purpleBookCache', () => {
  beforeEach(() => clearPurpleBookMemoryCache())

  it('builds candidate months newest-first', () => {
    const c = purpleBookCandidateMonths(new Date('2026-06-15T00:00:00Z'), 3)
    expect(c[0]).toEqual({ year: 2026, month: 'june' })
    expect(c[1].month).toBe('may')
    expect(purpleBookCsvUrl(2026, 'june')).toMatch(/purplebook-search-june-data-download\.csv/)
  })

  it('parses official license types and BLA numbers', () => {
    const cat = parsePurpleBookCsv(SAMPLE, '2026-06', 'https://example.test/pb.csv')
    expect(cat.products.length).toBe(3)
    const humira = cat.products.find((p) => p.proprietaryName === 'Humira')
    const amj = cat.products.find((p) => p.proprietaryName === 'Amjevita')
    expect(humira?.blaNumber).toBe('BLA125057')
    expect(humira?.licenseType).toBe('351(a)')
    expect(amj?.licenseType).toMatch(/Interchangeable/i)
    expect(amj?.refProductProprietaryName).toBe('Humira')
    expect(isPurpleBookBiosimilarLicense(amj!.licenseType)).toBe(true)
    expect(isPurpleBookInterchangeableLicense(amj!.licenseType)).toBe(true)
    expect(isPurpleBookBiosimilarLicense('351(a)')).toBe(false)
  })
})
