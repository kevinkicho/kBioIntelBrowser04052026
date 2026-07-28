/**
 * Optional PubChem similarity expansion for promoted board seeds (PR17)
 * and post-CID Discover shortlist expansion (bounded + novelty penalty).
 */

import { getSimilarMolecules, type SimilarMolecule } from '@/lib/api/pubchem-similar'
import type { MoleculeCandidate } from '@/lib/domain'
import { computeCandidateId } from '@/lib/domain/candidateId'
import { assessIdentityTrust } from '@/lib/domain/identity'
import type { CandidateMolecule } from './types'

/** Max seed CIDs to expand during Discover rank (latency budget). */
export const RANK_SIMILARITY_SEED_MAX = 3
/** Neighbors per seed in rank path. */
export const RANK_SIMILARITY_NEIGHBORS = 2
/** Multiply seed composite when attaching neighbors (novelty / analog penalty). */
export const RANK_SIMILARITY_SCORE_PENALTY = 0.72

export interface SimilarityExpandResult {
  seedCid: number
  neighbors: MoleculeCandidate[]
  raw: SimilarMolecule[]
}

export function similarMoleculeToCandidate(sim: SimilarMolecule): MoleculeCandidate {
  const trust = assessIdentityTrust({ cid: sim.cid, name: sim.name })
  return {
    candidateId: computeCandidateId({ name: sim.name, pubchemCid: sim.cid }),
    identity: {
      name: sim.name,
      synonyms: [],
      pubchemCid: sim.cid,
      identityTrust: trust.level,
    },
    origins: ['similarity'],
    evidenceBreadthSources: ['pubchem-similarity'],
    links: [{ type: 'similar-to', evidenceRefIds: [] }],
    boardStatus: 'untriaged',
  }
}

/**
 * Expand a seed CID to similar candidates (server-safe).
 */
export async function expandSimilarCandidates(
  seedCid: number,
  options?: { max?: number },
): Promise<SimilarityExpandResult> {
  const max = options?.max ?? 5
  if (!seedCid || seedCid < 1) {
    return { seedCid, neighbors: [], raw: [] }
  }
  const raw = (await getSimilarMolecules(seedCid)).slice(0, max)
  const neighbors = raw.map(similarMoleculeToCandidate)
  return { seedCid, neighbors, raw }
}

/**
 * Legacy rank-path neighbor from PubChem similar (cheap score only).
 */
export function similarToLegacyCandidate(
  sim: SimilarMolecule,
  seed: CandidateMolecule,
  penalty: number = RANK_SIMILARITY_SCORE_PENALTY,
): CandidateMolecule {
  const composite = Math.max(0, Math.min(1, seed.compositeScore * penalty))
  return {
    name: sim.name,
    cid: sim.cid,
    clinicalPhase: seed.clinicalPhase * 0.5,
    geneAssociationScore: seed.geneAssociationScore * 0.4,
    sharedTargetRatio: seed.sharedTargetRatio * 0.4,
    trialCountNorm: 0,
    clinicalPhaseRaw: 0,
    sharedTargetCountRaw: 0,
    trialCountRaw: 0,
    geneScoreRaw: 0,
    sources: Array.from(new Set([...seed.sources.slice(0, 2), 'PubChem similar'])),
    confidence: 'preliminary',
    compositeScore: composite,
  }
}

export interface RankSimilarityExpandResult {
  candidates: CandidateMolecule[]
  added: number
  seedCids: number[]
  warnings: string[]
}

/**
 * After identity resolve: expand top seeds with CID via PubChem 2D similarity.
 * Skips names already present; applies novelty penalty to composite.
 */
export async function expandRankShortlistBySimilarity(
  shortlist: CandidateMolecule[],
  options?: {
    seedMax?: number
    neighborsPerSeed?: number
    penalty?: number
    /** Existing lower-case names to avoid duplicates */
    existingNames?: Set<string>
  },
): Promise<RankSimilarityExpandResult> {
  const warnings: string[] = []
  const seedMax = options?.seedMax ?? RANK_SIMILARITY_SEED_MAX
  const neighborsPerSeed = options?.neighborsPerSeed ?? RANK_SIMILARITY_NEIGHBORS
  const penalty = options?.penalty ?? RANK_SIMILARITY_SCORE_PENALTY
  const existing = options?.existingNames ?? new Set(shortlist.map((c) => c.name.toLowerCase()))
  const existingCids = new Set(
    shortlist.map((c) => c.cid).filter((c): c is number => c != null && c > 0),
  )

  const seeds = shortlist
    .filter((c) => c.cid != null && c.cid > 0)
    .slice(0, seedMax)

  if (seeds.length === 0) {
    return { candidates: [], added: 0, seedCids: [], warnings }
  }

  const seedCids = seeds.map((s) => s.cid!)
  const added: CandidateMolecule[] = []

  // Sequential to respect PubChem rate; small seed count
  for (const seed of seeds) {
    try {
      const raw = (await getSimilarMolecules(seed.cid!)).slice(0, neighborsPerSeed + 1)
      for (const sim of raw) {
        if (sim.cid === seed.cid) continue
        if (existingCids.has(sim.cid)) continue
        const key = sim.name.toLowerCase()
        if (existing.has(key)) continue
        existing.add(key)
        existingCids.add(sim.cid)
        added.push(similarToLegacyCandidate(sim, seed, penalty))
        if (added.length >= seedMax * neighborsPerSeed) break
      }
    } catch {
      warnings.push(`Similarity expand failed for CID ${seed.cid}`)
    }
    if (added.length >= seedMax * neighborsPerSeed) break
  }

  if (added.length > 0) {
    warnings.push(
      `Similarity expand: +${added.length} PubChem analogs from ${seedCids.length} seed CID(s) (novelty penalty ${penalty}).`,
    )
  }

  return { candidates: added, added: added.length, seedCids, warnings }
}
