/**
 * Extract trial claims from ClinicalTrials.gov DTOs.
 */

import type { EvidenceClaim } from '@/lib/domain/entities'
import type { ClinicalTrial } from '@/lib/types'
import { buildClaim } from '../buildClaim'
import type { ClaimExtractorContext } from '../context'
import { applyLimit } from '../context'

export const CLINICAL_TRIALS_SOURCE = 'ClinicalTrials.gov'

function trialUrl(nctId: string): string {
  return `https://clinicaltrials.gov/study/${encodeURIComponent(nctId)}`
}

function trialStatement(t: ClinicalTrial, moleculeName?: string): string {
  const nct = t.nctId?.trim() || 'trial'
  const phase = t.phase && t.phase !== 'N/A' ? t.phase : 'unspecified phase'
  const status = t.status?.trim() || 'unknown status'
  const conditions =
    t.conditions?.length > 0 ? t.conditions.slice(0, 3).join('; ') : 'unspecified condition'
  const drugBit = moleculeName?.trim() ? ` involving ${moleculeName.trim()}` : ''
  const titleBit = t.title?.trim() ? `: ${t.title.trim()}` : ''
  return `${nct} (${phase}, ${status})${drugBit} for ${conditions}${titleBit}`
}

/**
 * Pure: map clinical trials → EvidenceClaim[] (claimType: trial).
 */
export function extractClaimsFromClinicalTrials(
  trials: readonly ClinicalTrial[] | null | undefined,
  ctx: ClaimExtractorContext,
): EvidenceClaim[] {
  if (!trials?.length) return []

  const claims: EvidenceClaim[] = []
  for (const t of applyLimit([...trials], ctx.limit)) {
    const nct = t.nctId?.trim()
    if (!nct) continue

    const url = trialUrl(nct)
    claims.push(
      buildClaim({
        claimType: 'trial',
        source: CLINICAL_TRIALS_SOURCE,
        naturalKey: nct,
        statement: trialStatement(t, ctx.moleculeName),
        ctx,
        sourceUrl: url,
        evidenceRefId: nct,
        quote: t.title || undefined,
        diseaseId: t.conditions?.[0] || undefined,
        citations: [
          {
            source: CLINICAL_TRIALS_SOURCE,
            url,
            title: t.title || nct,
          },
        ],
      }),
    )
  }
  return claims
}
