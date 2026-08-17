import { getComputedPropertiesByCid } from '@/lib/api/pubchem-properties'
import { runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'
import { resetRateLimitBuckets } from '@/lib/rateLimit'

global.fetch = jest.fn()
beforeEach(() => {
  jest.resetAllMocks()
  resetRateLimitBuckets()
})

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

const aspirinProps = {
  PropertyTable: {
    Properties: [{
      CID: 2244, XLogP: 1.2, TPSA: 63.6,
      HBondDonorCount: 1, HBondAcceptorCount: 4,
      Complexity: 212, ExactMass: 180.042,
      Charge: 0, RotatableBondCount: 3,
    }],
  },
}

describe('getComputedPropertiesByCid', () => {
  test('returns parsed properties on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes(aspirinProps))
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

  test('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    expect(await getComputedPropertiesByCid(2244)).toBeNull()
  })

  test('throws when PubChem and fallbacks return HTTP 503', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    await expect(getComputedPropertiesByCid(2244)).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body after fallbacks also fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getComputedPropertiesByCid(2244)).rejects.toThrow(/HTML/)
  })

  test('throws on network error after fallbacks also fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('network'))
    await expect(getComputedPropertiesByCid(2244)).rejects.toThrow(/network/)
  })

  test('returns null when Properties array is empty and fallbacks are absent', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ PropertyTable: { Properties: [] } }))
      .mockResolvedValue(jsonRes({}, 404))
    const props = await getComputedPropertiesByCid(9999999)
    expect(props).toBeNull()
  })

  test('handles missing XLogP and TPSA as null', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
      PropertyTable: {
        Properties: [{
          CID: 5793, HBondDonorCount: 5, HBondAcceptorCount: 6,
          Complexity: 180, ExactMass: 180.063, Charge: 0, RotatableBondCount: 1,
        }],
      },
    }))
    const props = await getComputedPropertiesByCid(5793)
    expect(props).not.toBeNull()
    expect(props!.xLogP).toBeNull()
    expect(props!.tpsa).toBeNull()
    expect(props!.hBondDonorCount).toBe(5)
  })

  test('uses MyChem fallback when PubChem is 503', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({
        chembl: {
          molecule_properties: {
            alogp: 1.19, psa: 63.6, hbd: 1, hba: 4,
            aromatic_rings: 1, full_mwt: 180.16, rtb: 3,
          },
        },
      }))
    const props = await getComputedPropertiesByCid(2244)
    expect(props).not.toBeNull()
    expect(props!.xLogP).toBe(1.19)
    expect(props!.tpsa).toBe(63.6)
  })
})

describe('PubChem properties trackedSafe honesty', () => {
  test('HTTP 503 after all fallbacks is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('pubchem-properties', getComputedPropertiesByCid(2244), null),
    )
    expect(value).toBeNull()
    const row = metrics.find((m) => m.source === 'pubchem-properties')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('pubchem-properties', getComputedPropertiesByCid(2244), null),
    )
    expect(value).toBeNull()
    const row = metrics.find((m) => m.source === 'pubchem-properties')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
