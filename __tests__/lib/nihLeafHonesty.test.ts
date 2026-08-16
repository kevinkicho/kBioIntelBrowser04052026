/**
 * Remaining NIH high-impact leaf clients must not treat HTTP/network
 * failure as honest EMPTY — same law as nci-cadsr / niaid-immport.
 */
import { fetchAnvilData } from '@/lib/api/nhgri-anvil'
import { fetchTranslatorData } from '@/lib/api/ncats-translator'
import { fetchNeuroMMSigData } from '@/lib/api/ninds-neurommsig'

describe('NIH leaf honesty (AnVIL / Translator / NeuroMMSig)', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.clearAllMocks()
  })

  it('AnVIL throws on HTTP 503 (not EMPTY)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      headers: { get: () => 'application/json' },
    }) as unknown as typeof fetch
    await expect(fetchAnvilData('diabetes')).rejects.toThrow(/HTTP/)
  })

  it('Translator throws on network error (not EMPTY)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch
    await expect(fetchTranslatorData('metformin')).rejects.toThrow(/network/)
  })

  it('NeuroMMSig throws on HTML (not EMPTY)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'text/html' },
      text: async () => '<!doctype html>',
    }) as unknown as typeof fetch
    await expect(fetchNeuroMMSigData('APOE')).rejects.toThrow(/HTML/)
  })
})
