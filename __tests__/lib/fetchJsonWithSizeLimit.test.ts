import { fetchJsonWithSizeLimit } from '@/lib/api/fetchJsonWithSizeLimit'
import { mockJsonResponse } from '../utils/mockFetch'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('fetchJsonWithSizeLimit', () => {
  test('parses JSON within size limit', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse({ ok: true, n: 1 }))
    const data = await fetchJsonWithSizeLimit<{ ok: boolean; n: number }>('https://example.com/api')
    expect(data).toEqual({ ok: true, n: 1 })
  })

  test('returns null for HTML content-type', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      new Response('<!doctype html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
    )
    const data = await fetchJsonWithSizeLimit('https://example.com/api')
    expect(data).toBeNull()
  })

  test('returns null when content-length exceeds max', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({ huge: true }, {
        headers: { 'content-length': String(5 * 1024 * 1024) },
      }),
    )
    const data = await fetchJsonWithSizeLimit('https://example.com/api', { maxBytes: 2 * 1024 * 1024 })
    expect(data).toBeNull()
  })

  test('returns null when body length exceeds max after download', async () => {
    const body = 'x'.repeat(100)
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      new Response(body, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    const data = await fetchJsonWithSizeLimit('https://example.com/api', { maxBytes: 50 })
    expect(data).toBeNull()
  })

  test('returns null on non-OK status', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse({}, { status: 500 }))
    const data = await fetchJsonWithSizeLimit('https://example.com/api')
    expect(data).toBeNull()
  })

  test('returns null on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const data = await fetchJsonWithSizeLimit('https://example.com/api')
    expect(data).toBeNull()
  })

  test('uses cache no-store by default', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse([]))
    await fetchJsonWithSizeLimit('https://example.com/api')
    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({ cache: 'no-store' }),
    )
  })
})
