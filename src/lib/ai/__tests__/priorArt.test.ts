import {
  extractPriorArtQuery,
  validatePriorArtQuery,
} from '@/lib/ai/aiTasks/priorArt'

describe('extractPriorArtQuery', () => {
  test('returns the raw query when no wrapping', () => {
    const raw = '("aspirin" OR "acetylsalicylic acid") AND ("COX-1" OR "COX-2")'
    expect(extractPriorArtQuery(raw)).toBe(raw)
  })

  test('strips a fenced code block', () => {
    const raw = '```\n("aspirin" OR "ASA") AND ("COX")\n```'
    expect(extractPriorArtQuery(raw)).toBe('("aspirin" OR "ASA") AND ("COX")')
  })

  test('strips a "Query:" prefix', () => {
    const raw = 'Query: ("metformin") AND ("AMPK")'
    expect(extractPriorArtQuery(raw)).toBe('("metformin") AND ("AMPK")')
  })

  test('strips outer wrapping quotes when safe', () => {
    const raw = '"(metformin OR glucophage) AND AMPK"'
    expect(extractPriorArtQuery(raw)).toBe('(metformin OR glucophage) AND AMPK')
  })

  test('keeps multi-line query but picks the longest line with parens', () => {
    const raw = 'Some preamble.\n("ibuprofen" OR "advil") AND ("COX")'
    expect(extractPriorArtQuery(raw)).toBe('("ibuprofen" OR "advil") AND ("COX")')
  })
})

describe('validatePriorArtQuery — happy path', () => {
  test('accepts a balanced query containing the molecule name', () => {
    const raw = '("aspirin" OR "acetylsalicylic acid") AND ("COX-1" OR "COX-2") AND (prevention OR therapy)'
    const result = validatePriorArtQuery(raw, { name: 'Aspirin' })
    expect(result.ok).toBe(true)
    expect(result.query).toBe(raw)
  })

  test('case-insensitive name match', () => {
    const raw = '("ASPIRIN") AND ("COX")'
    const result = validatePriorArtQuery(raw, { name: 'aspirin' })
    expect(result.ok).toBe(true)
  })

  test('matches a synonym instead of primary name', () => {
    const raw = '("acetylsalicylic acid") AND ("COX-1")'
    const result = validatePriorArtQuery(raw, {
      name: 'Aspirin',
      synonyms: ['acetylsalicylic acid', 'ASA'],
    })
    expect(result.ok).toBe(true)
  })
})

describe('validatePriorArtQuery — malformed output', () => {
  test('rejects empty output', () => {
    const result = validatePriorArtQuery('', { name: 'Aspirin' })
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/empty/i)
  })

  test('rejects unbalanced parentheses (extra open)', () => {
    const raw = '("aspirin" AND ("COX"'
    const result = validatePriorArtQuery(raw, { name: 'Aspirin' })
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/parentheses/i)
  })

  test('rejects unbalanced parentheses (extra close)', () => {
    const raw = '"aspirin") AND ("COX"'
    const result = validatePriorArtQuery(raw, { name: 'Aspirin' })
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/parentheses/i)
  })

  test('rejects unmatched double quotes', () => {
    const raw = '("aspirin OR acetylsalicylic acid") AND ("COX-1)'
    const result = validatePriorArtQuery(raw, { name: 'Aspirin' })
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/quote/i)
  })

  test('rejects query that does not mention the molecule name', () => {
    const raw = '("ibuprofen") AND ("COX")'
    const result = validatePriorArtQuery(raw, { name: 'Aspirin' })
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/Aspirin|synonym/i)
  })
})
