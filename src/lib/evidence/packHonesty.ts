/**
 * Pack honesty extras — surface negative / not-retrieved evidence in pack exports.
 * Pure; of-record framing only (empty ≠ zero association forever).
 */

import type { EvidenceClaim } from '@/lib/domain'

export interface PackHonestySummary {
  claimCount: number
  citableCount: number
  emptyOrMissingSources: string[]
  warnings: string[]
  /** Human-readable lines for pack JSON / RH seed */
  honestyLines: string[]
}

/**
 * Summarize pack claims for export honesty (soft M3 + negative-evidence language).
 */
export function summarizePackHonesty(
  claims: readonly EvidenceClaim[] | null | undefined,
  opts?: { minCitable?: number },
): PackHonestySummary {
  const list = claims ?? []
  const minCitable = opts?.minCitable ?? 5
  let citableCount = 0
  const sources = new Set<string>()
  const emptyOrMissing: string[] = []

  for (const c of list) {
    const prov = c.provenance
    const hasUrl = Boolean(typeof prov?.sourceUrl === 'string' && prov.sourceUrl.trim())
    const hasSource = Boolean(typeof prov?.source === 'string' && prov.source.trim())
    if (hasSource && prov?.source) sources.add(prov.source)
    if (hasSource && (hasUrl || (c.statement && c.statement.length >= 12))) {
      citableCount += 1
    }
    const st = String(c.epistemicStatus || '')
    if (
      st === 'empty' ||
      st === 'not_retrieved' ||
      st === 'timeout' ||
      /not retrieved|empty sample|timeout/i.test(c.statement || '')
    ) {
      emptyOrMissing.push(prov?.source || String(c.claimType) || 'unknown')
    }
  }

  const warnings: string[] = []
  if (list.length === 0) {
    warnings.push('No claims in pack — export is shell-only; rehydrate after Core panels load.')
  }
  if (citableCount < minCitable) {
    warnings.push(
      `Citable claims ${citableCount} < soft target ${minCitable} (M3) — densify Core extractors or accept sparse pack.`,
    )
  }
  if (emptyOrMissing.length > 0) {
    warnings.push(
      `${emptyOrMissing.length} empty/not-retrieved rows — not “no association forever”; retry free APIs with patience.`,
    )
  }

  const honestyLines = [
    'Free public APIs only · evidence-first · not regulatory decision support',
    `Claims: ${list.length} · citable (soft): ${citableCount} · sources: ${sources.size}`,
    ...warnings,
  ]

  return {
    claimCount: list.length,
    citableCount,
    emptyOrMissingSources: Array.from(new Set(emptyOrMissing)).slice(0, 20),
    warnings,
    honestyLines,
  }
}
