/**
 * Unified AI generation persistence:
 * - Always write/read local IndexedDB (solo default)
 * - Also write Firestore when signed in
 * - List merges cloud-first when signed in, else local only
 */

import {
  getSignedInUid,
  listAiGeneratedPage,
  saveAiGeneratedData,
  type AiDataKind,
  type AiGeneratedEntry,
  type AiGeneratedRecord,
  type ListAiPageOptions,
  type ListAiPageResult,
} from '@/lib/firebase/aiDataSync'
import { listAiHistoryLocal, putAiHistoryLocal } from './aiHistoryIdb'

export type { AiDataKind, AiGeneratedEntry, AiGeneratedRecord, ListAiPageResult }

/**
 * Persist generation locally always; cloud when signed in.
 */
export async function persistAiGeneration(
  entry: AiGeneratedEntry,
): Promise<{ ok: boolean; id?: string; local?: boolean; cloud?: boolean; message?: string }> {
  const local = await putAiHistoryLocal(entry)
  const cloud = await saveAiGeneratedData({
    ...entry,
    // keep same content; cloud may assign its own id
  })
  return {
    ok: Boolean(local) || cloud.ok,
    id: cloud.id || local?.id,
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
    default:
      return kind
  }
}
