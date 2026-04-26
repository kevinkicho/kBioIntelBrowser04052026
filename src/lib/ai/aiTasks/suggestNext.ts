/**
 * Post-processor + validator for the `suggest_next` AI mode.
 *
 * Parses a fenced JSON code block; expects an array of 3-5 entity refs.
 */

export type SuggestedEntityType = 'molecule' | 'gene' | 'disease'

export interface SuggestedEntity {
  type: SuggestedEntityType
  name: string
  reason: string
}

export interface SuggestNextValidationResult {
  ok: boolean
  entities: SuggestedEntity[]
  reason?: string
}

const VALID_TYPES: SuggestedEntityType[] = ['molecule', 'gene', 'disease']

/**
 * Pull the JSON payload out of a fenced block. Falls back to the longest
 * `[...]` substring if the model forgot the fences.
 */
export function extractSuggestNextJson(rawOutput: string): string {
  if (!rawOutput) return ''
  const text = rawOutput.trim()

  const fenceMatch = text.match(/```(?:json|[\w-]*)?\s*([\s\S]*?)\s*```/i)
  if (fenceMatch) return fenceMatch[1].trim()

  // Fallback: first balanced JSON array.
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start >= 0 && end > start) {
    return text.slice(start, end + 1).trim()
  }
  return ''
}

export function validateSuggestNext(rawOutput: string): SuggestNextValidationResult {
  const json = extractSuggestNextJson(rawOutput)
  if (!json) {
    return { ok: false, entities: [], reason: 'No JSON array found in output.' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (err) {
    return {
      ok: false,
      entities: [],
      reason: `JSON parse failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  if (!Array.isArray(parsed)) {
    return { ok: false, entities: [], reason: 'Expected a JSON array.' }
  }
  if (parsed.length < 3 || parsed.length > 5) {
    return {
      ok: false,
      entities: [],
      reason: `Expected 3-5 suggestions, got ${parsed.length}.`,
    }
  }

  const entities: SuggestedEntity[] = []
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i]
    if (!item || typeof item !== 'object') {
      return {
        ok: false,
        entities: [],
        reason: `Entry ${i} is not an object.`,
      }
    }
    const obj = item as Record<string, unknown>
    const type = obj.type
    const name = obj.name
    const reason = obj.reason

    if (typeof type !== 'string' || !VALID_TYPES.includes(type as SuggestedEntityType)) {
      return {
        ok: false,
        entities: [],
        reason: `Entry ${i} has invalid type "${String(type)}". Must be one of: ${VALID_TYPES.join(', ')}.`,
      }
    }
    if (typeof name !== 'string' || !name.trim()) {
      return {
        ok: false,
        entities: [],
        reason: `Entry ${i} has empty or non-string name.`,
      }
    }
    if (typeof reason !== 'string' || !reason.trim()) {
      return {
        ok: false,
        entities: [],
        reason: `Entry ${i} has empty or non-string reason.`,
      }
    }

    entities.push({
      type: type as SuggestedEntityType,
      name: name.trim(),
      reason: reason.trim(),
    })
  }

  return { ok: true, entities }
}
