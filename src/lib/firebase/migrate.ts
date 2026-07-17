/**
 * One-shot / on-login migration: local workspace → Firebase cloud (and merge back).
 */

import { syncProjectsBidirectional, type SyncResult } from './projectSync'
import { syncDiscoveryPreferences } from './settingsSync'
import { logAgentActivity } from '@/lib/agentActivityLog'

export type MigrationReport = {
  ok: boolean
  projects: SyncResult
  preferences: 'pushed' | 'pulled' | 'none' | 'error'
  message: string
  finishedAt: string
}

const LAST_MIGRATE_KEY = 'biointel-firebase-last-migrate-v1'

export function getLastMigrateAt(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(LAST_MIGRATE_KEY)
  } catch {
    return null
  }
}

function setLastMigrateAt(iso: string): void {
  try {
    localStorage.setItem(LAST_MIGRATE_KEY, iso)
  } catch {
    /* ignore */
  }
}

/**
 * Full bidirectional sync for a signed-in user.
 */
export async function runFirebaseMigration(uid: string): Promise<MigrationReport> {
  const projects = await syncProjectsBidirectional(uid)
  let preferences: MigrationReport['preferences'] = 'none'
  try {
    preferences = await syncDiscoveryPreferences(uid)
  } catch {
    preferences = 'error'
  }

  const finishedAt = new Date().toISOString()
  setLastMigrateAt(finishedAt)

  const ok = projects.errors.length === 0 && preferences !== 'error'
  const message = ok
    ? `Synced ${projects.pushed}↑ ${projects.pulled}↓ projects; prefs ${preferences}.`
    : `Sync finished with issues: ${projects.errors.slice(0, 3).join('; ') || preferences}`

  const report: MigrationReport = {
    ok,
    projects,
    preferences,
    message,
    finishedAt,
  }

  logAgentActivity(
    'firebase.migrate.complete',
    {
      uid,
      pushed: projects.pushed,
      pulled: projects.pulled,
      skipped: projects.skipped,
      prefs: preferences,
      ok,
    },
    { source: 'firebase' },
  )

  return report
}

/**
 * Lightweight auto-migrate on login (at most once per browser session hour).
 */
export async function maybeAutoMigrateOnLogin(uid: string): Promise<MigrationReport | null> {
  const last = getLastMigrateAt()
  if (last) {
    const age = Date.now() - new Date(last).getTime()
    if (age < 60 * 60 * 1000) return null // skip if < 1h
  }
  return runFirebaseMigration(uid)
}
