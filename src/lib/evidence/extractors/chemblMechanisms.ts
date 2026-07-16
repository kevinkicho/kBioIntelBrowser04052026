/**
 * Extract mechanism claims from ChEMBL mechanism DTOs.
 */

import type { EvidenceClaim } from '@/lib/domain/entities'
import type { ChemblMechanism } from '@/lib/types'
import { buildClaim } from '../buildClaim'
import type { ClaimExtractorContext } from '../context'
import { applyLimit } from '../context'

export const CHEMBL_MECHANISM_SOURCE = 'ChEMBL Mechanisms'

function mechanismStatement(m: ChemblMechanism, moleculeName?: string): string {
  const subject = moleculeName?.trim() || m.moleculeName?.trim() || 'Molecule'
  const moa = m.mechanismOfAction?.trim()
  const action = m.actionType?.trim()
  const target = m.targetName?.trim() || m.targetChemblId || 'target'
  const direct = m.directInteraction ? '; direct interaction' : ''
  const phase =
    m.maxPhase != null && m.maxPhase > 0 ? `; max phase ${m.maxPhase}` : ''

  if (moa) {
    return `${subject}: ${moa}${direct}${phase} (ChEMBL mechanism)`
  }
  if (action) {
    return `${subject}: ${action} of ${target}${direct}${phase} (ChEMBL mechanism)`
  }
  return `${subject} has a recorded mechanism involving ${target}${direct}${phase} (ChEMBL)`
}

/**
 * Pure: map ChEMBL mechanisms → EvidenceClaim[] (claimType: mechanism).
 */
export function extractClaimsFromChemblMechanisms(
  mechanisms: readonly ChemblMechanism[] | null | undefined,
  ctx: ClaimExtractorContext,
): EvidenceClaim[] {
  if (!mechanisms?.length) return []

  const claims: EvidenceClaim[] = []
  for (const m of applyLimit([...mechanisms], ctx.limit)) {
    const naturalKey =
      m.mechanismId?.trim() ||
      [m.targetChemblId, m.actionType, m.mechanismOfAction].filter(Boolean).join('|')
    if (!naturalKey) continue

    claims.push(
      buildClaim({
        claimType: 'mechanism',
        source: CHEMBL_MECHANISM_SOURCE,
        naturalKey,
        statement: mechanismStatement(m, ctx.moleculeName),
        ctx,
        sourceUrl: m.url || undefined,
        evidenceRefId: m.mechanismId || naturalKey,
        targetId: m.targetChemblId || undefined,
        quote: m.mechanismOfAction || m.actionType || undefined,
        citations: m.url
          ? [
              {
                source: CHEMBL_MECHANISM_SOURCE,
                url: m.url,
                title: m.mechanismOfAction || m.targetName,
              },
            ]
          : undefined,
      }),
    )
  }
  return claims
}
