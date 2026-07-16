import {
  PRODUCT_EVENT_ALIASES,
  emitDiscoverStagesFromTimingMs,
  emitProductEvent,
  readQueuedProductEvents,
} from '@/lib/productEvents'

describe('productEvents dual-emit', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('discover_search dual-emits discover_started', () => {
    emitProductEvent('discover_search', { count: 1 })
    const queued = readQueuedProductEvents()
    const names = queued.map((e) => e.name)
    expect(names).toContain('discover_search')
    expect(names).toContain('discover_started')
  })

  test('alias map covers pack_export', () => {
    expect(PRODUCT_EVENT_ALIASES.pack_export).toBe('pack_exported')
  })

  test('emitDiscoverStagesFromTimingMs skips total as stage but emits stages', () => {
    emitDiscoverStagesFromTimingMs({
      disease: 10,
      cheapScore: 20,
      total: 100,
    })
    const names = readQueuedProductEvents().map((e) => e.name)
    expect(names.filter((n) => n === 'discover_stage').length).toBeGreaterThanOrEqual(2)
  })
})
