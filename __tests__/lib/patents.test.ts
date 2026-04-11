import { getPatentsByMoleculeName } from '@/lib/api/patents'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getPatentsByMoleculeName', () => {
  test('returns parsed patents on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        patents: [
          {
            patent_number: 'US8114833',
            patent_title: 'GLP-1 receptor agonists',
            assignees: [{ assignee_organization: 'Novo Nordisk' }],
            patent_date: '2012-02-14',
            patent_abstract: 'A compound useful for treating diabetes.',
          },
        ],
      }),
    })
    const results = await getPatentsByMoleculeName('liraglutide')
    expect(results).toHaveLength(1)
    expect(results[0].patentNumber).toBe('US8114833')
    expect(results[0].title).toBe('GLP-1 receptor agonists')
    expect(results[0].assignee).toBe('Novo Nordisk')
    expect(results[0].filingDate).toBe('2012-02-14')
    expect(results[0].abstract).toBe('A compound useful for treating diabetes.')
  })

  test('returns empty array when API response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const results = await getPatentsByMoleculeName('unknownxyz')
    expect(results).toEqual([])
  })

  test('returns empty array when patents key is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })
    const results = await getPatentsByMoleculeName('aspirin')
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const results = await getPatentsByMoleculeName('aspirin')
    expect(results).toEqual([])
  })
})
