import { getCached, setCache } from '@/lib/cache'

describe('cache', () => {
  it('returns undefined for missing key', () => {
    expect(getCached('nonexistent')).toBeUndefined()
  })

  it('stores and retrieves data', () => {
    setCache('test-key', { hello: 'world' })
    expect(getCached('test-key')).toEqual({ hello: 'world' })
  })

  it('expires entries after TTL', () => {
    jest.useFakeTimers()
    setCache('ttl-key', 'value', 1000)
    expect(getCached('ttl-key')).toBe('value')
    jest.advanceTimersByTime(1001)
    expect(getCached('ttl-key')).toBeUndefined()
    jest.useRealTimers()
  })

  it('evicts oldest entry when at capacity', () => {
    for (let i = 0; i < 200; i++) {
      setCache(`cap-${i}`, i)
    }
    // Adding one more should evict the first
    setCache('cap-200', 200)
    expect(getCached('cap-0')).toBeUndefined()
    expect(getCached('cap-200')).toBe(200)
  })
})
