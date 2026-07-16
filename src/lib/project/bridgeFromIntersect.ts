/**
 * Bridge set-ops Hypothesis Builder matches → project board candidates.
 * Does NOT unify Hypothesis (set-ops) with ResearchHypothesis types (KD17).
 */

import type { IntersectedMatch } from '@/lib/hypothesis/types'
import type { MoleculeCandidate } from '@/lib/domain'
import { computeCandidateId } from '@/lib/domain/candidateId'
import { assessIdentityTrust } from '@/lib/domain/identity'
import type { Project } from '@/lib/domain'
import {
  addCandidateAndSave,
  createAndSaveProject,
  listProjects,
  type StoreResult,
} from './store'

/** Map a set-ops intersect match into a domain MoleculeCandidate. */
export function intersectMatchToCandidate(match: IntersectedMatch): MoleculeCandidate {
  const cid = match.cid
  const trust = assessIdentityTrust({ cid, name: match.name })
  return {
    candidateId: computeCandidateId({ name: match.name, pubchemCid: cid }),
    identity: {
      name: match.name,
      synonyms: [],
      pubchemCid: cid,
      identityTrust: trust.level,
    },
    origins: ['hypothesis-intersect'],
    evidenceBreadthSources: ['hypothesis-builder'],
    links: [],
    boardStatus: 'untriaged',
  }
}

export interface SendIntersectToBoardInput {
  matches: IntersectedMatch[]
  /** Existing project id, or create new when omitted */
  projectId?: string
  newProjectName?: string
  /** Max matches to add (default 50) */
  limit?: number
}

export interface SendIntersectToBoardResult {
  project: Project
  added: number
  skipped: number
  errors: string[]
}

/**
 * Add intersect matches to a project board.
 * Creates a project if projectId missing.
 */
export function sendIntersectMatchesToBoard(
  input: SendIntersectToBoardInput,
): StoreResult<SendIntersectToBoardResult> {
  const limit = input.limit ?? 50
  const matches = input.matches.slice(0, limit)

  let projectId = input.projectId
  if (!projectId) {
    const name =
      input.newProjectName?.trim() ||
      `Hypothesis board ${new Date().toISOString().slice(0, 10)}`
    const created = createAndSaveProject({ name })
    if (!created.ok) return created
    projectId = created.value.id
  }

  let added = 0
  let skipped = 0
  const errors: string[] = []
  let lastProject: Project | null = null

  for (const m of matches) {
    const candidate = intersectMatchToCandidate(m)
    const res = addCandidateAndSave(projectId, candidate)
    if (!res.ok) {
      if (res.error === 'cap_exceeded') {
        skipped += matches.length - added - skipped
        errors.push(res.message)
        break
      }
      skipped++
      errors.push(res.message)
      continue
    }
    added++
    lastProject = res.value
  }

  if (!lastProject) {
    // re-fetch if all skipped but project exists
    const listed = listProjects().find((p) => p.id === projectId)
    if (!listed) {
      return { ok: false, error: 'not_found', message: 'Project not found after add attempts' }
    }
    lastProject = listed
  }

  return {
    ok: true,
    value: { project: lastProject, added, skipped, errors },
  }
}
