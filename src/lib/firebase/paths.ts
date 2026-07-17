/**
 * Cloud data layout (optional — solo local is still default).
 * All user data is scoped under auth.uid so rules can enforce ownership.
 */

export const FIRESTORE_COLLECTIONS = {
  users: 'users',
  /** users/{uid}/projects/{projectId} */
  projects: 'projects',
  /** users/{uid}/settings/preferences */
  settings: 'settings',
  /** users/{uid}/packs/{packId} metadata (not full pack blobs) */
  packs: 'packs',
} as const

export function userDocPath(uid: string): string {
  return `${FIRESTORE_COLLECTIONS.users}/${uid}`
}

export function userProjectsPath(uid: string): string {
  return `${FIRESTORE_COLLECTIONS.users}/${uid}/${FIRESTORE_COLLECTIONS.projects}`
}

export function userProjectPath(uid: string, projectId: string): string {
  return `${userProjectsPath(uid)}/${projectId}`
}

/** RTDB: presence / ephemeral only */
export function rtdbPresencePath(uid: string): string {
  return `presence/${uid}`
}

/** Storage: users/{uid}/exports/{file} */
export function storageUserExportPath(uid: string, fileName: string): string {
  return `users/${uid}/exports/${fileName}`
}
