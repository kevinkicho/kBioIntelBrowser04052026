/**
 * Persist AI-generated outputs under users/{uid}/ai/{entryId} (owner-only).
 * No-op when signed out so solo/local mode never phones home.
 * Supports pagination for regenerate / review UX.
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  type QueryDocumentSnapshot,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore'
import { getFirebaseAuth, getFirebaseFirestore } from './client'
import { FIRESTORE_COLLECTIONS } from './paths'
import { approxJsonBytes, FIRESTORE_DOC_SOFT_MAX_BYTES, stripUndefined } from './sanitize'
import { logAgentActivity } from '@/lib/agentActivityLog'

export type AiDataKind =
  | 'copilot'
  | 'pack'
  | 'disease'
  | 'rh'
  | 'discover_rank'
  | 'board_recommend'
  | 'other'

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
    hypId?: string
    projectId?: string
  }
  model?: string
  ollamaUrl?: string
  /** Optional structured task payload (already JSON-safe). */
  task?: unknown
  error?: string
  /** Prompt transparency — what was sent to the model (for learning / audit). */
  promptSystem?: string
  promptUser?: string
}

/** Stored document shape (client-readable). */
export type AiGeneratedRecord = AiGeneratedEntry & {
  id: string
  createdAt: string
  cloudSchema?: number
}

export type ListAiPageOptions = {
  /** Page size (default 8, max 25). */
  pageSize?: number
  /** Filter by kind when set. */
  kind?: AiDataKind
  /** Optional mode equality filter. */
  mode?: string
  /** Cursor from previous page (document id + createdAt). */
  cursor?: { createdAt: string; id: string } | null
}

export type ListAiPageResult = {
  items: AiGeneratedRecord[]
  /** Pass as cursor for next page; null if no more. */
  nextCursor: { createdAt: string; id: string } | null
  hasMore: boolean
}

const CONTENT_SOFT_MAX = 80_000
const PROMPT_SOFT_MAX = 40_000

function aiCol(uid: string) {
  const db = getFirebaseFirestore()
  if (!db) return null
  return collection(db, FIRESTORE_COLLECTIONS.users, uid, FIRESTORE_COLLECTIONS.ai)
}

