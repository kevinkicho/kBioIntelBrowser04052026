/**
 * Aggregate Core-panel claim extractors into a single claim list.
 * Packs cap ≤200 claims (design §5.4); default totalCap enforces this.
 */

import type { EvidenceClaim } from '@/lib/domain/entities'
import type {
  AdverseEvent,
  ChemblActivity,
  ChemblMechanism,
  ClinicalTrial,
  DiseaseAssociation,
} from '@/lib/types'
import type { ClaimExtractorContext } from './context'
import {
  extractClaimsFromAdverseEvents,
  extractClaimsFromChemblActivities,
  extractClaimsFromChemblMechanisms,
  extractClaimsFromClinicalTrials,
  extractClaimsFromOpenTargets,
} from './extractors'

/** Design §5.4 — versioned packs ≤200 claims. */
export const DEFAULT_CLAIM_TOTAL_CAP = 200

/** Core panel DTO bag used by profile / discovery depth. */
export interface CorePanelEvidenceInput {
  chemblActivities?: readonly ChemblActivity[] | null
  chemblMechanisms?: readonly ChemblMechanism[] | null
  adverseEvents?: readonly AdverseEvent[] | null
  clinicalTrials?: readonly ClinicalTrial[] | null
  diseaseAssociations?: readonly DiseaseAssociation[] | null
}

export interface ExtractAllOptions extends ClaimExtractorContext {
  /**
   * Hard cap across all extractors after merge (default 200).
   * Pass null to disable.
   */
  totalCap?: number | null
  /**
   * Prefer higher-signal facets first when trimming to totalCap.
   * Default order: mechanism → binds-target → indicated-for → trial → safety → other.
   */
  preferFacetOrder?: boolean
}

const FACET_PRIORITY: Record<string, number> = {
  mechanism: 0,
  'binds-target': 1,
  'indicated-for': 2,
  trial: 3,
  safety: 4,
  property: 5,
  literature: 6,
  other: 7,
}

function sortByFacetPriority(claims: EvidenceClaim[]): EvidenceClaim[] {
  return [...claims].sort((a, b) => {
    const pa = FACET_PRIORITY[a.claimType] ?? 99
    const pb = FACET_PRIORITY[b.claimType] ?? 99
    if (pa !== pb) return pa - pb
    return a.id.localeCompare(b.id)
  })
}

/**
 * Deduplicate by claim id (content-addressed); first wins.
 */
export function dedupeClaimsById(claims: readonly EvidenceClaim[]): EvidenceClaim[] {
  const seen = new Set<string>()
  const out: EvidenceClaim[] = []
  for (const c of claims) {
    if (seen.has(c.id)) continue
    seen.add(c.id)
    out.push(c)
  }
  return out
}

/**
 * Pure: extract EvidenceClaim[] from Core panel DTOs.
 * All provenance.retrievedAt values come from ctx.retrievedAt.
 */
export function extractClaimsFromCorePanels(
  panels: CorePanelEvidenceInput,
  options: ExtractAllOptions,
): EvidenceClaim[] {
  const { totalCap = DEFAULT_CLAIM_TOTAL_CAP, preferFacetOrder = true, ...ctx } = options

  const raw: EvidenceClaim[] = [
    ...extractClaimsFromChemblMechanisms(panels.chemblMechanisms, ctx),
    ...extractClaimsFromChemblActivities(panels.chemblActivities, ctx),
    ...extractClaimsFromOpenTargets(panels.diseaseAssociations, ctx),
    ...extractClaimsFromClinicalTrials(panels.clinicalTrials, ctx),
    ...extractClaimsFromAdverseEvents(panels.adverseEvents, ctx),
  ]

  let claims = dedupeClaimsById(raw)
  if (preferFacetOrder) {
    claims = sortByFacetPriority(claims)
  }

  if (totalCap != null && totalCap >= 0 && claims.length > totalCap) {
    claims = claims.slice(0, totalCap)
  }

  return claims
}

/** Facet / claimType counts for pack completeness gates (AI PR13). */
export function countClaimsByType(
  claims: readonly EvidenceClaim[],
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const c of claims) {
    counts[c.claimType] = (counts[c.claimType] ?? 0) + 1
  }
  return counts
}

/** Distinct provenance.source values — evidence breadth chips. */
export function claimSourceNames(claims: readonly EvidenceClaim[]): string[] {
  const sources = new Set<string>()
  for (const c of claims) {
    if (c.provenance?.source) sources.add(c.provenance.source)
  }
  return [...sources].sort()
}
