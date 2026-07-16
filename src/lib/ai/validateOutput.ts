/**
 * Validate structured AI pack output against claim allowlist.
 */

import type { PackAiMode, StructuredInsight } from './contracts'
import { minClaimsForPackMode } from './contracts'

export interface ValidationResult {
  ok: boolean
  insight?: StructuredInsight
  refused: boolean
  refuseReason?: string
  errors: string[]
}

function isConfidence(v: unknown): v is StructuredInsight['confidence'] {
  return v === 'high' || v === 'medium' || v === 'low' || v === 'insufficient'
}

/**
 * Parse model JSON text and validate claimIds ⊆ allowlist.
 * Orphan claimIds are stripped and reported; if none remain and mode requires
 * claims, the response is refused.
 */
export function validatePackAiOutput(
  raw: string,
  allowlist: readonly string[],
  mode: PackAiMode,
): ValidationResult {
  const errors: string[] = []
  const allow = new Set(allowlist)

  let parsed: unknown
  try {
    const trimmed = raw.trim()
    // tolerate fenced JSON
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
    parsed = JSON.parse(fence ? fence[1].trim() : trimmed)
  } catch {
    return {
      ok: false,
      refused: true,
      refuseReason: 'Model output was not valid JSON',
      errors: ['invalid_json'],
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      ok: false,
      refused: true,
      refuseReason: 'Model output was not an object',
      errors: ['invalid_shape'],
    }
  }

  const o = parsed as Record<string, unknown>
  const summary = typeof o.summary === 'string' ? o.summary.trim() : ''
  if (!summary) errors.push('missing_summary')

  const rawIds = Array.isArray(o.claimIds) ? o.claimIds : []
  const claimIds: string[] = []
  const orphans: string[] = []
  for (const id of rawIds) {
    if (typeof id !== 'string') continue
    if (allow.has(id)) claimIds.push(id)
    else orphans.push(id)
  }
  if (orphans.length) errors.push(`orphan_claim_ids:${orphans.slice(0, 5).join(',')}`)

  const confidence = isConfidence(o.confidence) ? o.confidence : 'low'
  if (!isConfidence(o.confidence)) errors.push('invalid_confidence')

  const nextSteps = Array.isArray(o.nextSteps)
    ? o.nextSteps.filter((x): x is string => typeof x === 'string').slice(0, 8)
    : undefined
  const risks = Array.isArray(o.risks)
    ? o.risks.filter((x): x is string => typeof x === 'string').slice(0, 8)
    : undefined

  const minClaims = minClaimsForPackMode(mode)
  if (allowlist.length < minClaims || confidence === 'insufficient' || claimIds.length === 0 && minClaims > 0) {
    if (allowlist.length < minClaims) {
      return {
        ok: true,
        refused: true,
        refuseReason: `Insufficient evidence in pack (${allowlist.length} claims; need ≥${minClaims} for ${mode})`,
        errors,
        insight: {
          summary: summary || 'Insufficient evidence for deep synthesis.',
          claimIds,
          confidence: 'insufficient',
          nextSteps: ['Load more Core panels', 'Re-export pack after data arrives'],
          risks,
        },
      }
    }
  }

  if (orphans.length && claimIds.length === 0 && minClaims > 0) {
    return {
      ok: false,
      refused: true,
      refuseReason: 'All cited claimIds were invalid (not in pack allowlist)',
      errors,
    }
  }

  if (!summary) {
    return { ok: false, refused: true, refuseReason: 'Empty summary', errors }
  }

  return {
    ok: true,
    refused: false,
    errors,
    insight: {
      summary,
      claimIds,
      confidence,
      nextSteps,
      risks,
    },
  }
}
