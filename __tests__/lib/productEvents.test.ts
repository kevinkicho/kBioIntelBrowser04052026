import {
  PRODUCT_EVENT_ALIASES,
  emitDiscoverStagesFromTimingMs,
  emitProductEvent,
  readQueuedProductEvents,
} from '@/lib/productEvents'

describe('productEvents clean-cut (canonical only)', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('discover_started emits once (no dual-emit legacy)', () => {
    emitProductEvent('discover_started', { count: 1 })
    const queued = readQueuedProductEvents()
    const names = queued.map((e) => e.name)
    expect(names).toEqual(['discover_started'])
  })

  test('pack_exported and preference_changed emit as-is', () => {
    emitProductEvent('pack_exported', { format: 'json', count: 3 })
    emitProductEvent('preference_changed', { keys: 'rubricPreset' })
    const names = readQueuedProductEvents().map((e) => e.name)
    expect(names).toContain('pack_exported')
    expect(names).toContain('preference_changed')
    expect(names).not.toContain('pack_export')
    expect(names).not.toContain('discover_prefs_change')
  })

  test('alias map is empty after clean-cut', () => {
    expect(Object.keys(PRODUCT_EVENT_ALIASES)).toHaveLength(0)
  })

  test('emitDiscoverStagesFromTimingMs skips total as stage but emits stages', () => {
    emitDiscoverStagesFromTimingMs({
      disease: 10,
      cheapScore: 20,
      total: 100,
    })
    const stages = readQueuedProductEvents().filter((e) => e.name === 'discover_stage')
    expect(stages.length).toBe(2)
    expect(stages.map((e) => e.props?.stage).sort()).toEqual(['cheapScore', 'disease'])
  })
})
