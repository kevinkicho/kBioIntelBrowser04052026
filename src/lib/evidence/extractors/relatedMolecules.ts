/**
 * Extract pack claims from disease-related molecules (with reason).
 * Prefer known_drug → indicated-for; gene-linked → other (honest epistemic).
 */

import type { EvidenceClaim } from '@/lib/domain/entities'
import type { DedupedDiseaseMolecule, DiseaseMolecule } from '@/lib/diseaseSearch'
import { buildClaim } from '../buildClaim'
import type { ClaimExtractorContext } from '../context'
import { applyLimit } from '../context'

export const RELATED_MOLECULE_SOURCE = 'Disease related molecules'

type RelatedMol = DiseaseMolecule | DedupedDiseaseMolecule

/**
 * Pure: map related molecules → EvidenceClaim[] with reason in statement.
 */
export function extractClaimsFromRelatedMolecules(
  molecules: readonly RelatedMol[] | null | undefined,
  ctx: ClaimExtractorContext & { diseaseName?: string },
): EvidenceClaim[] {
  if (!molecules?.length) return []

  const disease = ctx.diseaseName?.trim() || 'disease'
  const claims: EvidenceClaim[] = []

  for (const m of applyLimit([...molecules], ctx.limit)) {
    const name = m.name?.trim()
    if (!name) continue

    const kind = m.relationKind ?? 'disease_linked'
    const reason =
      m.reason?.trim() ||
      `Associated with ${disease} via public disease databases`
    const claimType = kind === 'known_drug' ? 'indicated-for' : 'other'
    const naturalKey = m.cid != null ? `cid:${m.cid}` : `name:${name.toLowerCase()}`
    const sourceUrl =
      m.cid != null
        ? `https://pubchem.ncbi.nlm.nih.gov/compound/${m.cid}`
        : undefined
    const sources =
      'sources' in m && Array.isArray(m.sources) && m.sources.length > 0
        ? m.sources.join(', ')
        : RELATED_MOLECULE_SOURCE

    claims.push(
      buildClaim({
        claimType,
        source: sources,
        naturalKey: `related:${naturalKey}`,
        statement: `${name} related to ${disease}: ${reason}`,
        ctx,
        sourceUrl,
        evidenceRefId: naturalKey,
        quote: reason,
        diseaseId: disease,
        citations: sourceUrl
          ? [{ source: sources, url: sourceUrl, title: name }]
          : [{ source: sources, title: name }],
        // Both are retrieved evidence. Weakness is claimType (other vs indicated-for)
        // + statement reason — do not overload epistemic "empty" (means no retrieval).
        epistemicStatus: 'supported',
      }),
    )
  }

  return claims
}
