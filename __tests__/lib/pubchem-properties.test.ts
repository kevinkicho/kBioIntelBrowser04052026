import { getComputedPropertiesByCid } from '@/lib/api/pubchem-properties'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getComputedPropertiesByCid', () => {
  test('returns parsed properties on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        PropertyTable: {
          Properties: [{
            CID: 2244, XLogP: 1.2, TPSA: 63.6,
            HBondDonorCount: 1, HBondAcceptorCount: 4,
            Complexity: 212, ExactMass: 180.042,
            Charge: 0, RotatableBondCount: 3,
          }],
        },
      }),
    })
    const props = await getComputedPropertiesByCid(2244)
    expect(props).not.toBeNull()
    expect(props!.xLogP).toBe(1.2)
    expect(props!.tpsa).toBe(63.6)
    expect(props!.hBondDonorCount).toBe(1)
    expect(props!.hBondAcceptorCount).toBe(4)
    expect(props!.complexity).toBe(212)
    expect(props!.exactMass).toBe(180.042)
    expect(props!.charge).toBe(0)
    expect(props!.rotatableBondCount).toBe(3)
  })

  test('returns null when response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const props = await getComputedPropertiesByCid(2244)
    expect(props).toBeNull()
  })

  test('returns null on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const props = await getComputedPropertiesByCid(2244)
    expect(props).toBeNull()
  })

  test('returns null when Properties array is empty', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ PropertyTable: { Properties: [] } }),
    })
    const props = await getComputedPropertiesByCid(9999999)
    expect(props).toBeNull()
  })

  test('handles missing XLogP and TPSA as null', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        PropertyTable: {
          Properties: [{
            CID: 5793, HBondDonorCount: 5, HBondAcceptorCount: 6,
            Complexity: 180, ExactMass: 180.063, Charge: 0, RotatableBondCount: 1,
          }],
        },
      }),
    })
    const props = await getComputedPropertiesByCid(5793)
    expect(props).not.toBeNull()
    expect(props!.xLogP).toBeNull()
    expect(props!.tpsa).toBeNull()
    expect(props!.hBondDonorCount).toBe(5)
  })
})
