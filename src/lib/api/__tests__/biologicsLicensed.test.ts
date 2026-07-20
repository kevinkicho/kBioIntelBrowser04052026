/**
 * @jest-environment node
 */

import {
  getBiologicsLicensedByName,
  guessBiologicRole,
  looksLikeUsBiosimilarName,
  nonproprietaryCore,
} from '../biologicsLicensed'

describe('biologicsLicensed helpers', () => {
  it('detects US 4-letter biosimilar suffixes', () => {
    expect(looksLikeUsBiosimilarName('adalimumab-atto')).toBe(true)
    expect(looksLikeUsBiosimilarName('ADALIMUMAB-ADBM')).toBe(true)
    expect(looksLikeUsBiosimilarName('adalimumab')).toBe(false)
    expect(looksLikeUsBiosimilarName('tafamidis')).toBe(false)
  })

  it('extracts nonproprietary core', () => {
    expect(nonproprietaryCore('adalimumab-atto')).toBe('adalimumab')
    expect(nonproprietaryCore('adalimumab')).toBe('adalimumab')
  })

  it('guesses roles from family names', () => {
    const family = ['ADALIMUMAB', 'ADALIMUMAB-ATTO', 'ADALIMUMAB-ADBM']
    expect(guessBiologicRole('ADALIMUMAB-ATTO', family)).toBe('likely_biosimilar')
    expect(guessBiologicRole('ADALIMUMAB', family)).toBe('reference_or_originator')
    expect(guessBiologicRole('some-mab', ['some-mab'])).toBe('unknown')
  })
})

describe('getBiologicsLicensedByName', () => {
  it('returns empty for short query', async () => {
    await expect(getBiologicsLicensedByName('a')).resolves.toEqual([])
  })

  it('maps BLA openFDA results and filters non-BLA', async () => {
    // @ts-expect-error mock
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        results: [
          {
            application_number: 'BLA125057',
            sponsor_name: 'ABBVIE INC',
            submissions: [
              { submission_type: 'ORIG', submission_status_date: '20021231' },
            ],
            products: [
              {
                brand_name: 'HUMIRA',
                active_ingredients: [{ name: 'ADALIMUMAB', strength: '40MG/0.8ML' }],
                dosage_form: 'SYRINGE',
                marketing_status: 'Prescription',
              },
            ],
          },
          {
            application_number: 'BLA761024',
            sponsor_name: 'AMGEN INC',
            submissions: [
              { submission_type: 'ORIG', submission_status_date: '20160923' },
            ],
            products: [
              {
                brand_name: 'AMJEVITA',
                active_ingredients: [
                  { name: 'ADALIMUMAB-ATTO', strength: '40MG/0.8ML' },
                ],
                dosage_form: 'SYRINGE',
                marketing_status: 'Prescription',
              },
            ],
          },
          {
            application_number: 'NDA021234',
            sponsor_name: 'NOT BIOLOGIC',
            products: [
              {
                brand_name: 'SMALLMOL',
                active_ingredients: [{ name: 'DRUGX' }],
              },
            ],
          },
        ],
      }),
    }))

    const rows = await getBiologicsLicensedByName('adalimumab')
    expect(rows.length).toBeGreaterThanOrEqual(2)
    expect(rows.every((r) => r.applicationNumber.startsWith('BLA'))).toBe(true)
    const humira = rows.find((r) => r.brandName === 'HUMIRA')
    const amj = rows.find((r) => r.brandName === 'AMJEVITA')
    expect(humira?.sponsorName).toMatch(/ABBVIE/i)
    expect(humira?.roleGuess).toBe('reference_or_originator')
    expect(amj?.roleGuess).toBe('likely_biosimilar')
    expect(humira?.drugsAtFdaUrl).toMatch(/accessdata\.fda\.gov/)
    expect(humira?.approvalDate).toBe('2002-12-31')
  })
})
