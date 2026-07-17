/**
 * Evidence pack index — localStorage metadata only (never full claims).
 * Design §3.3: packs are download-primary; index is lightweight breadcrumb.
 * @see docs/design/discovery-workbench-v1.md §3.3, PR10
 */

import type { ProjectPackIndexEntry } from '@/lib/domain/entities'
import type { EvidencePack } from './pack'

export const PACK_INDEX_KEY = 'biointel-pack-index-v1'
export const MAX_PACK_INDEX_ENTRIES = 100

export type PackIndexErrorCode = 'quota_exceeded' | 'unavailable' | 'invalid'

export type PackIndexResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: PackIndexErrorCode; message: string }

/** Metadata-only index entry (no claims payload). */
export interface PackIndexEntry {
  id: string
  title: string
  createdAt: string
  contentHash: string
  claimCount: number
  candidateCount: number
  projectId?: string
  diseaseName?: string
  sources?: string[]
}

export interface PackIndexStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function defaultStorage(): PackIndexStorage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
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
  'Browser storage is full. Export packs as files and free space. No pack claims are stored in localStorage.'

export function isPackIndexEntry(value: unknown): value is PackIndexEntry {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    typeof v.createdAt === 'string' &&
    typeof v.contentHash === 'string' &&
    typeof v.claimCount === 'number' &&
    typeof v.candidateCount === 'number'
  )
}

/** Pure: map full pack → index metadata (never includes claims). */
export function toPackIndexEntry(pack: EvidencePack): PackIndexEntry {
  return {
    id: pack.id,
    title: pack.title,
    createdAt: pack.createdAt,
    contentHash: pack.contentHash,
    claimCount: pack.claimCount,
    candidateCount: pack.candidates.length,
    projectId: pack.projectId,
    diseaseName: pack.disease?.name,
    sources: pack.sources.slice(0, 12),
  }
}

/** Pure: Project.packIndex breadcrumb from full pack. */
export function toProjectPackIndexEntry(pack: EvidencePack): ProjectPackIndexEntry {
  return {
    id: pack.id,
    title: pack.title,
    createdAt: pack.createdAt,
    candidateCount: pack.candidates.length,
    claimCount: pack.claimCount,
    contentHash: pack.contentHash,
    claimIds: pack.claims.map((c) => c.id).slice(0, 50),
  }
}

function readAll(storage: PackIndexStorage): PackIndexEntry[] {
  try {
    const raw = storage.getItem(PACK_INDEX_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isPackIndexEntry)
  } catch {
    return []
  }
}

function writeAll(storage: PackIndexStorage, entries: PackIndexEntry[]): PackIndexResult<PackIndexEntry[]> {
  try {
    storage.setItem(PACK_INDEX_KEY, JSON.stringify(entries))
    return { ok: true, value: entries }
  } catch (err) {
    if (isQuotaError(err)) {
      return { ok: false, error: 'quota_exceeded', message: QUOTA_MESSAGE }
    }
    return { ok: false, error: 'unavailable', message: 'Failed to write pack index.' }
  }
}

/** List pack index entries (newest first). */
export function listPackIndex(storage?: PackIndexStorage | null): PackIndexEntry[] {
  const s = storage === undefined ? defaultStorage() : storage
  if (!s) return []
  return readAll(s).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/**
 * Register pack metadata in localStorage index.
 * Dedupes by id (replace). Caps at MAX_PACK_INDEX_ENTRIES (drops oldest).
 * Never stores claims.
 */
export function registerPackIndex(
  pack: EvidencePack,
  storage?: PackIndexStorage | null,
): PackIndexResult<PackIndexEntry> {
  const s = storage === undefined ? defaultStorage() : storage
  if (!s) {
    return { ok: false, error: 'unavailable', message: 'localStorage is not available.' }
  }
  const entry = toPackIndexEntry(pack)
  // Guard: entry must not smuggle claims
  if ('claims' in (entry as object)) {
    return { ok: false, error: 'invalid', message: 'Index entry must not include claims.' }
  }

  const existing = readAll(s).filter((e) => e.id !== entry.id)
  const next = [entry, ...existing].slice(0, MAX_PACK_INDEX_ENTRIES)
  const write = writeAll(s, next)
  if (!write.ok) return write
  return { ok: true, value: entry }
}

/**
 * Upsert a metadata-only pack index entry (e.g. cloud pull).
 * Never accepts claims — use registerPackIndex for full packs.
 */
export function upsertPackIndexEntry(
  entry: PackIndexEntry,
  storage?: PackIndexStorage | null,
): PackIndexResult<PackIndexEntry> {
  const s = storage === undefined ? defaultStorage() : storage
  if (!s) {
    return { ok: false, error: 'unavailable', message: 'localStorage is not available.' }
  }
  if (!isPackIndexEntry(entry)) {
    return { ok: false, error: 'invalid', message: 'Invalid pack index entry.' }
  }
  if ('claims' in (entry as object)) {
    return { ok: false, error: 'invalid', message: 'Index entry must not include claims.' }
  }
  const existing = readAll(s).filter((e) => e.id !== entry.id)
  const next = [entry, ...existing].slice(0, MAX_PACK_INDEX_ENTRIES)
  const write = writeAll(s, next)
  if (!write.ok) return write
  return { ok: true, value: entry }
}

/** Remove a pack index entry by id. */
export function removePackIndexEntry(
  id: string,
  storage?: PackIndexStorage | null,
): PackIndexResult<true> {
  const s = storage === undefined ? defaultStorage() : storage
  if (!s) {
    return { ok: false, error: 'unavailable', message: 'localStorage is not available.' }
  }
  const next = readAll(s).filter((e) => e.id !== id)
  const write = writeAll(s, next)
  if (!write.ok) return write
  return { ok: true, value: true }
}

/** Clear entire pack index (tests / export cleanup). */
export function clearPackIndex(storage?: PackIndexStorage | null): PackIndexResult<true> {
  const s = storage === undefined ? defaultStorage() : storage
  if (!s) {
    return { ok: false, error: 'unavailable', message: 'localStorage is not available.' }
  }
  try {
    s.removeItem(PACK_INDEX_KEY)
    return { ok: true, value: true }
  } catch (err) {
    if (isQuotaError(err)) {
      return { ok: false, error: 'quota_exceeded', message: QUOTA_MESSAGE }
    }
    return { ok: false, error: 'unavailable', message: 'Failed to clear pack index.' }
  }
}
