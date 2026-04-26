import {
  splitDiffSafetyParagraphs,
  validateDiffSafety,
} from '@/lib/ai/aiTasks/diffSafety'

describe('splitDiffSafetyParagraphs', () => {
  test('splits on blank lines', () => {
    const raw = 'First paragraph here.\n\nSecond paragraph here.\n\nThird paragraph.'
    expect(splitDiffSafetyParagraphs(raw)).toEqual([
      'First paragraph here.',
      'Second paragraph here.',
      'Third paragraph.',
    ])
  })

  test('strips a fenced code block wrapper', () => {
    const raw = '```\nP1\n\nP2\n\nP3\n```'
    expect(splitDiffSafetyParagraphs(raw)).toEqual(['P1', 'P2', 'P3'])
  })

  test('handles trailing whitespace and empty paragraphs', () => {
    const raw = '\n\nP1\n\n\n\nP2\n\n  \n\nP3   \n\n'
    expect(splitDiffSafetyParagraphs(raw)).toEqual(['P1', 'P2', 'P3'])
  })
})

describe('validateDiffSafety — happy path', () => {
  test('accepts a 3-paragraph differential with both names', () => {
    const raw = [
      'Both Aspirin and Ibuprofen share GI bleeding as a common adverse event due to COX inhibition.',
      'Aspirin uniquely causes Reye syndrome in pediatric viral infections, while Ibuprofen is associated with renal complications.',
      'Aspirin is FDA-approved without a boxed warning for cardioprotection; Ibuprofen carries a cardiovascular boxed warning.',
    ].join('\n\n')
    const result = validateDiffSafety(raw, 'Aspirin', 'Ibuprofen')
    expect(result.ok).toBe(true)
    expect(result.paragraphCount).toBe(3)
  })

  test('accepts a 5-paragraph differential', () => {
    const raw = [
      'Aspirin and Metformin share gastrointestinal side effects.',
      'Aspirin is associated with bleeding; Metformin is associated with lactic acidosis.',
      'The severity of Aspirin AEs is generally bleeding-related, while Metformin AEs are metabolic.',
      'Both are widely approved without boxed warnings in standard use.',
      'Long-term safety profiles differ: Aspirin has a chronic-bleeding signal, Metformin has a B12 deficiency signal.',
    ].join('\n\n')
    const result = validateDiffSafety(raw, 'Aspirin', 'Metformin')
    expect(result.ok).toBe(true)
    expect(result.paragraphCount).toBe(5)
  })

  test('case-insensitive name match', () => {
    const raw = [
      'ASPIRIN and IBUPROFEN both cause GI bleeding.',
      'Their renal profiles differ.',
      'Both are approved.',
    ].join('\n\n')
    const result = validateDiffSafety(raw, 'Aspirin', 'Ibuprofen')
    expect(result.ok).toBe(true)
  })
})

describe('validateDiffSafety — malformed output', () => {
  test('rejects fewer than 3 paragraphs', () => {
    const raw = 'Aspirin and Ibuprofen are both NSAIDs.\n\nThey share AEs.'
    const result = validateDiffSafety(raw, 'Aspirin', 'Ibuprofen')
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/3-6/)
    expect(result.paragraphCount).toBe(2)
  })

  test('rejects more than 6 paragraphs', () => {
    const raw = Array.from({ length: 7 }, (_, i) =>
      `Paragraph ${i + 1} mentioning Aspirin and Ibuprofen.`,
    ).join('\n\n')
    const result = validateDiffSafety(raw, 'Aspirin', 'Ibuprofen')
    expect(result.ok).toBe(false)
    expect(result.paragraphCount).toBe(7)
  })

  test('rejects when current molecule name is missing', () => {
    const raw = [
      'This drug shares AEs with Ibuprofen.',
      'Renal differences exist with Ibuprofen.',
      'Both have approved status.',
    ].join('\n\n')
    const result = validateDiffSafety(raw, 'Aspirin', 'Ibuprofen')
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/Aspirin/)
  })

  test('rejects when comparison molecule name is missing', () => {
    const raw = [
      'Aspirin shares AEs with the comparison drug.',
      'Renal differences exist between the two NSAIDs.',
      'Both have approved status.',
    ].join('\n\n')
    const result = validateDiffSafety(raw, 'Aspirin', 'Ibuprofen')
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/Ibuprofen/)
  })

  test('rejects empty output', () => {
    const result = validateDiffSafety('', 'Aspirin', 'Ibuprofen')
    expect(result.ok).toBe(false)
    expect(result.paragraphCount).toBe(0)
  })
})
