/**
 * Best-effort Firestore write-through when the user is signed in.
 * Local save/delete always wins; cloud errors never block the UI.
 */

import type { Project } from '@/lib/domain'
import {
  registerProjectMutateHook,
  type ProjectMutateHook,
} from '@/lib/project/store'
import { registerDiscoveryPrefsSaveHook } from '@/lib/discovery/preferences'
import { deleteCloudProjectSafe, pushProjectToCloud } from './projectSync'
import { pushDiscoveryPreferences } from './settingsSync'
import { logAgentActivity } from '@/lib/agentActivityLog'

let currentUid: string | null = null
const pending = new Map<string, ReturnType<typeof setTimeout>>()
const DEBOUNCE_MS = 1500
let prefsTimer: ReturnType<typeof setTimeout> | null = null

/** Called from FirebaseProvider when auth user changes. */
export function setWriteThroughUid(uid: string | null): void {
  currentUid = uid
  if (!uid) {
    Array.from(pending.values()).forEach((t) => clearTimeout(t))
    pending.clear()
    if (prefsTimer) {
      clearTimeout(prefsTimer)
      prefsTimer = null
    }
  }
}

function schedulePush(project: Project): void {
  const uid = currentUid
  if (!uid || typeof window === 'undefined') return

  const existing = pending.get(project.id)
  if (existing) clearTimeout(existing)

  const timer = setTimeout(() => {
    pending.delete(project.id)
    const u = currentUid
    if (!u) return
    void pushProjectToCloud(u, project)
      .then((ok) => {
        if (ok) {
          logAgentActivity(
            'firebase.write_through.push',
            { projectId: project.id, uid: u },
            { source: 'firebase' },
          )
        }
      })
      .catch((err) => {
        logAgentActivity(
          'firebase.write_through.push_error',
          {
            projectId: project.id,
            message: err instanceof Error ? err.message : String(err),
          },
          { source: 'firebase', level: 'warn' },
        )
      })
  }, DEBOUNCE_MS)

  pending.set(project.id, timer)
}

function scheduleDelete(projectId: string): void {
  const uid = currentUid
  if (!uid) return
  const existing = pending.get(projectId)
  if (existing) {
    clearTimeout(existing)
    pending.delete(projectId)
  }
  void deleteCloudProjectSafe(uid, projectId)
}

function schedulePrefsPush(): void {
  const uid = currentUid
  if (!uid || typeof window === 'undefined') return
  if (prefsTimer) clearTimeout(prefsTimer)
  prefsTimer = setTimeout(() => {
    prefsTimer = null
    const u = currentUid
    if (!u) return
    void pushDiscoveryPreferences(u).catch(() => {
      /* non-fatal */
    })
  }, DEBOUNCE_MS)
}

const hook: ProjectMutateHook = {
  onSave: (project) => schedulePush(project),
  onDelete: (projectId) => scheduleDelete(projectId),
}

let unsubProject: (() => void) | null = null
let unsubPrefs: (() => void) | null = null

/** Install store hooks once (browser only). Idempotent. */
export function enableProjectWriteThrough(): void {
  if (typeof window === 'undefined') return
  if (!unsubProject) unsubProject = registerProjectMutateHook(hook)
  if (!unsubPrefs) {
    unsubPrefs = registerDiscoveryPrefsSaveHook(() => schedulePrefsPush())
  }
}

export function disableProjectWriteThrough(): void {
  unsubProject?.()
  unsubProject = null
  unsubPrefs?.()
  unsubPrefs = null
  Array.from(pending.values()).forEach((t) => clearTimeout(t))
  pending.clear()
  if (prefsTimer) {
    clearTimeout(prefsTimer)
    prefsTimer = null
  }
}
