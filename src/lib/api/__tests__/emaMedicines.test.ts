/**
 * @jest-environment node
 */

import { getEmaMedicinesByName } from '../emaMedicines'

jest.mock('../chembl', () => ({
  getChemblIdByName: jest.fn(async () => 'CHEMBL2103839'),
}))

describe('emaMedicines', () => {
  it('returns empty for short name', async () => {
    await expect(getEmaMedicinesByName('a')).resolves.toEqual([])
  })

  it('maps Open Targets drug + EMA search URL', async () => {
    // @ts-expect-error mock
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          drug: {
            id: 'CHEMBL2103839',
            name: 'TAFAMIDIS',
            tradeNames: ['VYNDAQEL'],
            drugType: 'Small molecule',
            yearOfFirstApproval: 2011,
            maximumClinicalTrialPhase: 4,
            hasBeenWithdrawn: false,
          },
        },
      }),
    }))

    const rows = await getEmaMedicinesByName('tafamidis')
    expect(rows.length).toBeGreaterThan(0)
    expect(rows[0].name).toMatch(/TAFAMIDIS/i)
    expect(rows[0].emaSearchUrl).toMatch(/ema\.europa\.eu/)
    expect(rows[0].tradeNames).toContain('VYNDAQEL')
  })
})
