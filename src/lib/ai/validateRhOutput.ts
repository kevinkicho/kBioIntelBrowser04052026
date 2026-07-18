/**
 * Validate structured Research Hypothesis AI output against claim allowlist.
 */

import type { RhAiMode, RhStructuredInsight } from './rhContracts'
import { minClaimsForRhMode } from './rhContracts'

export interface RhValidationResult {
  ok: boolean
  insight?: RhStructuredInsight
  refused: boolean
  refuseReason?: string
  errors: string[]
}

function asStringArray(v: unknown, max = 12): string[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out = v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, max)
  return out.length ? out : undefined
}

/**
 * Parse model JSON and validate claimIds ⊆ allowlist.
 */
export function validateRhAiOutput(
  raw: string,
  allowlist: readonly string[],
  mode: RhAiMode,
): RhValidationResult {
  const errors: string[] = []
  const allow = new Set(allowlist)

  let parsed: unknown
  try {
    const trimmed = raw.trim()
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

  const nextSteps = asStringArray(o.nextSteps, 8)
  const risks = asStringArray(o.risks, 8)
  const overclaims = asStringArray(o.overclaims, 10)

  let sections: RhStructuredInsight['sections']
  if (o.sections && typeof o.sections === 'object') {
    const s = o.sections as Record<string, unknown>
    sections = {
      workingClaim: typeof s.workingClaim === 'string' ? s.workingClaim.trim() : undefined,
      supporting: asStringArray(s.supporting, 12),
      killCriteria: asStringArray(s.killCriteria, 8),
      openQuestions: asStringArray(s.openQuestions, 8),
      falsifiers: asStringArray(s.falsifiers, 8),
    }
  }

  let rivals: RhStructuredInsight['rivals']
  if (Array.isArray(o.rivals)) {
    rivals = []
    for (const r of o.rivals.slice(0, 5)) {
      if (!r || typeof r !== 'object') continue
      const rr = r as Record<string, unknown>
      const role = rr.role
      if (role !== 'primary' && role !== 'rival' && role !== 'null') continue
      const title = typeof rr.title === 'string' ? rr.title.trim() : ''
      const thesis = typeof rr.thesis === 'string' ? rr.thesis.trim() : ''
      if (!title && !thesis) continue
      rivals.push({ role, title: title || role, thesis: thesis || title })
    }
    if (!rivals.length) rivals = undefined
  }

  let experiments: RhStructuredInsight['experiments']
  if (Array.isArray(o.experiments)) {
    experiments = []
    for (const e of o.experiments.slice(0, 5)) {
      if (!e || typeof e !== 'object') continue
      const ee = e as Record<string, unknown>
      const description = typeof ee.description === 'string' ? ee.description.trim() : ''
      if (!description) continue
      const relRaw = Array.isArray(ee.relatedClaimIds) ? ee.relatedClaimIds : []
      const relatedClaimIds = relRaw
        .filter((x): x is string => typeof x === 'string' && allow.has(x))
        .slice(0, 8)
      const priority =
        ee.priority === 'high' || ee.priority === 'medium' || ee.priority === 'low'
          ? ee.priority
          : undefined
      const costTier =
        ee.costTier === 'low' || ee.costTier === 'medium' || ee.costTier === 'high'
          ? ee.costTier
          : undefined
      experiments.push({
        description: description.slice(0, 2000),
        rationale: typeof ee.rationale === 'string' ? ee.rationale.slice(0, 1000) : undefined,
        priority,
        relatedClaimIds: relatedClaimIds.length ? relatedClaimIds : claimIds.slice(0, 5),
        experimentType: typeof ee.experimentType === 'string' ? ee.experimentType : undefined,
        successCriteria:
          typeof ee.successCriteria === 'string' ? ee.successCriteria.slice(0, 500) : undefined,
        failCriteria:
          typeof ee.failCriteria === 'string' ? ee.failCriteria.slice(0, 500) : undefined,
        costTier,
      })
    }
    if (!experiments.length) experiments = undefined
  }

  let gaps: RhStructuredInsight['gaps']
  if (Array.isArray(o.gaps)) {
    gaps = []
    for (const g of o.gaps.slice(0, 12)) {
      if (!g || typeof g !== 'object') continue
      const gg = g as Record<string, unknown>
      const message = typeof gg.message === 'string' ? gg.message.trim() : ''
      if (!message) continue
      gaps.push({
        facet: typeof gg.facet === 'string' ? gg.facet : 'other',
        message: message.slice(0, 500),
        suggestedAction:
          typeof gg.suggestedAction === 'string'
            ? gg.suggestedAction.slice(0, 500)
            : 'Re-export pack after loading Core panels',
      })
    }
    if (!gaps.length) gaps = undefined
  }

  const minClaims = minClaimsForRhMode(mode)
  if (allowlist.length < minClaims) {
    return {
      ok: true,
      refused: true,
      refuseReason: `Insufficient claims (${allowlist.length}; need ≥${minClaims} for ${mode})`,
      errors,
      insight: {
        summary: summary || 'Insufficient evidence for claim-bound synthesis.',
        claimIds,
        confidence: 'insufficient',
        nextSteps: nextSteps ?? [
          'Download an evidence pack from the board',
          'Rebuild claims on this hypothesis',
        ],
        risks,
      },
    }
  }

  if (orphans.length && claimIds.length === 0 && minClaims > 0) {
    return {
      ok: false,
      refused: true,
      refuseReason: 'All cited claimIds were invalid (not in allowlist)',
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
      nextSteps,
      risks,
      sections,
      rivals,
      experiments,
      gaps,
      overclaims,
    },
  }
}
