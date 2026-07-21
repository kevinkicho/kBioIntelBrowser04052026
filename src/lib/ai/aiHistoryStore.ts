/**
 * Unified AI generation persistence:
 * - Always write/read local IndexedDB (solo default)
 * - Also write Firestore when signed in
 * - List merges cloud-first when signed in, else local only
 * - User research comments dual-write the same way
 */

import {
  getSignedInUid,
  listAiGeneratedPage,
  saveAiGeneratedData,
  updateAiGeneratedCommentCloud,
  getAiGeneratedByIdCloud,
  type AiDataKind,
  type AiGeneratedEntry,
  type AiGeneratedRecord,
  type ListAiPageOptions,
  type ListAiPageResult,
} from '@/lib/firebase/aiDataSync'
import {
  listAiHistoryLocal,
  putAiHistoryLocal,
  updateAiHistoryLocalComment,
  getAiHistoryLocalById,
  countAiHistoryLocal,
} from './aiHistoryIdb'

export type { AiDataKind, AiGeneratedEntry, AiGeneratedRecord, ListAiPageResult }

/**
 * Persist generation locally always; cloud when signed in.
 * Uses one shared id so comments and navigator stay aligned across stores.
 */
export async function persistAiGeneration(
  entry: AiGeneratedEntry & { id?: string },
): Promise<{ ok: boolean; id?: string; local?: boolean; cloud?: boolean; message?: string }> {
  const id =
    entry.id ||
    `ai_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  const withId = { ...entry, id }
  const local = await putAiHistoryLocal(withId)
  const cloud = await saveAiGeneratedData(withId, undefined, id)
  return {
    ok: Boolean(local) || cloud.ok,
    id: local?.id || cloud.id || id,
    local: Boolean(local),
    cloud: Boolean(cloud.ok && !cloud.skipped),
    message: cloud.skipped
      ? 'Saved locally (sign in to sync cloud)'
      : cloud.ok
        ? 'Saved local + cloud'
        : local
          ? 'Saved locally'
          : cloud.message,
  }
}

/**
 * Paginated list: signed-in → Firestore page; else local IDB.
 * Optional contextKey filters client-side after fetch.
 */
export async function listAiHistoryPage(
  opts: ListAiPageOptions & { contextKey?: string } = {},
): Promise<ListAiPageResult & { source: 'cloud' | 'local' }> {
  const uid = getSignedInUid()
  if (uid) {
    const page = await listAiGeneratedPage(uid, opts)
    let items = page.items
    if (opts.contextKey) {
      const k = opts.contextKey.toLowerCase()
      items = items.filter((r) => {
        const c = r.context
        if (!c) return true
        return (
          (c.name && c.name.toLowerCase().includes(k)) ||
          (c.packId && c.packId.includes(opts.contextKey!)) ||
          (c.projectId && c.projectId.includes(opts.contextKey!)) ||
          (c.hypId && c.hypId.includes(opts.contextKey!)) ||
          String(c.cid ?? '') === opts.contextKey
        )
      })
    }
    // If cloud empty, fall back to local
    if (items.length === 0 && !opts.cursor) {
      const local = await listAiHistoryLocal(opts)
      if (local.items.length > 0) {
        return { ...local, source: 'local' }
      }
    }
    return { ...page, items, source: 'cloud' }
  }
  const local = await listAiHistoryLocal(opts)
  return { ...local, source: 'local' }
}

/**
 * Save user research notes on a generation (local always; cloud when possible).
 */
export async function updateAiGenerationComment(
  id: string,
  userComment: string,
): Promise<{ ok: boolean; record?: AiGeneratedRecord; message?: string }> {
  if (!id) return { ok: false, message: 'Missing generation id' }
  const local = await updateAiHistoryLocalComment(id, userComment)
  const cloud = await updateAiGeneratedCommentCloud(id, userComment)
  // If local miss but cloud ok (cloud-only row), rehydrate local cache
  if (!local && cloud.ok && !cloud.skipped) {
    const remote = await getAiGeneratedByIdCloud(id)
    if (remote) {
      const withComment: AiGeneratedRecord = {
        ...remote,
        userComment: (userComment || '').trim().slice(0, 8_000),
        commentUpdatedAt: new Date().toISOString(),
      }
      await putAiHistoryLocal(withComment)
      return { ok: true, record: withComment, message: 'Saved cloud + local cache' }
    }
  }
  if (local) {
    return {
      ok: true,
      record: local,
      message: cloud.skipped
        ? 'Saved locally'
        : cloud.ok
          ? 'Saved local + cloud'
          : 'Saved locally (cloud update failed)',
    }
  }
  if (cloud.ok && !cloud.skipped) {
    return { ok: true, message: 'Saved to cloud' }
  }
  return {
    ok: false,
    message: cloud.message || 'Could not save comment — generation not found',
  }
}

export async function getAiGenerationById(id: string): Promise<AiGeneratedRecord | null> {
  if (!id) return null
  const local = await getAiHistoryLocalById(id)
  if (local) return local
  return getAiGeneratedByIdCloud(id)
}

/** Approximate total for navigator (local always; cloud uses loaded page size as lower bound). */
export async function countAiGenerations(opts: {
  kind?: AiDataKind
  mode?: string
  contextKey?: string
}): Promise<{ count: number; source: 'local' | 'cloud' | 'mixed' }> {
  const localCount = await countAiHistoryLocal(opts)
  const uid = getSignedInUid()
  if (!uid) return { count: localCount, source: 'local' }
  // Cloud total would need aggregation; prefer max of local and first-page estimate
  const page = await listAiGeneratedPage(uid, {
    kind: opts.kind,
    mode: opts.mode,
    pageSize: 25,
  })
  let cloudN = page.items.length
  if (opts.contextKey) {
    const k = opts.contextKey.toLowerCase()
    cloudN = page.items.filter((r) => {
      const c = r.context
      if (!c) return false
      return (
        (c.name && c.name.toLowerCase().includes(k)) ||
        (c.packId && c.packId.includes(opts.contextKey!)) ||
        (c.projectId && c.projectId.includes(opts.contextKey!)) ||
        (c.hypId && c.hypId.includes(opts.contextKey!)) ||
        String(c.cid ?? '') === opts.contextKey
      )
    }).length
  }
  if (page.hasMore) cloudN = Math.max(cloudN, localCount)
  return { count: Math.max(localCount, cloudN), source: 'mixed' }
}

export function aiKindLabel(kind: AiDataKind | string): string {
  switch (kind) {
    case 'copilot':
      return 'Copilot'
    case 'pack':
      return 'Pack AI'
    case 'disease':
      return 'Disease intel'
    case 'rh':
      return 'Research hypothesis'
    case 'discover_rank':
      return 'Discover analysis'
    case 'board_recommend':
      return 'Board recommend'
    case 'research_lab':
      return 'Research lab AI'
    default:
      return kind
  }
}
