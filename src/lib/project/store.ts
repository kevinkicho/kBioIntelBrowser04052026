/**
 * Local-first project board store (localStorage).
 * Key pattern: biointel-project-v1-{id}; index: biointel-project-index-v1
 * Cap: ≤50 candidates per project. QuotaExceeded → never silent drop.
 * @see docs/design/discovery-workbench-v1.md §3.3, PR5
 */

import type { BoardStatus, MoleculeCandidate, Project, ProjectPackIndexEntry } from '@/lib/domain'
import type { DiseaseEntity } from '@/lib/domain'
import type { ScoreRubric } from '@/lib/domain'
import { mergeMoleculeCandidate } from '@/lib/domain'

export const PROJECT_KEY_PREFIX = 'biointel-project-v1-'
export const PROJECT_INDEX_KEY = 'biointel-project-index-v1'
export const MAX_CANDIDATES_PER_PROJECT = 50
export const MAX_PROJECTS = 50

export type StoreErrorCode =
  | 'quota_exceeded'
  | 'not_found'
  | 'invalid'
  | 'cap_exceeded'
  | 'unavailable'

export type StoreResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: StoreErrorCode; message: string }

/** Minimal storage interface for testability. */
export interface ProjectStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function defaultStorage(): ProjectStorage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function projectStorageKey(id: string): string {
  return `${PROJECT_KEY_PREFIX}${id}`
}

/**
 * Optional side effects after local save/delete (e.g. Firebase write-through).
 * Must never throw into the store path — callers wrap.
 */
export type ProjectMutateHook = {
  onSave?: (project: Project) => void
  onDelete?: (projectId: string) => void
}

const mutateHooks: ProjectMutateHook[] = []

/** Register a hook; returns unsubscribe. Safe for optional cloud sync. */
export function registerProjectMutateHook(hook: ProjectMutateHook): () => void {
  mutateHooks.push(hook)
  return () => {
    const i = mutateHooks.indexOf(hook)
    if (i >= 0) mutateHooks.splice(i, 1)
  }
}

function runSaveHooks(project: Project): void {
  for (const h of mutateHooks) {
    try {
      h.onSave?.(project)
    } catch {
      /* non-fatal */
    }
  }
}

