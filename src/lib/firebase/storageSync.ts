/**
 * Optional Firebase Storage backups for project export JSON.
 * Path: users/{uid}/exports/{fileName}
 * Download/local remains primary; Storage is opt-in cloud archive.
 */

import {
  deleteObject,
  getDownloadURL,
  getMetadata,
  listAll,
  ref,
  uploadString,
  type FullMetadata,
} from 'firebase/storage'
import { getFirebaseStorage } from './client'
import { storageUserExportPath } from './paths'
import { logAgentActivity } from '@/lib/agentActivityLog'

export type CloudExportItem = {
  name: string
  fullPath: string
  size?: number
  updated?: string
  contentType?: string
}

const MAX_EXPORT_BYTES = 20 * 1024 * 1024 // under Storage rule 25MB

function exportRef(uid: string, fileName: string) {
  const storage = getFirebaseStorage()
  if (!storage) return null
  const safe = fileName.replace(/[/\\]/g, '_').slice(0, 180)
  return ref(storage, storageUserExportPath(uid, safe))
}

function exportsRoot(uid: string) {
  const storage = getFirebaseStorage()
  if (!storage) return null
  return ref(storage, `users/${uid}/exports`)
}

export async function uploadJsonExport(
  uid: string,
  fileName: string,
  jsonText: string,
): Promise<{ ok: true; path: string } | { ok: false; message: string }> {
  const r = exportRef(uid, fileName)
  if (!r) return { ok: false, message: 'Firebase Storage is not available.' }
  const bytes = new TextEncoder().encode(jsonText).length
  if (bytes > MAX_EXPORT_BYTES) {
    return {
      ok: false,
      message: `Export is ${Math.round(bytes / 1024 / 1024)}MB; max cloud backup is 20MB.`,
    }
  }
  try {
    await uploadString(r, jsonText, 'raw', {
      contentType: 'application/json',
      customMetadata: {
        kind: 'biointel-projects',
        uploadedAt: new Date().toISOString(),
      },
    })
    logAgentActivity(
      'firebase.storage.upload_export',
      { uid, fileName, bytes },
      { source: 'firebase' },
    )
    return { ok: true, path: r.fullPath }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logAgentActivity(
      'firebase.storage.upload_export_error',
      { message },
      { source: 'firebase', level: 'error' },
    )
    return { ok: false, message }
  }
}

export async function listCloudExports(uid: string): Promise<CloudExportItem[]> {
  const root = exportsRoot(uid)
  if (!root) return []
  try {
    const listed = await listAll(root)
    const items: CloudExportItem[] = []
    for (const item of listed.items) {
      let meta: FullMetadata | null = null
      try {
        meta = await getMetadata(item)
      } catch {
        meta = null
      }
      items.push({
        name: item.name,
        fullPath: item.fullPath,
        size: meta?.size,
        updated: meta?.updated,
        contentType: meta?.contentType,
      })
    }
    return items.sort((a, b) => (b.updated || '').localeCompare(a.updated || ''))
  } catch (err) {
    logAgentActivity(
      'firebase.storage.list_error',
      { message: err instanceof Error ? err.message : String(err) },
      { source: 'firebase', level: 'warn' },
    )
    return []
  }
}

export async function downloadCloudExportText(
  uid: string,
  fileName: string,
): Promise<{ ok: true; text: string } | { ok: false; message: string }> {
  const r = exportRef(uid, fileName)
  if (!r) return { ok: false, message: 'Firebase Storage is not available.' }
  try {
    const url = await getDownloadURL(r)
    const res = await fetch(url)
    if (!res.ok) return { ok: false, message: `Download failed (${res.status})` }
    const text = await res.text()
    return { ok: true, text }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) }
  }
}

export async function deleteCloudExport(uid: string, fileName: string): Promise<boolean> {
  const r = exportRef(uid, fileName)
  if (!r) return false
  try {
    await deleteObject(r)
    return true
  } catch {
    return false
  }
}

/** Upload a full multi-project export JSON (caller builds string via exportProjectsToJson). */
export async function backupProjectsJsonToCloud(
  uid: string,
  jsonText: string,
  label?: string,
): Promise<{ ok: true; path: string; fileName: string } | { ok: false; message: string }> {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const fileName = label
    ? `${label.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 40)}-${stamp}.json`
    : `biointel-projects-${stamp}.json`
  const result = await uploadJsonExport(uid, fileName, jsonText)
  if (!result.ok) return result
  return { ok: true, path: result.path, fileName }
}
