import {
  PRODUCT_EVENT_ALIASES,
  PRODUCT_EVENT_LABELS,
  PRODUCT_EVENT_METRIC,
  clearQueuedProductEvents,
  emitDiscoverStagesFromTimingMs,
  emitProductEvent,
  productEventLabel,
  readQueuedProductEvents,
  summarizeProductEvents,
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

  test('rubric_changed and preference_tooltip_opened are first-class events', () => {
    emitProductEvent('rubric_changed', { field: 'preset', preset: 'balanced' })
    emitProductEvent('preference_tooltip_opened', { key: 'harvestTiming' })
    const names = readQueuedProductEvents().map((e) => e.name)
    expect(names).toContain('rubric_changed')
    expect(names).toContain('preference_tooltip_opened')
    expect(PRODUCT_EVENT_METRIC.rubric_changed).toBe('M4')
    expect(PRODUCT_EVENT_METRIC.preference_tooltip_opened).toBe('M9')
  })

  test('source_deep_link_opened is first-class (M6)', () => {
    emitProductEvent('source_deep_link_opened', { source: 'chembl', panelId: 'chembl' })
    expect(readQueuedProductEvents().map((e) => e.name)).toContain('source_deep_link_opened')
    expect(PRODUCT_EVENT_METRIC.source_deep_link_opened).toBe('M6')
    expect(PRODUCT_EVENT_LABELS.source_deep_link_opened).toMatch(/deep link/i)
  })

  test('AI analysis events are first-class (non-of-record M5)', () => {
    emitProductEvent('ai_rank_view_toggled', { enabled: true })
    emitProductEvent('ai_rank_completed', { count: 5, refused: false })
    emitProductEvent('ai_recommend_completed', { count: 3 })
    const names = readQueuedProductEvents().map((e) => e.name)
    expect(names).toContain('ai_rank_view_toggled')
    expect(names).toContain('ai_rank_completed')
    expect(names).toContain('ai_recommend_completed')
    expect(PRODUCT_EVENT_METRIC.ai_rank_completed).toBe('M5')
    expect(PRODUCT_EVENT_METRIC.ai_recommend_completed).toBe('M5')
    expect(PRODUCT_EVENT_LABELS.ai_rank_view_toggled).toMatch(/analysis/i)
  })

  test('labels cover all event names', () => {
    expect(productEventLabel('pack_exported')).toBe('Pack exported')
    expect(productEventLabel('unknown_event')).toMatch(/unknown/)
    expect(Object.keys(PRODUCT_EVENT_LABELS).length).toBeGreaterThanOrEqual(20)
  })

  test('summarizeProductEvents aggregates counts', () => {
    emitProductEvent('discover_started')
    emitProductEvent('discover_started')
    emitProductEvent('board_candidate_added')
    const summary = summarizeProductEvents(readQueuedProductEvents())
    expect(summary.find((r) => r.name === 'discover_started')?.count).toBe(2)
    expect(summary.find((r) => r.name === 'board_candidate_added')?.metric).toBe('M1')
  })

  test('clearQueuedProductEvents empties queue', () => {
    emitProductEvent('project_opened')
    clearQueuedProductEvents()
    expect(readQueuedProductEvents()).toEqual([])
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
