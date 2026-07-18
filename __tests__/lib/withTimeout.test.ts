import { withTimeout } from '@/lib/utils'

describe('withTimeout', () => {
  test('resolves when promise wins', async () => {
    await expect(withTimeout(Promise.resolve(42), 1000)).resolves.toBe(42)
  })

  test('rejects on timeout and aborts controller', async () => {
    const ac = new AbortController()
    const slow = new Promise<number>(() => {
      /* never settles */
    })
    await expect(withTimeout(slow, 30, { abortController: ac })).rejects.toThrow(/timed out/i)
    expect(ac.signal.aborted).toBe(true)
  })

  test('rejects when signal already aborted', async () => {
    const ac = new AbortController()
    ac.abort()
    await expect(
      withTimeout(Promise.resolve(1), 1000, { signal: ac.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })

  test('rejects when signal aborts mid-wait', async () => {
    const ac = new AbortController()
    const slow = new Promise<number>(() => {})
    const p = withTimeout(slow, 5000, { signal: ac.signal })
    setTimeout(() => ac.abort(), 20)
    await expect(p).rejects.toMatchObject({ name: 'AbortError' })
  })
})
