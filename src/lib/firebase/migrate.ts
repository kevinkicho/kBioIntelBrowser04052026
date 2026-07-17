/**
 * One-shot / on-login migration: local workspace → Firebase cloud (and merge back).
 */

import { syncProjectsBidirectional, type SyncResult } from './projectSync'
import { syncDiscoveryPreferences } from './settingsSync'
import { syncPackMetadata, type PackMetaSyncResult } from './packMetaSync'
import { syncAiSettings } from './aiSettingsSync'
import { logAgentActivity } from '@/lib/agentActivityLog'

export type MigrationReport = {
  ok: boolean
  projects: SyncResult
  packs: PackMetaSyncResult
  preferences: 'pushed' | 'pulled' | 'none' | 'error'
  aiSettings: 'pushed' | 'pulled' | 'none' | 'error'
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
 * Projects + discovery prefs + pack metadata (not pack claim blobs).
 */
export async function runFirebaseMigration(uid: string): Promise<MigrationReport> {
  const projects = await syncProjectsBidirectional(uid)
  let packs: PackMetaSyncResult = { pushed: 0, pulled: 0, skipped: 0, errors: [] }
  try {
    packs = await syncPackMetadata(uid)
  } catch (err) {
    packs.errors.push(err instanceof Error ? err.message : String(err))
  }
  let preferences: MigrationReport['preferences'] = 'none'
  try {
    preferences = await syncDiscoveryPreferences(uid)
  } catch {
    preferences = 'error'
  }

  let aiSettings: MigrationReport['aiSettings'] = 'none'
  try {
    aiSettings = await syncAiSettings(uid)
  } catch {
    aiSettings = 'error'
  }

  const finishedAt = new Date().toISOString()
  setLastMigrateAt(finishedAt)

  const ok =
    projects.errors.length === 0 &&
    packs.errors.length === 0 &&
    preferences !== 'error' &&
    aiSettings !== 'error'
  const message = ok
    ? `Synced ${projects.pushed}↑ ${projects.pulled}↓ projects; ${packs.pushed}↑ ${packs.pulled}↓ pack meta; prefs ${preferences}; AI key ${aiSettings}.`
    : `Sync finished with issues: ${[...projects.errors, ...packs.errors].slice(0, 3).join('; ') || preferences || aiSettings}`

  const report: MigrationReport = {
    ok,
    projects,
    packs,
    preferences,
    aiSettings,
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
      packPushed: packs.pushed,
      packPulled: packs.pulled,
      prefs: preferences,
      aiSettings,
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
