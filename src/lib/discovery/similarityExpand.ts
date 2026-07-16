/**
 * Optional PubChem similarity expansion for promoted board seeds (PR17).
 */

import { getSimilarMolecules, type SimilarMolecule } from '@/lib/api/pubchem-similar'
import type { MoleculeCandidate } from '@/lib/domain'
import { computeCandidateId } from '@/lib/domain/candidateId'
import { assessIdentityTrust } from '@/lib/domain/identity'

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
