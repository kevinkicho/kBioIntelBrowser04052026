import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

const STORE_DIR = path.join(process.cwd(), 'data', 'snapshots')

export const SNAPSHOT_TTL_MS = 30 * 86_400_000 // 30 days

export interface SnapshotEntity {
  type: 'molecule' | 'gene' | 'disease'
  id: string | number
  name: string
}

export interface Snapshot {
  id: string
  createdAt: string
  expiresAt: string
  appVersion: string | null
  entity: SnapshotEntity
  data: Record<string, unknown>
}

function ensureDir() {
  if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true })
}

function pathFor(id: string): string {
  return path.join(STORE_DIR, `${id}.json`)
}

function appVersion(): string | null {
  try {
    const pkgPath = path.join(process.cwd(), 'package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { version?: string }
    return pkg.version ?? null
  } catch {
    return null
  }
}

/**
 * Save a snapshot. Content-addressed by SHA-256 of (entity, data) so identical
 * captures collapse to the same id and don't duplicate on disk.
 */
export function saveSnapshot(entity: SnapshotEntity, data: Record<string, unknown>): Snapshot {
  ensureDir()

  const payload = JSON.stringify({ entity, data })
  const id = crypto.createHash('sha256').update(payload).digest('hex').slice(0, 32)
  const existingPath = pathFor(id)

  if (fs.existsSync(existingPath)) {
    const existing = JSON.parse(fs.readFileSync(existingPath, 'utf-8')) as Snapshot
    if (new Date(existing.expiresAt).getTime() > Date.now()) {
      return existing
    }
    // expired but same content — refresh expiry
  }

  const now = Date.now()
  const snapshot: Snapshot = {
    id,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SNAPSHOT_TTL_MS).toISOString(),
    appVersion: appVersion(),
    entity,
    data,
  }
  fs.writeFileSync(existingPath, JSON.stringify(snapshot), 'utf-8')
  return snapshot
}

/** Load a snapshot. Returns null if missing or expired (and deletes expired files). */
export function loadSnapshot(id: string): Snapshot | null {
  if (!/^[a-f0-9]{32}$/.test(id)) return null
  const p = pathFor(id)
  if (!fs.existsSync(p)) return null
  try {
    const snap = JSON.parse(fs.readFileSync(p, 'utf-8')) as Snapshot
    if (new Date(snap.expiresAt).getTime() <= Date.now()) {
      try { fs.unlinkSync(p) } catch {}
      return null
    }
    return snap
  } catch {
    return null
  }
}
