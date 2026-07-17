/**
 * @jest-environment jsdom
 */
import { emitProductEvent, readQueuedProductEvents, clearQueuedProductEvents } from '@/lib/productEvents'
import { LOCAL_SESSION_KEY, createLocalSession } from '@/lib/localSession'

describe('product events sessionId attachment', () => {
  beforeEach(() => {
    localStorage.clear()
    clearQueuedProductEvents()
    const s = createLocalSession('Tester')
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(s))
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch
  })

  test('emitProductEvent attaches sessionId from local workspace', () => {
    emitProductEvent('discover_started', { q: 'ATTR' })
    const q = readQueuedProductEvents()
    expect(q.length).toBeGreaterThan(0)
    const last = q[q.length - 1]
    expect(last.props?.sessionId).toMatch(/^loc_/)
    expect(last.props?.q).toBe('ATTR')
  })

  test('explicit sessionId in props is preserved', () => {
    emitProductEvent('project_opened', { sessionId: 'custom_sid', projectId: 'p1' })
    const last = readQueuedProductEvents().at(-1)
    expect(last?.props?.sessionId).toBe('custom_sid')
  })
})
