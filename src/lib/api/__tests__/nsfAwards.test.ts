/**
 * @jest-environment node
 */

import { getNsfAwardsByKeyword } from '../nsfAwards'

describe('nsfAwards', () => {
  it('returns empty for short query without network', async () => {
    await expect(getNsfAwardsByKeyword('a')).resolves.toEqual([])
    await expect(getNsfAwardsByKeyword('')).resolves.toEqual([])
  })

  it('maps NSF awards search response', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        response: {
          award: [
            {
              id: '1234567',
              title: 'Amyloidosis Biomarker Methods',
              piFirstName: 'Ada',
              piLastName: 'Lovelace',
              awardeeName: 'Example University',
              estimatedTotalAmt: '250000',
              startDate: '01/01/2020',
              expDate: '12/31/2023',
              abstractText: 'Study of protein folding markers related to ATTR.',
            },
          ],
        },
      }),
    }))
    // @ts-expect-error test mock
    global.fetch = fetchMock

    const rows = await getNsfAwardsByKeyword('amyloidosis', 5)
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('1234567')
    expect(rows[0].piName).toBe('Ada Lovelace')
    expect(rows[0].organization).toBe('Example University')
    expect(rows[0].amount).toBe(250000)
    expect(rows[0].awardUrl).toContain('AWD_ID=1234567')
    expect(JSON.stringify(fetchMock.mock.calls)).toContain('api.nsf.gov')
  })

  it('handles single award object (not array)', async () => {
    // @ts-expect-error test mock
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        response: {
          award: {
            id: '99',
            title: 'Solo award',
            piFirstName: 'Grace',
            piLastName: 'Hopper',
            awardeeName: 'Navy Lab',
            estimatedTotalAmt: 1000,
          },
        },
      }),
    }))
    const rows = await getNsfAwardsByKeyword('computing')
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toBe('Solo award')
  })
})
