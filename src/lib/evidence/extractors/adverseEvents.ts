/**
 * Extract safety claims from openFDA / FAERS adverse-event DTOs.
 * Statements emphasize reporting counts — not incidence (scientific integrity).
 */

import type { EvidenceClaim } from '@/lib/domain/entities'
import type { AdverseEvent } from '@/lib/types'
import { buildClaim } from '../buildClaim'
import type { ClaimExtractorContext } from '../context'
import { applyLimit } from '../context'

export const OPENFDA_AE_SOURCE = 'OpenFDA (FAERS)'

function aeStatement(ae: AdverseEvent, moleculeName?: string): string {
  const drug = moleculeName?.trim() || ae.drugName?.trim() || 'drug'
  const reaction = ae.reactionName?.trim() || ae.reaction?.trim() || 'adverse reaction'
  const count = Number.isFinite(ae.count) ? ae.count : 0
  const serious = Number.isFinite(ae.serious) ? ae.serious : 0
  return (
    `FAERS reports ${count} case(s) of ${reaction} for ${drug}` +
    (serious > 0 ? ` (${serious} serious)` : '') +
    ' — reporting counts, not incidence'
  )
}

/**
 * Pure: map adverse events → EvidenceClaim[] (claimType: safety).
 */
export function extractClaimsFromAdverseEvents(
  events: readonly AdverseEvent[] | null | undefined,
  ctx: ClaimExtractorContext,
): EvidenceClaim[] {
  if (!events?.length) return []

  const claims: EvidenceClaim[] = []
  for (const ae of applyLimit([...events], ctx.limit)) {
    const reaction = ae.reactionName?.trim() || ae.reaction?.trim()
    if (!reaction) continue

    const naturalKey =
      ae.id?.trim() ||
      [ae.drugName, reaction, ae.count, ae.serious].filter((x) => x != null).join('|')

    claims.push(
      buildClaim({
        claimType: 'safety',
        source: OPENFDA_AE_SOURCE,
        naturalKey,
        statement: aeStatement(ae, ctx.moleculeName),
        ctx,
        evidenceRefId: ae.id || naturalKey,
        quote: reaction,
        sourceUrl: 'https://open.fda.gov/apis/drug/event/',
        citations: [
          {
            source: OPENFDA_AE_SOURCE,
            url: 'https://open.fda.gov/apis/drug/event/',
            title: `FAERS: ${reaction}`,
          },
        ],
      }),
    )
  }
  return claims
}
