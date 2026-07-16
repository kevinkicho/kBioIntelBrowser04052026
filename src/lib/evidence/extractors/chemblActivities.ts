/**
 * Extract binds-target claims from ChEMBL activity DTOs.
 */

import type { EvidenceClaim } from '@/lib/domain/entities'
import type { ChemblActivity } from '@/lib/types'
import { buildClaim } from '../buildClaim'
import type { ClaimExtractorContext } from '../context'
import { applyLimit } from '../context'

export const CHEMBL_ACTIVITY_SOURCE = 'ChEMBL'

function formatActivityValue(a: ChemblActivity): string {
  const type = a.standardType || a.activityType || 'activity'
  const value =
    a.standardValue != null && !Number.isNaN(Number(a.standardValue))
      ? Number(a.standardValue)
      : a.activityValue != null && !Number.isNaN(Number(a.activityValue))
        ? Number(a.activityValue)
        : null
  const units = a.standardUnits || a.activityUnits || ''
  if (value == null) return type
  const unitPart = units ? ` ${units}` : ''
  return `${type} ${value}${unitPart}`.trim()
}

function activityStatement(a: ChemblActivity, moleculeName?: string): string {
  const subject = moleculeName?.trim() || a.chemblId || 'Molecule'
  const target = a.targetName?.trim() || a.targetChemblId || 'unknown target'
  const measured = formatActivityValue(a)
  const pchembl =
    a.pchemblValue != null && !Number.isNaN(Number(a.pchemblValue)) && Number(a.pchemblValue) > 0
      ? `; pChEMBL ${a.pchemblValue}`
      : ''
  return `${subject} shows ${measured} against ${target}${pchembl} (ChEMBL bioactivity)`
}

/**
 * Pure: map ChEMBL activities → EvidenceClaim[] (claimType: binds-target).
 * Skips rows with no target identity and no activity id.
 */
export function extractClaimsFromChemblActivities(
  activities: readonly ChemblActivity[] | null | undefined,
  ctx: ClaimExtractorContext,
): EvidenceClaim[] {
  if (!activities?.length) return []

  const claims: EvidenceClaim[] = []
  for (const a of applyLimit([...activities], ctx.limit)) {
    const naturalKey =
      a.activityId?.trim() ||
      [a.chemblId, a.targetChemblId, a.standardType || a.activityType, a.standardValue]
        .filter((x) => x != null && String(x).length > 0)
        .join('|')
    if (!naturalKey) continue
    if (!a.targetName && !a.targetChemblId) continue

    claims.push(
      buildClaim({
        claimType: 'binds-target',
        source: CHEMBL_ACTIVITY_SOURCE,
        naturalKey,
        statement: activityStatement(a, ctx.moleculeName),
        ctx,
        sourceUrl: a.url || undefined,
        evidenceRefId: a.activityId || naturalKey,
        targetId: a.targetChemblId || undefined,
        quote: a.targetName || undefined,
        citations: a.url
          ? [{ source: CHEMBL_ACTIVITY_SOURCE, url: a.url, title: a.targetName }]
          : undefined,
      }),
    )
  }
  return claims
}
