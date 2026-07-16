/**
 * ResearchHypothesis store (project-scoped narrative hypotheses).
 * Distinct from set-ops `/hypothesis` types (KD17).
 */

import type { ResearchHypothesis, NextExperiment, Project } from '@/lib/domain'
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
  thesis?: string
}): ResearchHypothesis {
  return createResearchHypothesis({
    projectId: input.projectId,
    title: `From pack: ${input.packTitle}`.slice(0, 200),
    thesis:
      input.thesis?.trim() ||
      `Working thesis seeded from evidence pack "${input.packTitle}" (${input.claimIds.length} claims). Edit this narrative with mechanisms, risks, and next experiments.`,
    diseaseId: input.diseaseId,
    candidateIds: input.candidateIds ?? [],
    claimIds: input.claimIds.slice(0, 200),
    packId: input.packId,
  })
}
