/**
 * Saved cohorts — localStorage CRUD mirroring `savedHypotheses.ts`.
 *
 * Each entry is a small ordered list of molecules with a user-given name.
 */
import type { Molecule, SavedCohort } from './types'

const STORAGE_KEY = 'biointel-cohorts'
const MAX_SAVED = 25

function readAll(): SavedCohort[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(items: SavedCohort[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function listSavedCohorts(): SavedCohort[] {
  return readAll().sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

export function saveCohort(name: string, molecules: Molecule[]): SavedCohort {
  const trimmed = name.trim() || 'Untitled cohort'
  const entry: SavedCohort = {
    id: `coh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: trimmed,
    molecules: molecules.map(m => ({ cid: m.cid, name: m.name })),
    savedAt: new Date().toISOString(),
  }
  const next = [entry, ...readAll()].slice(0, MAX_SAVED)
  writeAll(next)
  return entry
}

export function deleteCohort(id: string): void {
  const next = readAll().filter(h => h.id !== id)
  writeAll(next)
}
