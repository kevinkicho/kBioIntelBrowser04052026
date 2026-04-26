/**
 * Post-processor + validator for the `hypothesis_seed` AI mode.
 *
 * Parses a fenced JSON code block; expects 2-3 filters whose axes map to the
 * Hypothesis Builder's FilterAxis type. Accepts both underscore (`targets_gene`)
 * and hyphen (`targets-gene`) forms because LLMs are inconsistent.
 */

import type { Filter, FilterAxis } from '@/lib/hypothesis/types'

/** Axis ids as the prompt presents them to the model (underscore form). */
export const PROMPT_AXIS_IDS = [
  'targets_gene',
  'indicated_for',
  'trial_phase',
  'atc_class',
] as const

export type PromptAxisId = typeof PROMPT_AXIS_IDS[number]

/** Map prompt-form axis id -> canonical hyphen form used by Hypothesis Builder. */
const AXIS_MAP: Record<PromptAxisId, FilterAxis> = {
  targets_gene: 'targets-gene',
  indicated_for: 'indicated-for',
  trial_phase: 'trial-phase',
  atc_class: 'atc-class',
}

export interface HypothesisSeedValidationResult {
  ok: boolean
  filters: Filter[]
  reason?: string
}

/** Pull the JSON payload out of a fenced block. */
export function extractHypothesisSeedJson(rawOutput: string): string {
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

/** Normalize an axis string from the model into the canonical FilterAxis. */
export function normalizeAxis(raw: unknown): FilterAxis | null {
  if (typeof raw !== 'string') return null
  const candidate = raw.trim().toLowerCase().replace(/-/g, '_')
  if ((PROMPT_AXIS_IDS as readonly string[]).includes(candidate)) {
    return AXIS_MAP[candidate as PromptAxisId]
  }
  return null
}

export function validateHypothesisSeed(rawOutput: string): HypothesisSeedValidationResult {
  const json = extractHypothesisSeedJson(rawOutput)
  if (!json) {
    return { ok: false, filters: [], reason: 'No JSON array found in output.' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (err) {
    return {
      ok: false,
      filters: [],
      reason: `JSON parse failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  if (!Array.isArray(parsed)) {
    return { ok: false, filters: [], reason: 'Expected a JSON array.' }
  }
  if (parsed.length < 2 || parsed.length > 3) {
    return {
      ok: false,
      filters: [],
      reason: `Expected 2-3 filters, got ${parsed.length}.`,
    }
  }

  const filters: Filter[] = []
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i]
    if (!item || typeof item !== 'object') {
      return { ok: false, filters: [], reason: `Entry ${i} is not an object.` }
    }
    const obj = item as Record<string, unknown>

    const axis = normalizeAxis(obj.axis)
    if (!axis) {
      return {
        ok: false,
        filters: [],
        reason: `Entry ${i} has invalid axis "${String(obj.axis)}". Must be one of: ${PROMPT_AXIS_IDS.join(', ')}.`,
      }
    }

    const value = obj.value
    if (typeof value !== 'string' || !value.trim()) {
      return {
        ok: false,
        filters: [],
        reason: `Entry ${i} has empty or non-string value.`,
      }
    }

    filters.push({ axis, value: value.trim() })
  }

  return { ok: true, filters }
}

/**
 * Build a URL fragment for /hypothesis that pre-populates the filter slots.
 * Encodes the filter array as a single `seed` query param (JSON-encoded).
 */
export function buildHypothesisSeedUrl(filters: Filter[]): string {
  const json = JSON.stringify(filters)
  return `/hypothesis?seed=${encodeURIComponent(json)}`
}
