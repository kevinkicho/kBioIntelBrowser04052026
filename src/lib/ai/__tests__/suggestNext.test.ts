import {
  extractSuggestNextJson,
  validateSuggestNext,
} from '@/lib/ai/aiTasks/suggestNext'

describe('extractSuggestNextJson', () => {
  test('extracts JSON from a fenced ```json block', () => {
    const raw = '```json\n[{"type":"gene","name":"EGFR","reason":"top target"}]\n```'
    expect(extractSuggestNextJson(raw)).toBe('[{"type":"gene","name":"EGFR","reason":"top target"}]')
  })

  test('extracts JSON from a fence without language tag', () => {
    const raw = '```\n[{"type":"molecule","name":"X","reason":"y"}]\n```'
    expect(extractSuggestNextJson(raw)).toContain('molecule')
  })

  test('falls back to the longest [...] in raw text', () => {
    const raw = 'Here is my answer: [{"type":"disease","name":"NSCLC","reason":"shared targets"}] hope this helps'
    expect(extractSuggestNextJson(raw)).toBe('[{"type":"disease","name":"NSCLC","reason":"shared targets"}]')
  })

  test('returns empty string when no JSON-like content', () => {
    expect(extractSuggestNextJson('I cannot help with that.')).toBe('')
  })
})

describe('validateSuggestNext — happy path', () => {
  test('accepts a 3-entity array', () => {
    const raw = `\`\`\`json
[
  {"type": "gene", "name": "EGFR", "reason": "Top binding target above."},
  {"type": "molecule", "name": "Gefitinib", "reason": "Same EGFR mechanism."},
  {"type": "disease", "name": "NSCLC", "reason": "Shared target landscape."}
]
\`\`\``
    const result = validateSuggestNext(raw)
    expect(result.ok).toBe(true)
    expect(result.entities).toHaveLength(3)
    expect(result.entities[0]).toEqual({ type: 'gene', name: 'EGFR', reason: 'Top binding target above.' })
  })

  test('accepts a 5-entity array', () => {
    const arr = Array.from({ length: 5 }, (_, i) => ({
      type: 'gene' as const,
      name: `GENE${i}`,
      reason: 'reason text here',
    }))
    const raw = '```json\n' + JSON.stringify(arr) + '\n```'
    const result = validateSuggestNext(raw)
    expect(result.ok).toBe(true)
    expect(result.entities).toHaveLength(5)
  })

  test('trims whitespace in name and reason', () => {
    const raw = '```json\n[{"type":"gene","name":"  EGFR  ","reason":"  trim me  "},{"type":"molecule","name":"X","reason":"y"},{"type":"disease","name":"Z","reason":"w"}]\n```'
    const result = validateSuggestNext(raw)
    expect(result.ok).toBe(true)
    expect(result.entities[0].name).toBe('EGFR')
    expect(result.entities[0].reason).toBe('trim me')
  })
})

describe('validateSuggestNext — malformed output', () => {
  test('rejects non-JSON output', () => {
    const result = validateSuggestNext('Sorry, I cannot generate a suggestion.')
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/no JSON/i)
  })

  test('rejects malformed JSON inside the fence', () => {
    const result = validateSuggestNext('```json\n[{"type":"gene","name":"EGFR"}\n```')
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/parse/i)
  })

  test('rejects when length is below 3', () => {
    const raw = '```json\n[{"type":"gene","name":"EGFR","reason":"r"},{"type":"gene","name":"BRCA","reason":"r"}]\n```'
    const result = validateSuggestNext(raw)
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/3-5/)
  })

  test('rejects when length is above 5', () => {
    const arr = Array.from({ length: 6 }, (_, i) => ({ type: 'gene', name: `G${i}`, reason: 'r' }))
    const raw = '```json\n' + JSON.stringify(arr) + '\n```'
    const result = validateSuggestNext(raw)
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/3-5/)
  })

  test('rejects an invalid type value', () => {
    const raw = '```json\n[{"type":"protein","name":"x","reason":"y"},{"type":"gene","name":"a","reason":"b"},{"type":"gene","name":"c","reason":"d"}]\n```'
    const result = validateSuggestNext(raw)
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/invalid type/i)
  })

  test('rejects an empty name field', () => {
    const raw = '```json\n[{"type":"gene","name":"","reason":"r"},{"type":"gene","name":"a","reason":"b"},{"type":"gene","name":"c","reason":"d"}]\n```'
    const result = validateSuggestNext(raw)
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/name/i)
  })

  test('rejects a missing reason field', () => {
    const raw = '```json\n[{"type":"gene","name":"x"},{"type":"gene","name":"a","reason":"b"},{"type":"gene","name":"c","reason":"d"}]\n```'
    const result = validateSuggestNext(raw)
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/reason/i)
  })
})
