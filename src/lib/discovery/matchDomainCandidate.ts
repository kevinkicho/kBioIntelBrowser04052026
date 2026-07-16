/**
 * Pair legacy rank DTO with domain v2 candidate.
 * Primary: index-aligned when lengths match; fallback: CID then normalized name.
 * @see docs/design/discovery-workbench-v2.md §6.2.2
 */

import type { CandidateMolecule } from '@/lib/candidateRanker'
import type { MoleculeCandidate } from '@/lib/domain'

export function matchDomainCandidate(
  legacy: CandidateMolecule,
  index: number,
  v2Candidates: MoleculeCandidate[] | undefined,
  legacyCount: number,
): MoleculeCandidate | undefined {
  if (!v2Candidates?.length) return undefined
  if (v2Candidates.length === legacyCount) {
    return v2Candidates[index]
  }
  // Fallback: CID then normalized name (never invent scores)
  if (legacy.cid != null) {
    const byCid = v2Candidates.find((c) => c.identity.pubchemCid === legacy.cid)
    if (byCid) return byCid
  }
  const nameKey = legacy.name.trim().toLowerCase()
  return v2Candidates.find((c) => c.identity.name.trim().toLowerCase() === nameKey)
}
