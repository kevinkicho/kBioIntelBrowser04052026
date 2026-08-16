/**
 * Open Targets disease → gene targets (associatedTargets GraphQL).
 */

import { getTargetsForDisease } from '@/lib/api/opentargets'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
  }
}

describe('getTargetsForDisease', () => {
  test('maps associatedTargets approvedSymbol (not legacy linkedTargets)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
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
    }))

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

  test('returns empty on missing id', async () => {
    expect(await getTargetsForDisease('')).toEqual([])
  })

  test('throws on HTTP error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 500))
    await expect(getTargetsForDisease('MONDO_0004993')).rejects.toThrow(/HTTP 500/)
  })

  test('throws on GraphQL errors (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ errors: [{ message: 'schema' }] }))
    await expect(getTargetsForDisease('MONDO_0004993')).rejects.toThrow(/GraphQL/)
  })
})
