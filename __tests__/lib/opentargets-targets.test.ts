/**
 * Open Targets disease → gene targets (associatedTargets GraphQL).
 */

import { getTargetsForDisease } from '@/lib/api/opentargets'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getTargetsForDisease', () => {
  test('maps associatedTargets approvedSymbol (not legacy linkedTargets)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          disease: {
            id: 'MONDO_0004993',
            name: 'carcinoma',
            associatedTargets: {
              count: 2,
              rows: [
                {
                  score: 0.93,
                  target: { id: 'ENSG00000165731', approvedSymbol: 'RET' },
                },
                {
                  score: 0.91,
                  target: { id: 'ENSG00000146648', approvedSymbol: 'EGFR' },
                },
              ],
            },
          },
        },
      }),
    })

    const targets = await getTargetsForDisease('MONDO_0004993')
    expect(targets).toHaveLength(2)
    expect(targets[0]).toEqual({
      id: 'ENSG00000165731',
      name: 'RET',
      overallScore: 0.93,
    })
    expect(targets.map((t) => t.name)).toEqual(['RET', 'EGFR'])

    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body)
    expect(body.query).toContain('associatedTargets')
    expect(body.query).toContain('approvedSymbol')
    expect(body.query).not.toContain('linkedTargets')
    expect(body.variables).toEqual({ efoId: 'MONDO_0004993' })
  })

  test('returns empty on missing id, HTTP error, or GraphQL errors', async () => {
    expect(await getTargetsForDisease('')).toEqual([])

    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 })
    expect(await getTargetsForDisease('MONDO_0004993')).toEqual([])

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ errors: [{ message: 'schema' }] }),
    })
    expect(await getTargetsForDisease('MONDO_0004993')).toEqual([])
  })
})
