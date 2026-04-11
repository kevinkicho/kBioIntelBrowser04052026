import { getGhsHazardsByCid } from '@/lib/api/pubchem-hazards'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

const mockGhsResponse = {
  Record: {
    Section: [
      {
        TOCHeading: 'Safety and Hazards',
        Section: [
          {
            TOCHeading: 'Hazards Identification',
            Section: [
              {
                TOCHeading: 'GHS Classification',
                Information: [
                  {
                    Name: 'Signal',
                    Value: { StringWithMarkup: [{ String: 'Danger' }] },
                  },
                  {
                    Name: 'Pictogram(s)',
                    Value: {
                      StringWithMarkup: [
                        {
                          String: 'GHS07',
                          Markup: [{ Type: 'Icon', URL: 'https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS07.svg' }],
                        },
                      ],
                    },
                  },
                  {
                    Name: 'GHS Hazard Statements',
                    Value: {
                      StringWithMarkup: [
                        { String: 'H302: Harmful if swallowed' },
                        { String: 'H315: Causes skin irritation' },
                      ],
                    },
                  },
                  {
                    Name: 'Precautionary Statement Codes',
                    Value: {
                      StringWithMarkup: [
                        { String: 'P264: Wash hands thoroughly after handling' },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
}

describe('getGhsHazardsByCid', () => {
  test('returns parsed GHS data on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGhsResponse,
    })
    const data = await getGhsHazardsByCid(702)
    expect(data).not.toBeNull()
    expect(data!.signalWord).toBe('Danger')
    expect(data!.pictogramUrls).toContain('https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS07.svg')
    expect(data!.hazardStatements).toHaveLength(2)
    expect(data!.hazardStatements[0]).toBe('H302: Harmful if swallowed')
    expect(data!.precautionaryStatements).toHaveLength(1)
  })

  test('returns null when response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const data = await getGhsHazardsByCid(702)
    expect(data).toBeNull()
  })

  test('returns null on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const data = await getGhsHazardsByCid(702)
    expect(data).toBeNull()
  })

  test('returns null when no GHS section found', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ Record: { Section: [] } }),
    })
    const data = await getGhsHazardsByCid(9999999)
    expect(data).toBeNull()
  })
})
