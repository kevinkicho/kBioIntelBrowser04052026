/**
 * ResearchHypothesis store (project-scoped narrative hypotheses).
 * Distinct from set-ops `/hypothesis` types (KD17).
 */

import type {
  ResearchHypothesis,
  ResearchHypothesisRole,
  ResearchHypothesisSections,
  ResearchHypothesisStatus,
  NextExperiment,
} from '@/lib/domain'
import type { StoreResult, ProjectStorage } from './store'
import { getProject, saveProject } from './store'

export const RESEARCH_HYPOTHESIS_KEY_PREFIX = 'biointel-research-hypothesis-v1-'
export const MAX_THESIS_CHARS = 20_000
export const MAX_HYPOTHESES_PER_PROJECT = 30

function nowIso(): string {
  return new Date().toISOString()
}

function newId(): string {
  return `rh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function defaultStorage(): ProjectStorage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function researchHypothesisKey(id: string): string {
  return `${RESEARCH_HYPOTHESIS_KEY_PREFIX}${id}`
}

export interface CreateResearchHypothesisInput {
  projectId: string
  title: string
  thesis: string
  diseaseId?: string
  targetIds?: string[]
  candidateIds?: string[]
  claimIds?: string[]
  packId?: string
  nextExperiments?: NextExperiment[]
  status?: ResearchHypothesisStatus
  role?: ResearchHypothesisRole
  rivalOfId?: string
  sections?: ResearchHypothesisSections
  killedReason?: string
}

export function createResearchHypothesis(input: CreateResearchHypothesisInput): ResearchHypothesis {
  const ts = nowIso()
  return {
    id: newId(),
    projectId: input.projectId,
    version: 1,
    title: (input.title.trim() || 'Untitled hypothesis').slice(0, 200),
    thesis: (input.thesis || '').slice(0, MAX_THESIS_CHARS),
    diseaseId: input.diseaseId,
    targetIds: input.targetIds ?? [],
    candidateIds: input.candidateIds ?? [],
    claimIds: input.claimIds ?? [],
    packId: input.packId,
    nextExperiments: input.nextExperiments,
    status: input.status ?? 'draft',
    role: input.role ?? 'primary',
    rivalOfId: input.rivalOfId,
    sections: input.sections,
    killedReason: input.killedReason,
    createdAt: ts,
    updatedAt: ts,
  }
}

export function isResearchHypothesis(v: unknown): v is ResearchHypothesis {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.projectId === 'string' &&
    typeof o.title === 'string' &&
    typeof o.thesis === 'string' &&
    typeof o.version === 'number' &&
    Array.isArray(o.candidateIds) &&
    Array.isArray(o.claimIds)
  )
}

export function saveResearchHypothesis(
  hyp: ResearchHypothesis,
  storage: ProjectStorage | null = defaultStorage(),
): StoreResult<ResearchHypothesis> {
  if (!storage) {
    return { ok: false, error: 'unavailable', message: 'localStorage is not available.' }
  }
  try {
    storage.setItem(researchHypothesisKey(hyp.id), JSON.stringify(hyp))
    const proj = getProject(hyp.projectId, storage)
    if (proj) {
      const ids = new Set(proj.researchHypothesisIds ?? [])
      ids.add(hyp.id)
      if (ids.size > MAX_HYPOTHESES_PER_PROJECT) {
        return {
          ok: false,
          error: 'cap_exceeded',
          message: `Max ${MAX_HYPOTHESES_PER_PROJECT} research hypotheses per project.`,
        }
      }
      const saved = saveProject(
        { ...proj, researchHypothesisIds: Array.from(ids), updatedAt: nowIso() },
        storage,
      )
      if (!saved.ok) {
        return { ok: false, error: saved.error, message: saved.message }
      }
    }
    return { ok: true, value: hyp }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/quota/i.test(msg)) {
      return {
        ok: false,
        error: 'quota_exceeded',
        message: 'Browser storage is full. Export projects to free space.',
      }
    }
    return { ok: false, error: 'invalid', message: msg }
  }
}

export function getResearchHypothesis(
  id: string,
  storage: ProjectStorage | null = defaultStorage(),
): StoreResult<ResearchHypothesis> {
  if (!storage) return { ok: false, error: 'unavailable', message: 'localStorage unavailable' }
  try {
    const raw = storage.getItem(researchHypothesisKey(id))
    if (!raw) return { ok: false, error: 'not_found', message: `Hypothesis ${id} not found` }
    const parsed = JSON.parse(raw) as unknown
    if (!isResearchHypothesis(parsed)) {
      return { ok: false, error: 'invalid', message: 'Corrupt research hypothesis payload' }
    }
    return { ok: true, value: parsed }
  } catch {
    return { ok: false, error: 'invalid', message: 'Failed to parse research hypothesis' }
  }
}

export function listResearchHypothesesForProject(
  projectId: string,
  storage: ProjectStorage | null = defaultStorage(),
): ResearchHypothesis[] {
  const proj = getProject(projectId, storage)
  if (!proj) return []
  const out: ResearchHypothesis[] = []
  for (const id of proj.researchHypothesisIds ?? []) {
    const h = getResearchHypothesis(id, storage)
    if (h.ok) out.push(h.value)
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/**
 * Delete a research hypothesis from localStorage and unlink from project.
 */
export function deleteResearchHypothesis(
  id: string,
  storage: ProjectStorage | null = defaultStorage(),
): StoreResult<{ id: string }> {
  if (!storage) {
    return { ok: false, error: 'unavailable', message: 'localStorage is not available.' }
  }
  if (!id) {
    return { ok: false, error: 'invalid', message: 'Hypothesis id required.' }
  }
  try {
    const existing = getResearchHypothesis(id, storage)
    const projectId = existing.ok ? existing.value.projectId : null
    storage.removeItem(researchHypothesisKey(id))
    if (projectId) {
      const proj = getProject(projectId, storage)
      if (proj) {
        const ids = (proj.researchHypothesisIds ?? []).filter((x) => x !== id)
        const saved = saveProject(
          { ...proj, researchHypothesisIds: ids, updatedAt: nowIso() },
          storage,
        )
        if (!saved.ok) {
          return { ok: false, error: saved.error, message: saved.message }
        }
      }
    }
    return { ok: true, value: { id } }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: 'invalid', message: msg }
  }
}

/**
 * Delete all RHs for a project that have zero claim ids (template/scaffold noise).
 * Returns number removed.
 */
export function deleteEmptyClaimResearchHypotheses(
  projectId: string,
  storage: ProjectStorage | null = defaultStorage(),
): StoreResult<{ removed: number; ids: string[] }> {
  const list = listResearchHypothesesForProject(projectId, storage)
  const empty = list.filter((h) => !h.claimIds?.length)
  const ids: string[] = []
  for (const h of empty) {
    const r = deleteResearchHypothesis(h.id, storage)
    if (r.ok) ids.push(h.id)
  }
  return { ok: true, value: { removed: ids.length, ids } }
}

/**
 * Seed a ResearchHypothesis from an evidence pack + optional thesis.
 * Pure builder; caller persists via saveResearchHypothesis.
 */
export function seedResearchHypothesisFromPack(input: {
  projectId: string
  packId: string
  packTitle: string
  claimIds: string[]
  candidateIds?: string[]
  diseaseId?: string
  targetIds?: string[]
  thesis?: string
  status?: ResearchHypothesisStatus
  role?: ResearchHypothesisRole
  sections?: ResearchHypothesisSections
}): ResearchHypothesis {
  return createResearchHypothesis({
    projectId: input.projectId,
    title: `From pack: ${input.packTitle}`.slice(0, 200),
    thesis:
      input.thesis?.trim() ||
      [
        `Working claim: Investigation thesis seeded from evidence pack "${input.packTitle}" (${input.claimIds.length} claims).`,
        '',
        'Supporting scaffold: edit with mechanisms, indication links, and trial landscape from pack claims.',
        'Kill criteria: safety / identity / empty target link — fill after claim-bound AI or manual review.',
        'Open questions: what free public panels are still missing?',
        'Falsifiers: which result would make this thesis wrong?',
        '',
        'Use RH AI (thesis draft, gap map, next experiments, adversarial review) with rehydrated claims — investigation priority only.',
      ].join('\n'),
    diseaseId: input.diseaseId,
    targetIds: input.targetIds ?? [],
    candidateIds: input.candidateIds ?? [],
    claimIds: input.claimIds.slice(0, 200),
    packId: input.packId,
    status: input.status ?? 'draft',
    role: input.role ?? 'primary',
    sections: input.sections,
  })
}

/** Create a rival / null hypothesis linked to a primary. */
export function createRivalHypothesis(
  primary: ResearchHypothesis,
  input: {
    title: string
    thesis: string
    role: 'rival' | 'null'
    claimIds?: string[]
  },
): ResearchHypothesis {
  return createResearchHypothesis({
    projectId: primary.projectId,
    title: input.title.slice(0, 200),
    thesis: input.thesis.slice(0, MAX_THESIS_CHARS),
    diseaseId: primary.diseaseId,
    targetIds: primary.targetIds,
    candidateIds: primary.candidateIds,
    claimIds: input.claimIds ?? primary.claimIds,
    packId: primary.packId,
    status: 'draft',
    role: input.role,
    rivalOfId: primary.id,
  })
}

/** Update thesis/title/experiments/status and bump version. */
export function updateResearchHypothesis(
  hyp: ResearchHypothesis,
  patch: Partial<
    Pick<
      ResearchHypothesis,
      | 'title'
      | 'thesis'
      | 'claimIds'
      | 'candidateIds'
      | 'nextExperiments'
      | 'status'
      | 'role'
      | 'rivalOfId'
      | 'sections'
      | 'killedReason'
      | 'targetIds'
    >
  >,
): ResearchHypothesis {
  return {
    ...hyp,
    title: patch.title !== undefined ? (patch.title.trim() || hyp.title).slice(0, 200) : hyp.title,
    thesis:
      patch.thesis !== undefined
        ? (patch.thesis || '').slice(0, MAX_THESIS_CHARS)
        : hyp.thesis,
    claimIds: patch.claimIds ?? hyp.claimIds,
    candidateIds: patch.candidateIds ?? hyp.candidateIds,
    nextExperiments: patch.nextExperiments ?? hyp.nextExperiments,
    status: patch.status !== undefined ? patch.status : hyp.status,
    role: patch.role !== undefined ? patch.role : hyp.role,
    rivalOfId: patch.rivalOfId !== undefined ? patch.rivalOfId : hyp.rivalOfId,
    sections: patch.sections !== undefined ? patch.sections : hyp.sections,
    killedReason:
      patch.killedReason !== undefined ? patch.killedReason : hyp.killedReason,
    targetIds: patch.targetIds ?? hyp.targetIds,
    version: hyp.version + 1,
    updatedAt: nowIso(),
  }
}

export function appendNextExperiment(
  hyp: ResearchHypothesis,
  experiment: Omit<NextExperiment, 'id'> & { id?: string },
): ResearchHypothesis {
  const exp: NextExperiment = {
    id: experiment.id ?? `ne_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    description: experiment.description.slice(0, 2000),
    rationale: experiment.rationale,
    priority: experiment.priority,
    relatedClaimIds: experiment.relatedClaimIds,
  }
  return updateResearchHypothesis(hyp, {
    nextExperiments: [...(hyp.nextExperiments ?? []), exp],
  })
}
