/**
 * Core domain entities for the Discovery Workbench (v1 shapes).
 * API DTOs remain in src/lib/types.ts; discovery ranker DTOs in candidateRanker.ts.
 * @see docs/design/discovery-workbench-v1.md §3.1
 */

import type { IdentityTrustLevel } from './identity'
import type { ScoreRubric, ScoreVector } from './score'

export type EpistemicStatus =
  | 'supported'
  | 'empty'
  | 'error'
  | 'timeout'
  | 'disabled'
  | 'not-retrieved'

export type BoardStatus = 'untriaged' | 'promote' | 'hold' | 'kill' | 'watching'

export type DiseaseIdNamespace = 'efo' | 'mondo' | 'orphanet' | 'mesh' | 'ot' | 'name'

export interface DiseaseEntity {
  id: string
  idNamespace: DiseaseIdNamespace
  name: string
  synonyms: string[]
  description?: string
  therapeuticAreas: string[]
  xrefs: Array<{ system: string; id: string }>
  identityTrust: IdentityTrustLevel
}

export interface TargetEntity {
  id: string
  symbol: string
  name?: string
  uniprotAccessions: string[]
  chemblTargetIds?: string[]
  organism: 'human' | string
  associationToDisease?: {
    diseaseId: string
    score: number
    datatypeScores?: Record<string, number>
    source: string
  }
  identityTrust: IdentityTrustLevel
}

export type CandidateOrigin =
  | 'opentargets-known-drug'
  | 'dgidb'
  | 'chembl-activity'
  | 'chembl-indication'
  | 'clinicaltrials-intervention'
  | 'bindingdb-enrichment'
  | 'similarity'
  | 'hypothesis-intersect'
  | 'manual'

export interface MoleculeIdentity {
  inchiKey?: string
  smiles?: string
  pubchemCid: number | null
  chemblId?: string
  chebiId?: string
  drugbankId?: string
  name: string
  synonyms: string[]
  identityTrust: IdentityTrustLevel
  alternateCids?: number[]
}

export type CandidateLinkType =
  | 'binds-target'
  | 'indicated-for'
  | 'trial-for'
  | 'similar-to'
  | 'associated'

export interface CandidateLink {
  type: CandidateLinkType
  targetId?: string
  diseaseId?: string
  evidenceRefIds: string[]
}

export interface MoleculeCandidate {
  candidateId: string
  identity: MoleculeIdentity
  origins: CandidateOrigin[]
  evidenceBreadthSources: string[]
  links: CandidateLink[]
  scores?: ScoreVector
  boardStatus?: BoardStatus
}

/** Mandatory provenance on every evidence claim (KD4). */
export interface ClaimProvenance {
  source: string
  sourceUrl?: string
  retrievedAt: string
  /** Optional stable ref into source payload / panel */
  evidenceRefId?: string
  quote?: string
}

export type EvidenceClaimType =
  | 'binds-target'
  | 'indicated-for'
  | 'mechanism'
  | 'trial'
  | 'safety'
  | 'property'
  | 'literature'
  | 'other'

export interface EvidenceClaim {
  id: string
  statement: string
  claimType: EvidenceClaimType
  subjectCandidateId?: string
  targetId?: string
  diseaseId?: string
  /** Epistemic status of the backing retrieval */
  epistemicStatus: EpistemicStatus
  provenance: ClaimProvenance
  citations?: Array<{ title?: string; url?: string; source: string }>
}

export interface NextExperiment {
  id: string
  description: string
  rationale?: string
  priority?: 'high' | 'medium' | 'low'
  relatedClaimIds?: string[]
}

/**
 * Research hypothesis under a project (not set-ops `/hypothesis`).
 * Thesis storage ≤20k chars (design §3.3).
 */
export interface ResearchHypothesis {
  id: string
  projectId: string
  version: number
  title: string
  thesis: string
  diseaseId?: string
  targetIds: string[]
  candidateIds: string[]
  claimIds: string[]
  packId?: string
  nextExperiments?: NextExperiment[]
  createdAt: string
  updatedAt: string
}

export interface ProjectPackIndexEntry {
  id: string
  title: string
  createdAt: string
  candidateCount?: number
}

/**
 * Local-first project board (≤50 candidates).
 * Storage key pattern: biointel-project-v1-{id}
 */
/** Sticky discovery prefs snapshotted at project create (v2). Optional for legacy boards. */
export interface ProjectPreferencesSnapshot {
  rubricPreset?: string
  aeAggressiveness?: 'soft-flag' | 'hard-penalty'
  harvestTiming?: 'board-promote' | 'rank-time'
}

export interface Project {
  schemaVersion: 1
  id: string
  name: string
  description?: string
  disease?: DiseaseEntity | null
  targetIds: string[]
  /** Board candidates (max 50 recommended) */
  candidates: MoleculeCandidate[]
  rubric?: ScoreRubric
  /** Discovery prefs at stamp time (export round-trip) */
  preferencesSnapshot?: ProjectPreferencesSnapshot
  packIndex: ProjectPackIndexEntry[]
  researchHypothesisIds?: string[]
  createdAt: string
  updatedAt: string
}

/** Convenience aliases matching informal design names */
export type Disease = DiseaseEntity
export type Target = TargetEntity
