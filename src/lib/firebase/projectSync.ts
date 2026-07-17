/**
 * Sync local project boards ↔ Firestore users/{uid}/projects/{id}.
 * Local remains source of truth for offline; cloud is optional backup/sync.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import type { Project } from '@/lib/domain'
import { isProject, listProjects, saveProject, getProject } from '@/lib/project/store'
import { getFirebaseFirestore } from './client'
import { FIRESTORE_COLLECTIONS } from './paths'
import { approxJsonBytes, FIRESTORE_DOC_SOFT_MAX_BYTES, stripUndefined } from './sanitize'
import { logAgentActivity } from '@/lib/agentActivityLog'

export type SyncResult = {
  pushed: number
  pulled: number
  skipped: number
  errors: string[]
}

function projectsCol(uid: string) {
  const db = getFirebaseFirestore()
  if (!db) return null
  return collection(db, FIRESTORE_COLLECTIONS.users, uid, FIRESTORE_COLLECTIONS.projects)
}

function projectDoc(uid: string, projectId: string) {
  const db = getFirebaseFirestore()
  if (!db) return null
  return doc(db, FIRESTORE_COLLECTIONS.users, uid, FIRESTORE_COLLECTIONS.projects, projectId)
}

function toCloudPayload(project: Project): Record<string, unknown> | null {
  const payload = stripUndefined({
    ...project,
    cloudSchema: 1,
    cloudSyncedAt: new Date().toISOString(),
  }) as Record<string, unknown>
  if (approxJsonBytes(payload) > FIRESTORE_DOC_SOFT_MAX_BYTES) {
    // Drop heavy optional blobs first
    const slim = stripUndefined({
      schemaVersion: project.schemaVersion,
      id: project.id,
      name: project.name,
      description: project.description,
      disease: project.disease,
      targetIds: project.targetIds,
      candidates: project.candidates.map((c) => ({
        candidateId: c.candidateId,
        identity: c.identity,
        boardStatus: c.boardStatus,
        origins: c.origins,
        evidenceBreadthSources: c.evidenceBreadthSources?.slice?.(0, 5) ?? c.evidenceBreadthSources,
        links: [],
        scores: c.scores,
      })),
      rubric: project.rubric,
      preferencesSnapshot: project.preferencesSnapshot,
      packIndex: project.packIndex,
      researchHypothesisIds: project.researchHypothesisIds,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      cloudSchema: 1,
      cloudSyncedAt: new Date().toISOString(),
      cloudSlimmed: true,
    }) as Record<string, unknown>
    if (approxJsonBytes(slim) > FIRESTORE_DOC_SOFT_MAX_BYTES) return null
    return slim
  }
  return payload
}

/** Strip Firestore/cloud-only keys so isProject + localStorage stay clean. */
function fromCloudPayload(data: Record<string, unknown>): Project | null {
  const rest: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (k.startsWith('_')) continue
    if (k.startsWith('cloud')) continue
    rest[k] = v
  }
  if (!isProject(rest)) return null
  return rest
}

export async function pushProjectToCloud(uid: string, project: Project): Promise<boolean> {
  const ref = projectDoc(uid, project.id)
  if (!ref) return false
  const payload = toCloudPayload(project)
  if (!payload) {
    logAgentActivity(
      'firebase.sync.project_too_large',
      { projectId: project.id },
      { source: 'firebase', level: 'warn' },
    )
    return false
  }
  await setDoc(
    ref,
    {
      ...payload,
      // server clock for merge
      _serverUpdatedAt: serverTimestamp(),
    },
    { merge: true },
  )
  return true
}

export async function pullProjectFromCloud(uid: string, projectId: string): Promise<Project | null> {
  const ref = projectDoc(uid, projectId)
  if (!ref) return null
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return fromCloudPayload(snap.data() as Record<string, unknown>)
}

export async function listCloudProjects(uid: string): Promise<Project[]> {
  const col = projectsCol(uid)
  if (!col) return []
  const snap = await getDocs(col)
  const out: Project[] = []
  snap.forEach((d) => {
    const p = fromCloudPayload(d.data() as Record<string, unknown>)
    if (p) out.push(p)
  })
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function deleteCloudProject(uid: string, projectId: string): Promise<void> {
  const ref = projectDoc(uid, projectId)
  if (!ref) return
  await deleteDoc(ref)
}

/**
 * Push all local projects to cloud. Last-write-wins by updatedAt when both exist.
 */
export async function pushAllLocalProjects(uid: string): Promise<SyncResult> {
  const result: SyncResult = { pushed: 0, pulled: 0, skipped: 0, errors: [] }
  const local = listProjects()
  for (const p of local) {
    try {
      const cloud = await pullProjectFromCloud(uid, p.id)
      if (cloud && cloud.updatedAt > p.updatedAt) {
        result.skipped += 1
        continue
      }
      const ok = await pushProjectToCloud(uid, p)
      if (ok) result.pushed += 1
      else {
        result.skipped += 1
        result.errors.push(`Project ${p.id} too large for Firestore`)
      }
    } catch (err) {
      result.errors.push(
        `Push ${p.id}: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }
  logAgentActivity('firebase.sync.push_projects', { ...result, uid }, { source: 'firebase' })
  return result
}

/**
 * Pull cloud projects into localStorage. Prefer newer updatedAt.
 */
export async function pullAllCloudProjects(uid: string): Promise<SyncResult> {
  const result: SyncResult = { pushed: 0, pulled: 0, skipped: 0, errors: [] }
  try {
    const cloudList = await listCloudProjects(uid)
    for (const p of cloudList) {
      try {
        const local = getProject(p.id)
        if (local && local.updatedAt >= p.updatedAt) {
          result.skipped += 1
          continue
        }
        const save = saveProject(p)
        if (save.ok) result.pulled += 1
        else {
          result.errors.push(`Pull ${p.id}: ${save.message}`)
          result.skipped += 1
        }
      } catch (err) {
        result.errors.push(
          `Pull ${p.id}: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : String(err))
  }
  logAgentActivity('firebase.sync.pull_projects', { ...result, uid }, { source: 'firebase' })
  return result
}

/** Bidirectional merge: pull then push (newer wins each way). */
export async function syncProjectsBidirectional(uid: string): Promise<SyncResult> {
  const pulled = await pullAllCloudProjects(uid)
  const pushed = await pushAllLocalProjects(uid)
  return {
    pushed: pushed.pushed,
    pulled: pulled.pulled,
    skipped: pushed.skipped + pulled.skipped,
    errors: [...pulled.errors, ...pushed.errors],
  }
}
