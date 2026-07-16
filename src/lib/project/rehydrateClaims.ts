/**
 * Rehydrate EvidenceClaim statements for a ResearchHypothesis.
 * 1) IDB pack cache by packId
 * 2) Rebuild via buildBoardPackClaims
 * @see docs/design/discovery-workbench-v2.md §6.6.1
 */

import type { EvidenceClaim, Project, ResearchHypothesis } from '@/lib/domain'
import { getPackFromCache } from './packCache'
import { buildBoardPackClaims } from './packClaims'

export interface RehydrateResult {
  claims: EvidenceClaim[]
  source: 'idb' | 'rebuild' | 'none'
  error?: string
}

/**
 * Preserve hyp.claimIds order; fill statements from pack/rebuild.
 */
export function orderClaimsByIds(
  claimIds: string[],
  byId: Map<string, EvidenceClaim>,
): EvidenceClaim[] {
  const out: EvidenceClaim[] = []
  for (const id of claimIds) {
    const c = byId.get(id)
    if (c) out.push(c)
  }
  return out
}

export async function rehydrateClaimsForHypothesis(
  hyp: ResearchHypothesis,
  project: Project,
  opts?: { signal?: AbortSignal },
): Promise<RehydrateResult> {
  if (!hyp.claimIds?.length) {
    return { claims: [], source: 'none', error: 'No claim ids on this hypothesis' }
  }

  // 1) IDB cache
  if (hyp.packId) {
    try {
      const pack = await getPackFromCache(hyp.packId)
      if (pack?.claims?.length) {
        const map = new Map(pack.claims.map((c) => [c.id, c] as const))
        const ordered = orderClaimsByIds(hyp.claimIds, map)
        if (ordered.length > 0) {
          return { claims: ordered, source: 'idb' }
        }
      }
    } catch {
      // fall through to rebuild
    }
  }

  // 2) Rebuild from Core panels for related candidates
  try {
    const subset: Project = {
      ...project,
      candidates: project.candidates.filter(
        (c) =>
          hyp.candidateIds.includes(c.candidateId) ||
          c.boardStatus === 'promote' ||
          c.boardStatus === 'watching',
      ),
    }
    if (subset.candidates.length === 0) {
      subset.candidates = project.candidates
    }
    const built = await buildBoardPackClaims(subset, {
      maxCandidates: 5,
      signal: opts?.signal,
    })
    const map = new Map(built.claims.map((c) => [c.id, c] as const))
    let ordered = orderClaimsByIds(hyp.claimIds, map)

    // If ids don't match (rebuilt ids differ), show rebuilt claims as fallback statements
    if (ordered.length === 0 && built.claims.length > 0) {
      ordered = built.claims.slice(0, hyp.claimIds.length || 20)
      return {
        claims: ordered,
        source: 'rebuild',
        error:
          'Claim ids from seed did not match rebuild; showing freshly extracted claims instead.',
      }
    }
    if (ordered.length === 0) {
      return {
        claims: [],
        source: 'none',
        error: built.warnings[0] ?? 'Could not rebuild claims from Core panels',
      }
    }
    return { claims: ordered, source: 'rebuild' }
  } catch (err) {
    return {
      claims: [],
      source: 'none',
      error: err instanceof Error ? err.message : 'Rebuild failed',
    }
  }
}
