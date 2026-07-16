/**
 * Extract indicated-for / association claims from Open Targets disease DTOs.
 */

import type { EvidenceClaim } from '@/lib/domain/entities'
import type { DiseaseAssociation } from '@/lib/types'
import { buildClaim } from '../buildClaim'
import type { ClaimExtractorContext } from '../context'
import { applyLimit } from '../context'

export const OPEN_TARGETS_SOURCE = 'Open Targets'

function otStatement(d: DiseaseAssociation, moleculeName?: string): string {
  const subject = moleculeName?.trim() || 'Molecule'
  const disease = d.diseaseName?.trim() || d.diseaseId || 'disease'
  const idBit = d.diseaseId?.trim() ? ` (${d.diseaseId.trim()})` : ''
  const scoreBit =
    d.score != null && Number.isFinite(d.score) && d.score > 0
      ? `; association score ${Number(d.score).toFixed(3)}`
      : ''
  const evidenceBit =
    d.evidenceCount != null && d.evidenceCount > 0
      ? `; evidence count ${d.evidenceCount}`
      : ''
  return `${subject} linked to ${disease}${idBit}${scoreBit}${evidenceBit} (Open Targets)`
}

/**
 * Pure: map Open Targets disease associations → EvidenceClaim[] (claimType: indicated-for).
 * Note: OT linkedDiseases / known-drug paths are association evidence, not regulatory labels.
 */
export function extractClaimsFromOpenTargets(
  associations: readonly DiseaseAssociation[] | null | undefined,
  ctx: ClaimExtractorContext,
): EvidenceClaim[] {
  if (!associations?.length) return []

  const claims: EvidenceClaim[] = []
  for (const d of applyLimit([...associations], ctx.limit)) {
    const diseaseId = d.diseaseId?.trim()
    const diseaseName = d.diseaseName?.trim()
    if (!diseaseId && !diseaseName) continue

    const naturalKey = diseaseId || diseaseName!
    const sourceUrl = diseaseId
      ? `https://platform.opentargets.org/disease/${encodeURIComponent(diseaseId)}`
      : 'https://platform.opentargets.org/'

    claims.push(
      buildClaim({
        claimType: 'indicated-for',
        source: OPEN_TARGETS_SOURCE,
        naturalKey,
        statement: otStatement(d, ctx.moleculeName),
        ctx,
        sourceUrl,
        evidenceRefId: naturalKey,
        diseaseId: diseaseId || undefined,
        quote: diseaseName || undefined,
        citations: [
          {
            source: OPEN_TARGETS_SOURCE,
            url: sourceUrl,
            title: diseaseName || diseaseId,
          },
        ],
      }),
    )
  }
  return claims
}
