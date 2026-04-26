/**
 * Post-processor + validator for the `differential_safety` AI mode.
 *
 * Validates that the model produced 3-6 paragraphs (separated by blank lines),
 * and that both molecule names appear in the body somewhere.
 */

export interface DiffSafetyValidationResult {
  ok: boolean
  text: string
  paragraphCount: number
  reason?: string
}

/** Split on blank lines; trim each paragraph; drop empty ones. */
export function splitDiffSafetyParagraphs(rawOutput: string): string[] {
  if (!rawOutput) return []
  // Strip a fenced code block if the model wraps the response in one.
  let text = rawOutput.trim()
  const fenceMatch = text.match(/```(?:[\w-]*)?\s*([\s\S]*?)\s*```/)
  if (fenceMatch) {
    text = fenceMatch[1].trim()
  }
  // Split on one-or-more blank lines (\n\n+, possibly with whitespace inside).
  const paras = text
    .split(/\n\s*\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
  return paras
}

export function validateDiffSafety(
  rawOutput: string,
  currentName: string,
  otherName: string,
): DiffSafetyValidationResult {
  const paras = splitDiffSafetyParagraphs(rawOutput)
  const text = paras.join('\n\n')
  const count = paras.length

  if (count < 3 || count > 6) {
    return {
      ok: false,
      text,
      paragraphCount: count,
      reason: `Expected 3-6 paragraphs, got ${count}.`,
    }
  }

  const haystack = text.toLowerCase()
  const currentOk = currentName && haystack.includes(currentName.toLowerCase())
  const otherOk = otherName && haystack.includes(otherName.toLowerCase())

  if (!currentOk || !otherOk) {
    const missing: string[] = []
    if (!currentOk) missing.push(currentName)
    if (!otherOk) missing.push(otherName)
    return {
      ok: false,
      text,
      paragraphCount: count,
      reason: `Missing molecule name(s) in output: ${missing.join(', ')}.`,
    }
  }

  return { ok: true, text, paragraphCount: count }
}