function truncateContent(text: string, max = CONTENT_SOFT_MAX): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}\n…[truncated for cloud storage]`
}

export function getSignedInUid(): string | null {
  try {
    return getFirebaseAuth()?.currentUser?.uid ?? null
  } catch {
    return null
  }
}

function toRecord(id: string, data: DocumentData): AiGeneratedRecord {
  return {
    id,
    kind: (data.kind as AiDataKind) || 'other',
    mode: String(data.mode || ''),
    content: String(data.content || ''),
    context: (data.context as AiGeneratedEntry['context']) ?? undefined,
    model: data.model != null ? String(data.model) : undefined,
    ollamaUrl: data.ollamaUrl != null ? String(data.ollamaUrl) : undefined,
    task: data.task,
    error: data.error != null ? String(data.error) : undefined,
    promptSystem: data.promptSystem != null ? String(data.promptSystem) : undefined,
    promptUser: data.promptUser != null ? String(data.promptUser) : undefined,
    createdAt: String(data.createdAt || ''),
    cloudSchema: typeof data.cloudSchema === 'number' ? data.cloudSchema : undefined,
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
      promptSystem: entry.promptSystem
        ? truncateContent(entry.promptSystem, PROMPT_SOFT_MAX)
        : null,
      promptUser: entry.promptUser
        ? truncateContent(entry.promptUser, PROMPT_SOFT_MAX)
        : null,
      createdAt: new Date().toISOString(),
      _serverCreatedAt: serverTimestamp(),
      cloudSchema: 2,
    }) as Record<string, unknown>

    if (approxJsonBytes(payload) > FIRESTORE_DOC_SOFT_MAX_BYTES) {
      payload.content = truncateContent(String(payload.content).slice(0, 40_000))
      if (payload.promptSystem) {
        payload.promptSystem = truncateContent(String(payload.promptSystem), 12_000)
      }
      if (payload.promptUser) {
        payload.promptUser = truncateContent(String(payload.promptUser), 12_000)
      }
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

/**
 * Paginated list of AI generations (newest first).
 * Requires signed-in uid. Uses createdAt ISO string for ordering.
 */
export async function listAiGeneratedPage(
  uid: string,
  opts: ListAiPageOptions = {},
): Promise<ListAiPageResult> {
  const col = aiCol(uid)
  if (!col) return { items: [], nextCursor: null, hasMore: false }

  const pageSize = Math.min(25, Math.max(1, opts.pageSize ?? 8))
  const constraints: QueryConstraint[] = []

  if (opts.kind) {
    constraints.push(where('kind', '==', opts.kind))
  }
  if (opts.mode) {
    constraints.push(where('mode', '==', opts.mode))
  }
  constraints.push(orderBy('createdAt', 'desc'))
  constraints.push(limit(pageSize + 1))

  // Cursor: re-fetch and skip client-side when composite index unavailable for startAfter+where.
  // Prefer pure query when no cursor; with cursor use startAfter on createdAt only when no filters,
  // otherwise filter client-side from a slightly larger window.
  try {
    let q
    if (opts.cursor && !opts.kind && !opts.mode) {
      // startAfter needs a snapshot; use getDocs of cursor id then startAfter
      const cursorSnap = await getDocs(query(col, where('id', '==', opts.cursor.id), limit(1)))
      const cursorDoc = cursorSnap.docs[0]
      if (cursorDoc) {
        q = query(col, orderBy('createdAt', 'desc'), startAfter(cursorDoc), limit(pageSize + 1))
      } else {
        q = query(col, ...constraints)
      }
    } else {
      q = query(col, ...constraints)
    }

    const snap = await getDocs(q)
    let rows = snap.docs.map((d: QueryDocumentSnapshot) => toRecord(d.id, d.data()))

    // Client-side cursor when filtered (avoids composite index requirement)
    if (opts.cursor && (opts.kind || opts.mode)) {
      const cut = rows.findIndex(
        (r) =>
          r.createdAt < opts.cursor!.createdAt ||
          (r.createdAt === opts.cursor!.createdAt && r.id < opts.cursor!.id),
      )
      // Newer-first: keep items strictly older than cursor
      rows = rows.filter((r) => {
        if (r.createdAt < opts.cursor!.createdAt) return true
        if (r.createdAt === opts.cursor!.createdAt && r.id !== opts.cursor!.id) {
          return r.id < opts.cursor!.id
        }
        return false
      })
      void cut
    }

    const hasMore = rows.length > pageSize
    const page = rows.slice(0, pageSize)
    const last = page[page.length - 1]
    return {
      items: page,
      hasMore,
      nextCursor:
        hasMore && last ? { createdAt: last.createdAt, id: last.id } : null,
    }
  } catch (err) {
    // Fallback: full scan + sort (small personal collections)
    logAgentActivity(
      'firebase.ai.list_fallback',
      { message: err instanceof Error ? err.message : String(err) },
      { source: 'firebase', level: 'warn' },
    )
    const snap = await getDocs(col)
    let all = snap.docs.map((d) => toRecord(d.id, d.data()))
    all.sort((a, b) =>
      String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
    )
    if (opts.kind) all = all.filter((r) => r.kind === opts.kind)
    if (opts.mode) all = all.filter((r) => r.mode === opts.mode)
    if (opts.cursor) {
      all = all.filter((r) => {
        if (r.createdAt < opts.cursor!.createdAt) return true
        if (r.createdAt === opts.cursor!.createdAt && r.id < opts.cursor!.id) return true
        return false
      })
    }
    const hasMore = all.length > pageSize
    const page = all.slice(0, pageSize)
    const last = page[page.length - 1]
    return {
      items: page,
      hasMore,
      nextCursor:
        hasMore && last ? { createdAt: last.createdAt, id: last.id } : null,
    }
  }
}

/** @deprecated Prefer listAiGeneratedPage for pagination */
export async function listAiGeneratedData(uid: string): Promise<Array<Record<string, unknown>>> {
  const page = await listAiGeneratedPage(uid, { pageSize: 100 })
  return page.items as unknown as Array<Record<string, unknown>>
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
