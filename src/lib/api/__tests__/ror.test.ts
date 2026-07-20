/**
 * @jest-environment node
 */

import { searchRorOrganizations } from '../ror'

describe('ror', () => {
  it('returns empty for short query', async () => {
    await expect(searchRorOrganizations('a')).resolves.toEqual([])
  })

  it('maps ROR v2 organization JSON', async () => {
    // @ts-expect-error mock
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        number_of_results: 1,
        items: [
          {
            id: 'https://ror.org/02qp3tb03',
            status: 'active',
            types: ['healthcare', 'funder'],
            established: 1889,
            names: [
              { value: 'Mayo Clinic', types: ['ror_display', 'label'], lang: 'en' },
              { value: 'Mayo', types: ['alias'], lang: 'en' },
            ],
            links: [
              { type: 'website', value: 'https://www.mayoclinic.org' },
              { type: 'wikipedia', value: 'https://en.wikipedia.org/wiki/Mayo_Clinic' },
            ],
            locations: [
              {
                geonames_details: {
                  country_code: 'US',
                  country_name: 'United States',
                  country_subdivision_name: 'Minnesota',
                  name: 'Rochester',
                },
              },
            ],
          },
        ],
      }),
    }))

    const rows = await searchRorOrganizations('Mayo Clinic')
    expect(rows).toHaveLength(1)
    expect(rows[0].rorId).toBe('02qp3tb03')
    expect(rows[0].name).toBe('Mayo Clinic')
    expect(rows[0].types).toContain('healthcare')
    expect(rows[0].countryCode).toBe('US')
    expect(rows[0].website).toMatch(/mayoclinic/)
  })
})
