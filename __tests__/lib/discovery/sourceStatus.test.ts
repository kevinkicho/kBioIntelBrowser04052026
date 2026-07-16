import { makeSourceStatus, withSourceStatus } from '@/lib/discovery/sourceStatus'

describe('sourceStatus helpers', () => {
  it('makeSourceStatus defaults has_data from loaded', () => {
    expect(makeSourceStatus('DGIdb', 'loaded').has_data).toBe(true)
    expect(makeSourceStatus('DGIdb', 'empty').has_data).toBe(false)
    expect(makeSourceStatus('DGIdb', 'error', { hasData: false, error: 'boom' }).error).toBe(
      'boom',
    )
  })

  it('withSourceStatus returns loaded when hasData true', async () => {
    const { value, status } = await withSourceStatus('Test', async () => [1, 2], {
      fallback: [],
      hasData: (v) => v.length > 0,
    })
    expect(value).toEqual([1, 2])
    expect(status.status).toBe('loaded')
    expect(status.has_data).toBe(true)
    expect(typeof status.duration_ms).toBe('number')
  })

  it('withSourceStatus returns empty when hasData false', async () => {
    const { value, status } = await withSourceStatus('Test', async () => [], {
      fallback: ['fallback'],
      hasData: (v) => v.length > 0,
    })
    expect(value).toEqual([])
    expect(status.status).toBe('empty')
  })

  it('withSourceStatus catches errors and returns fallback', async () => {
    const { value, status } = await withSourceStatus(
      'Test',
      async () => {
        throw new Error('network down')
      },
      {
        fallback: [],
        hasData: (v) => v.length > 0,
      },
    )
    expect(value).toEqual([])
    expect(status.status).toBe('error')
    expect(status.error).toMatch(/network down/)
    expect(status.has_data).toBe(false)
  })
})
