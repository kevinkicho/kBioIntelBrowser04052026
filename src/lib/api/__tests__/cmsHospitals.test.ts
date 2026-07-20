/**
 * @jest-environment node
 */

import { searchCmsHospitalsByName } from '../cmsHospitals'

describe('cmsHospitals', () => {
  it('returns empty for short query', async () => {
    await expect(searchCmsHospitalsByName('a')).resolves.toEqual([])
  })

  it('maps CMS datastore rows', async () => {
    // @ts-expect-error mock
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        results: [
          {
            facility_id: '240010',
            facility_name: 'MAYO CLINIC HOSPITAL ROCHESTER',
            address: '1216 SECOND STREET SOUTHWEST',
            citytown: 'ROCHESTER',
            state: 'MN',
            zip_code: '55902',
            telephone_number: '(507) 255-5123',
            hospital_type: 'Acute Care Hospitals',
            hospital_ownership: 'Voluntary non-profit - Private',
            emergency_services: 'Yes',
            hospital_overall_rating: '5',
          },
        ],
      }),
    }))

    const rows = await searchCmsHospitalsByName('mayo')
    expect(rows).toHaveLength(1)
    expect(rows[0].facilityName).toMatch(/MAYO/i)
    expect(rows[0].state).toBe('MN')
    expect(rows[0].careCompareUrl).toMatch(/medicare\.gov/)
  })
})