function runDeleteHooks(projectId: string): void {
  for (const h of mutateHooks) {
    try {
      h.onDelete?.(projectId)
    } catch {
      /* non-fatal */
    }
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

function newId(): string {
  return `prj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function isQuotaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { name?: string; code?: number; message?: string }
  if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') return true
  if (e.code === 22 || e.code === 1014) return true
  if (typeof e.message === 'string' && /quota/i.test(e.message)) return true
  return false
}

const QUOTA_MESSAGE =
  'Browser storage is full. Export your projects to free space, then try again. No data was dropped.'

// ── Pure project builders / mutators ─────────────────────────────────────────

export interface CreateProjectInput {
  name: string
  description?: string
  disease?: DiseaseEntity | null
  targetIds?: string[]
  candidates?: MoleculeCandidate[]
  rubric?: ScoreRubric
  preferencesSnapshot?: Project['preferencesSnapshot']
  packIndex?: ProjectPackIndexEntry[]
  id?: string
}

/** Create a new Project entity (pure; does not persist). */
export function createProject(input: CreateProjectInput): Project {
  const ts = nowIso()
  const candidates = (input.candidates ?? []).slice(0, MAX_CANDIDATES_PER_PROJECT)
  return {
    schemaVersion: 1,
    id: input.id ?? newId(),
    name: (input.name.trim() || 'Untitled project').slice(0, 200),
    description: input.description?.trim() || undefined,
    disease: input.disease ?? null,
    targetIds: input.targetIds ?? [],
    candidates,
    rubric: input.rubric,
    preferencesSnapshot: input.preferencesSnapshot,
    packIndex: input.packIndex ?? [],
    researchHypothesisIds: [],
    createdAt: ts,
    updatedAt: ts,
  }
}

/**
 * Add or replace a candidate on a project board (pure).
 * Dedupes by candidateId. Caps at MAX_CANDIDATES_PER_PROJECT.
 */
export function addCandidateToProject(
  project: Project,
  candidate: MoleculeCandidate,
): StoreResult<Project> {
  if (!candidate?.candidateId) {
    return { ok: false, error: 'invalid', message: 'Candidate is missing candidateId.' }
  }

  const existingIdx = project.candidates.findIndex((c) => c.candidateId === candidate.candidateId)
  let nextCandidates: MoleculeCandidate[]

  if (existingIdx >= 0) {
    nextCandidates = project.candidates.map((c, i) =>
      i === existingIdx
        ? mergeMoleculeCandidate(c, candidate, project.rubric)
        : c,
    )
  } else {
    if (project.candidates.length >= MAX_CANDIDATES_PER_PROJECT) {
      return {
        ok: false,
        error: 'cap_exceeded',
        message: `Project board is full (max ${MAX_CANDIDATES_PER_PROJECT} candidates). Remove or kill some first.`,
      }
    }
    nextCandidates = [
      ...project.candidates,
      { ...candidate, boardStatus: candidate.boardStatus ?? 'untriaged' },
    ]
  }

  return {
    ok: true,
    value: {
      ...project,
      candidates: nextCandidates,
      updatedAt: nowIso(),
    },
  }
}

/** Update board status for a candidate (pure). */
export function setCandidateBoardStatus(
  project: Project,
  candidateId: string,
  status: BoardStatus,
): StoreResult<Project> {
  const idx = project.candidates.findIndex((c) => c.candidateId === candidateId)
  if (idx < 0) {
    return { ok: false, error: 'not_found', message: `Candidate ${candidateId} not on board.` }
  }
  const next = project.candidates.map((c, i) =>
    i === idx ? { ...c, boardStatus: status } : c,
  )
  return {
    ok: true,
    value: { ...project, candidates: next, updatedAt: nowIso() },
  }
}

/** Remove a candidate from the board (pure). */
export function removeCandidateFromProject(
  project: Project,
  candidateId: string,
): StoreResult<Project> {
  const next = project.candidates.filter((c) => c.candidateId !== candidateId)
  if (next.length === project.candidates.length) {
    return { ok: false, error: 'not_found', message: `Candidate ${candidateId} not on board.` }
  }
  return {
    ok: true,
    value: { ...project, candidates: next, updatedAt: nowIso() },
  }
}

/** Lightweight type guard for Project payloads. */
export function isProject(value: unknown): value is Project {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    v.schemaVersion === 1 &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    Array.isArray(v.candidates) &&
    Array.isArray(v.packIndex) &&
    typeof v.createdAt === 'string' &&
    typeof v.updatedAt === 'string'
  )
}

// ── Persistence ──────────────────────────────────────────────────────────────

function readIndex(storage: ProjectStorage): string[] {
  try {
    const raw = storage.getItem(PROJECT_INDEX_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function writeIndex(storage: ProjectStorage, ids: string[]): StoreResult<string[]> {
  try {
    storage.setItem(PROJECT_INDEX_KEY, JSON.stringify(ids))
    return { ok: true, value: ids }
  } catch (err) {
    if (isQuotaError(err)) {
      return { ok: false, error: 'quota_exceeded', message: QUOTA_MESSAGE }
    }
    return { ok: false, error: 'unavailable', message: 'Failed to write project index.' }
  }
}

function writeProject(storage: ProjectStorage, project: Project): StoreResult<Project> {
  try {
    storage.setItem(projectStorageKey(project.id), JSON.stringify(project))
    return { ok: true, value: project }
  } catch (err) {
    if (isQuotaError(err)) {
      return { ok: false, error: 'quota_exceeded', message: QUOTA_MESSAGE }
    }
    return { ok: false, error: 'unavailable', message: 'Failed to write project.' }
  }
}

function readProject(storage: ProjectStorage, id: string): Project | null {
  try {
    const raw = storage.getItem(projectStorageKey(id))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return isProject(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** List all projects (newest updated first). */
export function listProjects(storage?: ProjectStorage | null): Project[] {
  const s = storage === undefined ? defaultStorage() : storage
  if (!s) return []
  const ids = readIndex(s)
  const projects: Project[] = []
  for (const id of ids) {
    const p = readProject(s, id)
    if (p) projects.push(p)
  }
  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/** Get a single project by id. */
export function getProject(id: string, storage?: ProjectStorage | null): Project | null {
  const s = storage === undefined ? defaultStorage() : storage
  if (!s || !id) return null
  return readProject(s, id)
}

/**
 * Persist a project. Updates index. Enforces candidate cap and project count.
 * On QuotaExceeded returns error without dropping existing data.
 */
export function saveProject(
  project: Project,
  storage?: ProjectStorage | null,
): StoreResult<Project> {
  const s = storage === undefined ? defaultStorage() : storage
  if (!s) {
    return { ok: false, error: 'unavailable', message: 'localStorage is not available.' }
  }
  if (!isProject(project)) {
    return { ok: false, error: 'invalid', message: 'Invalid project payload.' }
  }

  const capped: Project = {
    ...project,
    candidates: project.candidates.slice(0, MAX_CANDIDATES_PER_PROJECT),
    updatedAt: nowIso(),
  }

  const ids = readIndex(s)
  const isNew = !ids.includes(capped.id)
  if (isNew && ids.length >= MAX_PROJECTS) {
    return {
      ok: false,
      error: 'cap_exceeded',
      message: `Maximum of ${MAX_PROJECTS} projects reached. Delete or export one first.`,
    }
  }

  const write = writeProject(s, capped)
  if (!write.ok) return write

  if (isNew) {
    const indexResult = writeIndex(s, [capped.id, ...ids])
    if (!indexResult.ok) {
      // Best-effort rollback of the new project blob so we don't orphan
      try {
        s.removeItem(projectStorageKey(capped.id))
      } catch {
        /* ignore */
      }
      return indexResult
    }
  }

  runSaveHooks(capped)
  return { ok: true, value: capped }
}

/** Delete a project and remove from index. */
export function deleteProject(
  id: string,
  storage?: ProjectStorage | null,
): StoreResult<true> {
  const s = storage === undefined ? defaultStorage() : storage
  if (!s) {
    return { ok: false, error: 'unavailable', message: 'localStorage is not available.' }
  }
  try {
    s.removeItem(projectStorageKey(id))
    const ids = readIndex(s).filter((x) => x !== id)
    const indexResult = writeIndex(s, ids)
    if (!indexResult.ok) return indexResult
    runDeleteHooks(id)
    return { ok: true, value: true }
  } catch (err) {
    if (isQuotaError(err)) {
      return { ok: false, error: 'quota_exceeded', message: QUOTA_MESSAGE }
    }
    return { ok: false, error: 'unavailable', message: 'Failed to delete project.' }
  }
}

/**
 * Create + persist a project in one step.
 */
export function createAndSaveProject(
  input: CreateProjectInput,
  storage?: ProjectStorage | null,
): StoreResult<Project> {
  const project = createProject(input)
  return saveProject(project, storage)
}

/**
 * Add candidate and persist. Returns quota/cap errors without silent drop.
 */
export function addCandidateAndSave(
  projectId: string,
  candidate: MoleculeCandidate,
  storage?: ProjectStorage | null,
): StoreResult<Project> {
  const existing = getProject(projectId, storage)
  if (!existing) {
    return { ok: false, error: 'not_found', message: `Project ${projectId} not found.` }
  }
  const next = addCandidateToProject(existing, candidate)
  if (!next.ok) return next
  return saveProject(next.value, storage)
}

/**
 * Set board status and persist.
 */
export function setBoardStatusAndSave(
  projectId: string,
  candidateId: string,
  status: BoardStatus,
  storage?: ProjectStorage | null,
): StoreResult<Project> {
  const existing = getProject(projectId, storage)
  if (!existing) {
    return { ok: false, error: 'not_found', message: `Project ${projectId} not found.` }
  }
  const next = setCandidateBoardStatus(existing, candidateId, status)
  if (!next.ok) return next
  return saveProject(next.value, storage)
}

/**
 * Add or replace a pack breadcrumb on Project.packIndex (pure).
 * Metadata only — never stores full claims (download-primary packs).
 */
export function addPackIndexEntryToProject(
  project: Project,
  entry: ProjectPackIndexEntry,
): StoreResult<Project> {
  if (!entry?.id || !entry.title) {
    return { ok: false, error: 'invalid', message: 'Pack index entry requires id and title.' }
  }
  const rest = project.packIndex.filter((e) => e.id !== entry.id)
  return {
    ok: true,
    value: {
      ...project,
      packIndex: [{ ...entry }, ...rest],
      updatedAt: nowIso(),
    },
  }
}

/**
 * Register pack breadcrumb on project and persist.
 */
export function addPackIndexEntryAndSave(
  projectId: string,
  entry: ProjectPackIndexEntry,
  storage?: ProjectStorage | null,
): StoreResult<Project> {
  const existing = getProject(projectId, storage)
  if (!existing) {
    return { ok: false, error: 'not_found', message: `Project ${projectId} not found.` }
  }
  const next = addPackIndexEntryToProject(existing, entry)
  if (!next.ok) return next
  return saveProject(next.value, storage)
}
