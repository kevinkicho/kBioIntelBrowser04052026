/**
 * @jest-environment node
 */

import { getHealthCanadaProductsByName } from '../healthCanadaDpd'

describe('healthCanadaDpd', () => {
  it('returns empty for short query without network', async () => {
    await expect(getHealthCanadaProductsByName('a')).resolves.toEqual([])
    await expect(getHealthCanadaProductsByName('')).resolves.toEqual([])
  })

  it('maps brand search when fetch returns sample product + details', async () => {
    const fetchMock = jest.fn(async (url: string) => {
      const u = String(url)
      if (u.includes('/drugproduct/')) {
        return {
          ok: true,
          json: async () => [
            {
              drug_code: 2049,
              drug_identification_number: '00326925',
              brand_name: 'SINEQUAN',
              company_name: 'ASPRI PHARMA CANADA INC',
              class_name: 'Human',
              descriptor: '',
              number_of_ais: '1',
              last_update_date: '2019-03-05',
            },
          ],
        }
      }
      if (u.includes('/status/')) {
        return {
          ok: true,
          json: async () => [{ status: 'Marketed', history_date: '1990-01-01' }],
        }
      }
      if (u.includes('/form/')) {
        return {
          ok: true,
          json: async () => [{ pharmaceutical_form_name: 'Capsule' }],
        }
      }
      if (u.includes('/route/')) {
        return {
          ok: true,
          json: async () => [{ route_of_administration_name: 'Oral' }],
        }
      }
      if (u.includes('/activeingredient/')) {
        return {
          ok: true,
          json: async () => [
            { ingredient_name: 'DOXEPIN HYDROCHLORIDE', strength: '10', strength_unit: 'MG' },
          ],
        }
      }
      return { ok: false, json: async () => null }
    })
    // @ts-expect-error test mock
    global.fetch = fetchMock

    const rows = await getHealthCanadaProductsByName('sinequan', 5)
    expect(rows).toHaveLength(1)
    expect(rows[0].din).toBe('00326925')
    expect(rows[0].brandName).toBe('SINEQUAN')
    expect(rows[0].status).toBe('Marketed')
    expect(rows[0].forms).toContain('Capsule')
    expect(rows[0].ingredients[0].name).toMatch(/DOXEPIN/i)
    expect(rows[0].url).toMatch(/health-products\.canada\.ca/)
  })
})
