import type { Filter, Hypothesis } from './types'

const STORAGE_KEY = 'biointel-hypotheses'
const MAX_SAVED = 25

function readAll(): Hypothesis[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(items: Hypothesis[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function listSavedHypotheses(): Hypothesis[] {
  return readAll().sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

export function saveHypothesis(name: string, filters: Filter[]): Hypothesis {
  const trimmed = name.trim() || 'Untitled hypothesis'
  const entry: Hypothesis = {
    id: `hyp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: trimmed,
    filters,
    savedAt: new Date().toISOString(),
  }
  const next = [entry, ...readAll()].slice(0, MAX_SAVED)
  writeAll(next)
  return entry
}

export function deleteHypothesis(id: string): void {
  const next = readAll().filter(h => h.id !== id)
  writeAll(next)
}
