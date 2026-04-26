/**
 * Test helpers for mocking the fetch API.
 *
 * Use these instead of hand-rolling `Promise.resolve({ ok, json })` — those
 * objects lack `headers`, which crashes anything that goes through
 * `clientFetch` (it calls `response.headers.get('content-length')`).
 */

interface MockInit {
  status?: number
  statusText?: string
  headers?: Record<string, string>
}

/** Build a real `Response` carrying a JSON body. */
export function mockJsonResponse(body: unknown, init: MockInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    statusText: init.statusText,
    headers: { 'content-type': 'application/json', ...init.headers },
  })
}

/** Build a real `Response` carrying a text body. */
export function mockTextResponse(body: string, init: MockInit = {}): Response {
  return new Response(body, {
    status: init.status ?? 200,
    statusText: init.statusText,
    headers: { 'content-type': 'text/plain', ...init.headers },
  })
}

/**
 * Replace `global.fetch` with a routing handler.
 *
 * The handler receives the URL string and request init, and returns either:
 * - a value to JSON-stringify (most common), or
 * - a `Response` directly (for non-JSON bodies / non-200 statuses).
 *
 * Returns the jest mock fn so tests can inspect call counts/args.
 *
 * @example
 *   mockFetch((url) => {
 *     if (url.includes('/api/foo')) return { foo: 1 }
 *     if (url.includes('/api/bar')) return mockJsonResponse({ err: 'x' }, { status: 500 })
 *     throw new Error('Unexpected URL: ' + url)
 *   })
 */
export function mockFetch(
  handler: (url: string, init?: RequestInit) => unknown,
): jest.Mock {
  const fn = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const result = handler(url, init)
    if (result instanceof Response) return result
    return mockJsonResponse(result)
  }) as unknown as jest.Mock
  global.fetch = fn as unknown as typeof fetch
  return fn
}
