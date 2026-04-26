import {
  extractHypothesisSeedJson,
  normalizeAxis,
  validateHypothesisSeed,
  buildHypothesisSeedUrl,
} from '@/lib/ai/aiTasks/hypothesisSeed'

describe('normalizeAxis', () => {
  test('normalizes underscore form to hyphen form', () => {
    expect(normalizeAxis('targets_gene')).toBe('targets-gene')
    expect(normalizeAxis('indicated_for')).toBe('indicated-for')
    expect(normalizeAxis('trial_phase')).toBe('trial-phase')
    expect(normalizeAxis('atc_class')).toBe('atc-class')
  })

  test('accepts hyphen form too (LLM inconsistency)', () => {
    expect(normalizeAxis('targets-gene')).toBe('targets-gene')
    expect(normalizeAxis('atc-class')).toBe('atc-class')
  })

  test('case-insensitive', () => {
    expect(normalizeAxis('TARGETS_GENE')).toBe('targets-gene')
    expect(normalizeAxis('Trial_Phase')).toBe('trial-phase')
  })

  test('returns null for unknown axis', () => {
    expect(normalizeAxis('targets_disease')).toBe(null)
    expect(normalizeAxis('mechanism')).toBe(null)
    expect(normalizeAxis('')).toBe(null)
    expect(normalizeAxis(42 as unknown as string)).toBe(null)
  })
})

describe('extractHypothesisSeedJson', () => {
  test('extracts JSON from a fenced ```json block', () => {
    const raw = '```json\n[{"axis":"targets_gene","value":"EGFR"}]\n```'
    expect(extractHypothesisSeedJson(raw)).toBe('[{"axis":"targets_gene","value":"EGFR"}]')
  })

  test('falls back to the first balanced [...] in raw text', () => {
    const raw = 'Here you go: [{"axis":"trial_phase","value":"3"}]'
    expect(extractHypothesisSeedJson(raw)).toBe('[{"axis":"trial_phase","value":"3"}]')
  })

  test('returns empty string when no JSON found', () => {
    expect(extractHypothesisSeedJson('I cannot answer that.')).toBe('')
  })
})

describe('validateHypothesisSeed — happy path', () => {
  test('accepts 2 valid filters in underscore form', () => {
    const raw = '```json\n[{"axis":"targets_gene","value":"EGFR"},{"axis":"trial_phase","value":"3"}]\n```'
    const result = validateHypothesisSeed(raw)
    expect(result.ok).toBe(true)
    expect(result.filters).toEqual([
      { axis: 'targets-gene', value: 'EGFR' },
      { axis: 'trial-phase', value: '3' },
    ])
  })

  test('accepts 3 filters mixing underscore and hyphen forms', () => {
    const raw = '```json\n[{"axis":"targets_gene","value":"BRCA1"},{"axis":"indicated-for","value":"breast cancer"},{"axis":"atc_class","value":"L01"}]\n```'
    const result = validateHypothesisSeed(raw)
    expect(result.ok).toBe(true)
    expect(result.filters).toHaveLength(3)
    expect(result.filters[0].axis).toBe('targets-gene')
    expect(result.filters[1].axis).toBe('indicated-for')
    expect(result.filters[2].axis).toBe('atc-class')
  })

  test('trims value whitespace', () => {
    const raw = '```json\n[{"axis":"targets_gene","value":"  EGFR  "},{"axis":"trial_phase","value":"3"}]\n```'
    const result = validateHypothesisSeed(raw)
    expect(result.ok).toBe(true)
    expect(result.filters[0].value).toBe('EGFR')
  })
})

describe('validateHypothesisSeed — malformed output', () => {
  test('rejects non-JSON output', () => {
    const result = validateHypothesisSeed('Cannot generate filters.')
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/no JSON/i)
  })

  test('rejects malformed JSON inside the fence', () => {
    const result = validateHypothesisSeed('```json\n[{"axis":"targets_gene"\n```')
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/parse/i)
  })

  test('rejects fewer than 2 filters', () => {
    const raw = '```json\n[{"axis":"targets_gene","value":"EGFR"}]\n```'
    const result = validateHypothesisSeed(raw)
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/2-3/)
  })

  test('rejects more than 3 filters', () => {
    const raw = '```json\n[{"axis":"targets_gene","value":"EGFR"},{"axis":"trial_phase","value":"3"},{"axis":"atc_class","value":"L01"},{"axis":"indicated_for","value":"cancer"}]\n```'
    const result = validateHypothesisSeed(raw)
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/2-3/)
  })

  test('rejects an invalid axis id', () => {
    const raw = '```json\n[{"axis":"target","value":"EGFR"},{"axis":"trial_phase","value":"3"}]\n```'
    const result = validateHypothesisSeed(raw)
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/invalid axis/i)
  })

  test('rejects an empty value', () => {
    const raw = '```json\n[{"axis":"targets_gene","value":""},{"axis":"trial_phase","value":"3"}]\n```'
    const result = validateHypothesisSeed(raw)
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/value/i)
  })

  test('rejects a non-array root', () => {
    const raw = '```json\n{"axis":"targets_gene","value":"EGFR"}\n```'
    const result = validateHypothesisSeed(raw)
    expect(result.ok).toBe(false)
  })
})

describe('buildHypothesisSeedUrl', () => {
  test('produces a /hypothesis URL with seed param', () => {
    const url = buildHypothesisSeedUrl([
      { axis: 'targets-gene', value: 'EGFR' },
      { axis: 'trial-phase', value: '3' },
    ])
    expect(url).toMatch(/^\/hypothesis\?seed=/)
    const seedParam = url.split('seed=')[1]
    const decoded = JSON.parse(decodeURIComponent(seedParam))
    expect(decoded).toEqual([
      { axis: 'targets-gene', value: 'EGFR' },
      { axis: 'trial-phase', value: '3' },
    ])
  })
})
