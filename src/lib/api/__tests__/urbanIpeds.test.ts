/**
 * @jest-environment node
 */

import { getUrbanIpedsByUnitid } from '../urbanIpeds'

describe('urbanIpeds', () => {
  it('returns null for empty unitid', async () => {
    await expect(getUrbanIpedsByUnitid('')).resolves.toBeNull()
  })

  it('maps Urban directory row by unitid', async () => {
    // @ts-expect-error mock
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        results: [
          {
            unitid: 166027,
            inst_name: 'Harvard University',
            address: 'Massachusetts Hall',
            city: 'Cambridge',
            state_abbr: 'MA',
            zip: '02138',
            phone_number: '6174951000',
            inst_url: 'www.harvard.edu',
            inst_control: 2,
            hbcu: 0,
            medical_degree: 1,
            hospital: 0,
          },
        ],
      }),
    }))
    const row = await getUrbanIpedsByUnitid('166027')
    expect(row?.name).toBe('Harvard University')
    expect(row?.state).toBe('MA')
    expect(row?.control).toMatch(/nonprofit/i)
    expect(row?.website).toMatch(/harvard/)
  })
})
