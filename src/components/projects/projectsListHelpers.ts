/**
 * Pure helpers for /projects list page (sort/filter counts).
 */

import type { Project } from '@/lib/domain'

export type ProjectSort = 'opened' | 'updated' | 'name' | 'candidates' | 'promote'
export type ProjectFilter = 'all' | 'has_promote' | 'empty' | 'has_disease' | 'has_targets'

export const PROJECT_SORT_OPTIONS: { id: ProjectSort; label: string }[] = [
  { id: 'opened', label: 'Opened' },
  { id: 'updated', label: 'Updated' },
  { id: 'name', label: 'Name' },
  { id: 'candidates', label: 'Candidates' },
  { id: 'promote', label: 'Promote' },
]

export const PROJECT_FILTER_OPTIONS: { id: ProjectFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'has_promote', label: 'Has promote' },
  { id: 'empty', label: 'Empty board' },
  { id: 'has_disease', label: 'Has disease' },
  { id: 'has_targets', label: 'Has targets' },
]

export const LAST_OPENED_KEY = 'biointel-projects-last-opened-v1'

export function loadLastOpened(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LAST_OPENED_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

export function promoteCount(p: Project): number {
  return p.candidates.filter((c) => c.boardStatus === 'promote').length
}

export function watchingCount(p: Project): number {
  return p.candidates.filter((c) => c.boardStatus === 'watching').length
}

export function holdCount(p: Project): number {
  return p.candidates.filter((c) => c.boardStatus === 'hold').length
}

export function killCount(p: Project): number {
  return p.candidates.filter((c) => c.boardStatus === 'kill').length
}

export function diseaseLabel(p: Project): string {
  return (
    p.disease?.name ||
    (p.preferencesSnapshot as { diseaseName?: string } | undefined)?.diseaseName ||
    ''
  )
}
