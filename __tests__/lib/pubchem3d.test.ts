import {
  hasPubChem3dConformer,
  pubchem3dSdfUrl,
  probePubChem3dClient,
  clearPubChem3dClientProbeCache,
} from '@/lib/api/pubchem3d'

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

describe('pubchem3d', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    clearPubChem3dClientProbeCache()
  })

  it('builds SDF 3d URL', () => {
    expect(pubchem3dSdfUrl(2244)).toContain('/cid/2244/SDF')
    expect(pubchem3dSdfUrl(2244)).toContain('record_type=3d')
  })

  it('returns true when ConformerCount3D > 0', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        PropertyTable: { Properties: [{ ConformerCount3D: 5 }] },
      }),
    })
    await expect(hasPubChem3dConformer(2244)).resolves.toBe(true)
  })

  it('returns false when ConformerCount3D is 0', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        PropertyTable: { Properties: [{ ConformerCount3D: 0 }] },
      }),
    })
    await expect(hasPubChem3dConformer(121493436)).resolves.toBe(false)
  })

  it('falls back to SDF HEAD when property fails', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: false, status: 404 })
    await expect(hasPubChem3dConformer(121493436)).resolves.toBe(false)
  })

  it('returns false for invalid cid', async () => {
    await expect(hasPubChem3dConformer(0)).resolves.toBe(false)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('probePubChem3dClient uses same-origin API first', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cid: 2244, has3d: true }),
    })
    await expect(probePubChem3dClient(2244)).resolves.toBe(true)
    expect(String(mockFetch.mock.calls[0][0])).toContain('/api/pubchem/has-3d')
  })

  it('probePubChem3dClient dedupes concurrent probes for the same CID', async () => {
    let resolveFetch!: (v: unknown) => void
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve
      }),
    )
    const a = probePubChem3dClient(999)
    const b = probePubChem3dClient(999)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    resolveFetch({
      ok: true,
      json: async () => ({ cid: 999, has3d: false }),
    })
    await expect(Promise.all([a, b])).resolves.toEqual([false, false])
  })
})
