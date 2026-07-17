/**
 * Persist AI-generated outputs under users/{uid}/ai/{entryId} (owner-only).
 * No-op when signed out so solo/local mode never phones home.
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { getFirebaseAuth, getFirebaseFirestore } from './client'
import { FIRESTORE_COLLECTIONS } from './paths'
import { approxJsonBytes, FIRESTORE_DOC_SOFT_MAX_BYTES, stripUndefined } from './sanitize'
import { logAgentActivity } from '@/lib/agentActivityLog'

export type AiDataKind = 'copilot' | 'pack' | 'disease' | 'other'

export type AiGeneratedEntry = {
  kind: AiDataKind
  /** Prompt / analysis mode (e.g. free_qa, pack_executive_brief). */
  mode: string
  /** Assistant (or structured) text. Truncated if needed for Firestore. */
  content: string
  /** Optional entity labels for listing (disease name, CID, gene, pack id). */
  context?: {
    name?: string
    cid?: number
    geneSymbol?: string
    packId?: string
    diseaseId?: string
  }
  model?: string
  ollamaUrl?: string
  /** Optional structured task payload (already JSON-safe). */
  task?: unknown
  error?: string
}

const CONTENT_SOFT_MAX = 80_000

function aiCol(uid: string) {
  const db = getFirebaseFirestore()
  if (!db) return null
  return collection(db, FIRESTORE_COLLECTIONS.users, uid, FIRESTORE_COLLECTIONS.ai)
}

function truncateContent(text: string): string {
  if (text.length <= CONTENT_SOFT_MAX) return text
  return `${text.slice(0, CONTENT_SOFT_MAX)}\n…[truncated for cloud storage]`
}

export function getSignedInUid(): string | null {
  try {
    return getFirebaseAuth()?.currentUser?.uid ?? null
  } catch {
    return null
  }
}

/**
 * Best-effort write of one AI generation. Never throws to callers.
 * Skips when user is signed out (privacy + product: local default).
 */
export async function saveAiGeneratedData(
  entry: AiGeneratedEntry,
  uidOverride?: string | null,
): Promise<{ ok: boolean; id?: string; skipped?: boolean; message?: string }> {
  const uid = uidOverride ?? getSignedInUid()
  if (!uid) {
    return { ok: true, skipped: true, message: 'Not signed in — AI output kept in session only' }
  }
  const col = aiCol(uid)
  if (!col) {
    return { ok: false, message: 'Firestore unavailable' }
  }

  const id = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  const content = truncateContent(entry.content || '')
  if (!content.trim() && !entry.error && !entry.task) {
    return { ok: true, skipped: true, message: 'Empty AI output' }
  }

  try {
    const payload = stripUndefined({
      id,
      kind: entry.kind,
      mode: entry.mode,
      content,
      context: entry.context ?? null,
      model: entry.model ?? null,
      ollamaUrl: entry.ollamaUrl ?? null,
      task: entry.task ?? null,
      error: entry.error ?? null,
      createdAt: new Date().toISOString(),
      _serverCreatedAt: serverTimestamp(),
      cloudSchema: 1,
    }) as Record<string, unknown>

    if (approxJsonBytes(payload) > FIRESTORE_DOC_SOFT_MAX_BYTES) {
      payload.content = truncateContent(String(payload.content).slice(0, 40_000))
    }

    await setDoc(doc(col, id), payload)
    logAgentActivity(
      'firebase.ai.save',
      { uid, id, kind: entry.kind, mode: entry.mode },
      { source: 'firebase' },
    )
    return { ok: true, id }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logAgentActivity(
      'firebase.ai.save_error',
      { message, kind: entry.kind },
      { source: 'firebase', level: 'warn' },
    )
    return { ok: false, message }
  }
}

export async function listAiGeneratedData(uid: string): Promise<Array<Record<string, unknown>>> {
  const col = aiCol(uid)
  if (!col) return []
  const snap = await getDocs(col)
  const out: Array<Record<string, unknown>> = []
  snap.forEach((d: QueryDocumentSnapshot) => {
    out.push({ id: d.id, ...d.data() })
  })
  return out
}

export async function deleteAllAiGeneratedData(uid: string): Promise<number> {
  const col = aiCol(uid)
  if (!col) return 0
  const snap = await getDocs(col)
  let n = 0
  for (const d of snap.docs) {
    await deleteDoc(d.ref)
    n += 1
  }
  return n
}
