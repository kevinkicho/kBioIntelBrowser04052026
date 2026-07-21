/**
 * @jest-environment node
 */

import { searchOpenAlexUsEducation } from '../openAlexInstitutions'

describe('openAlexInstitutions', () => {
  it('returns empty for short query', async () => {
    await expect(searchOpenAlexUsEducation('a')).resolves.toEqual([])
  })

  it('maps OpenAlex institution JSON', async () => {
    // @ts-expect-error mock
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 'https://openalex.org/I136199984',
            display_name: 'Harvard University',
            type: 'education',
            country_code: 'US',
            works_count: 100,
            homepage_url: 'https://www.harvard.edu',
            geo: { city: 'Cambridge', region: 'Massachusetts' },
            ids: { ror: 'https://ror.org/03vek6s52' },
          },
        ],
      }),
    }))
    const rows = await searchOpenAlexUsEducation('Harvard')
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('Harvard University')
    expect(rows[0].rorId).toBe('03vek6s52')
    expect(rows[0].city).toBe('Cambridge')
  })
})
