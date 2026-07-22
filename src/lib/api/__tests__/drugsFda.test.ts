/**
 * @jest-environment node
 */

import { drugsAtFdaOverviewUrl, getDrugsFdaByName } from '../drugsFda'

describe('drugsFda', () => {
  it('returns empty for short query without network', async () => {
    await expect(getDrugsFdaByName('a')).resolves.toEqual([])
    await expect(getDrugsFdaByName('')).resolves.toEqual([])
  })

  it('builds Drugs@FDA overview URL from application number digits', () => {
    expect(drugsAtFdaOverviewUrl('NDA021875')).toContain('ApplNo=021875')
    expect(drugsAtFdaOverviewUrl('')).toMatch(/cder\/daf/)
  })

  it('maps openFDA Drugs@FDA results', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        results: [
          {
            application_number: 'NDA021875',
            sponsor_name: 'GILEAD SCIENCES INC',
            submissions: [{ submission_type: 'ORIG', submission_status_date: '20010827' }],
            products: [
              {
                brand_name: 'VIREAD',
                active_ingredients: [{ name: 'TENOFOVIR DISOPROXIL FUMARATE', strength: '300MG' }],
                dosage_form: 'TABLET',
                route: 'ORAL',
                marketing_status: 'Prescription',
              },
            ],
            openfda: {
              brand_name: ['VIREAD'],
              generic_name: ['TENOFOVIR DISOPROXIL FUMARATE'],
            },
          },
        ],
      }),
    }))
    // @ts-expect-error test mock
    global.fetch = fetchMock

    const rows = await getDrugsFdaByName('tenofovir', 5)
    expect(rows).toHaveLength(1)
    expect(rows[0].applicationNumber).toBe('NDA021875')
    expect(rows[0].brandName).toBe('VIREAD')
    expect(rows[0].sponsorName).toMatch(/GILEAD/i)
    expect(rows[0].products[0].activeIngredients).toMatch(/TENOFOVIR/i)
    expect(rows[0].drugsAtFdaUrl).toContain('ApplNo=')
    expect(JSON.stringify(fetchMock.mock.calls)).toContain('+OR+')
  })
})
