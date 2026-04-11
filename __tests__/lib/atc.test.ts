import { getAtcClassificationsByName } from '@/lib/api/atc'
import * as rxnorm from '@/lib/api/rxnorm'

jest.mock('@/lib/api/rxnorm')
global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getAtcClassificationsByName', () => {
  test('returns parsed ATC classifications on success', async () => {
    ;(rxnorm.getRxcuiByName as jest.Mock).mockResolvedValue('6809')
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        rxclassMinConceptList: {
          rxclassMinConcept: [
            { classId: 'A10BA02', className: 'metformin', classType: 'ATC1-4' },
            { classId: 'A10BA', className: 'Biguanides', classType: 'ATC1-3' },
          ],
        },
      }),
    })
    const results = await getAtcClassificationsByName('metformin')
    expect(results).toHaveLength(2)
    expect(results[0].code).toBe('A10BA02')
    expect(results[0].name).toBe('metformin')
    expect(results[0].classType).toBe('ATC1-4')
    expect(results[1].code).toBe('A10BA')
  })

  test('returns empty array when RxCUI not found', async () => {
    ;(rxnorm.getRxcuiByName as jest.Mock).mockResolvedValue(null)
    expect(await getAtcClassificationsByName('unknownxyz')).toEqual([])
  })

  test('returns empty array when no classifications found', async () => {
    ;(rxnorm.getRxcuiByName as jest.Mock).mockResolvedValue('6809')
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    expect(await getAtcClassificationsByName('metformin')).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(rxnorm.getRxcuiByName as jest.Mock).mockResolvedValue('6809')
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getAtcClassificationsByName('metformin')).toEqual([])
  })
})
