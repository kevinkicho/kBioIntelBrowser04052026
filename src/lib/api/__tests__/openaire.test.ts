/**
 * @jest-environment node
 */

import { getOpenAireProjectsByName } from '../openaire'

describe('openaire', () => {
  it('returns empty for short query', async () => {
    await expect(getOpenAireProjectsByName('a')).resolves.toEqual([])
  })

  it('maps nested OpenAIRE project JSON', async () => {
    // @ts-expect-error mock
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        response: {
          results: {
            result: {
              header: { 'dri:objIdentifier': { $: 'proj-1' } },
              metadata: {
                'oaf:entity': {
                  'oaf:project': {
                    code: { $: '101000000' },
                    title: { $: 'Test amyloidosis project' },
                    acronym: { $: 'TAP' },
                    startdate: { $: '2020-01-01' },
                    enddate: { $: '2024-12-31' },
                    fundedamount: { $: '1000000' },
                    totalcost: { $: '1200000' },
                    fundingtree: {
                      funder: {
                        shortname: { $: 'EC' },
                        name: { $: 'European Commission' },
                        jurisdiction: { $: 'EU' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    }))

    const rows = await getOpenAireProjectsByName('amyloidosis')
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toMatch(/amyloidosis/i)
    expect(rows[0].code).toBe('101000000')
    expect(rows[0].funderShort).toBe('EC')
    expect(rows[0].cordisUrl).toMatch(/cordis\.europa\.eu/)
    expect(rows[0].url).toMatch(/openaire/)
  })
})
