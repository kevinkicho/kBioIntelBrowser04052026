/**
 * Pure normalization helpers used by legacy cheap scoring.
 * Formulas intentionally unchanged from candidateRanker (multi-axis = PR4).
 */

export function normalizeLog(value: number, maxValue: number): number {
  if (maxValue <= 0) return 0
  return Math.min(1, Math.log2(1 + value) / Math.log2(1 + maxValue))
}

export function matchIndication(
  diseaseQuery: string,
  indications: { meshHeading: string; efoTerm: string; maxPhaseForIndication: number }[],
): number {
  const q = diseaseQuery.toLowerCase()
  const terms = q.split(/[\s,]+/).filter((t) => t.length > 2)
  let bestPhase = 0
  for (const ind of indications) {
    const heading = (ind.meshHeading || '').toLowerCase()
    const efo = (ind.efoTerm || '').toLowerCase()
    const matchCount = terms.filter((t) => heading.includes(t) || efo.includes(t)).length
    if (matchCount >= Math.ceil(terms.length * 0.5)) {
      const phase = ind.maxPhaseForIndication ?? 0
      if (phase > bestPhase) bestPhase = phase
    }
  }
  return bestPhase
}
