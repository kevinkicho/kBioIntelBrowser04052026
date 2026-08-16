import { getTTDData } from '@/lib/api/ttd'

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

const aspirinHit = {
  _id: '1',
  association: { predicate: 'biolink:interacts_with', moa: 'inhibitor' },
  subject: {
    name: 'Aspirin',
    pubchem_compound: '2244',
    ttd_drug_id: 'D0GY5Z',
    type: 'biolink:SmallMolecule',
  },
  object: {
    name: 'COX-1',
    ttd_target_id: 'T123',
    target_type: 'successful target',
    type: 'biolink:Protein',
  },
}

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getTTDData', () => {
  test('returns mapped drugs and targets on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({ hits: [aspirinHit] }))
    const res = await getTTDData('aspirin')
    expect(res.drugs.length).toBeGreaterThan(0)
    expect(res.targets.length).toBeGreaterThan(0)
    expect(res.drugs[0].name).toBe('Aspirin')
    expect(res.targets[0].name).toBe('COX-1')
  })

  test('true empty hits JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({ hits: [] }))
    expect(await getTTDData('unknownxyz')).toEqual({ targets: [], drugs: [] })
  })

  test('short query is empty without fetch', async () => {
    expect(await getTTDData('a')).toEqual({ targets: [], drugs: [] })
    expect(fetch).not.toHaveBeenCalled()
  })

  test('throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    await expect(getTTDData('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('network'))
    await expect(getTTDData('aspirin')).rejects.toThrow(/network/)
  })

  test('throws on HTML (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes('<html></html>', 200, 'text/html'))
    await expect(getTTDData('aspirin')).rejects.toThrow(/HTML/)
  })
})