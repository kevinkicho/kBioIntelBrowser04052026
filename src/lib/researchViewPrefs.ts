/**
 * Solo-local research presentation preferences (localStorage).
 * Pins which research domains / hub sections show; does not change of-record ranks.
 */

import type { DataHubDomain } from '@/lib/dataHub'

export const RESEARCH_VIEW_PREFS_KEY = 'biointel-research-view-prefs-v1'
export const RESEARCH_VIEW_PREFS_EVENT = 'biointel-research-view-prefs'

/** Casual profile default (aligns with ProfileView research | panels) */
export type PreferredProfileView = 'research' | 'panels'

/** Dense research tables on molecule Research view */
export type ResearchTableDomain = 'literature' | 'grants' | 'trials' | 'structures'

export const RESEARCH_TABLE_DOMAINS: readonly ResearchTableDomain[] = [
  'literature',
  'grants',
  'trials',
  'structures',
] as const

export const RESEARCH_TABLE_LABELS: Record<ResearchTableDomain, string> = {
  literature: 'Literature',
  grants: 'NIH grants',
  trials: 'Trials',
  structures: 'Structures',
}

/** Data hub section filters (map to DataHubDomain) */
export const HUB_DOMAIN_ORDER: readonly DataHubDomain[] = [
  'identity',
  'chemistry',
  'regulatory',
  'clinical',
  'targets',
  'safety',
  'literature',
  'other',
] as const

export const HUB_DOMAIN_LABELS: Record<DataHubDomain, string> = {
  identity: 'Identity',
  chemistry: 'Chemistry',
  regulatory: 'Regulatory',
  clinical: 'Clinical',
  targets: 'Targets',
  safety: 'Safety',
  literature: 'Literature & grants',
  other: 'Structures / other',
}

export interface ResearchViewPrefs {
  /** Which research tables are visible (empty array = all) */
  researchTables: ResearchTableDomain[]
  /** Which hub domains are visible (empty array = all) */
  hubDomains: DataHubDomain[]
  /** Hide empty hub / matrix rows by default */
  hideEmpty: boolean
  /** Casual profile default when no URL/decision context */
  preferredProfileView: PreferredProfileView
  /** Max rows per research table */
  tableRowLimit: number
}

export const DEFAULT_RESEARCH_VIEW_PREFS: ResearchViewPrefs = {
  researchTables: [...RESEARCH_TABLE_DOMAINS],
  hubDomains: [...HUB_DOMAIN_ORDER],
  hideEmpty: true,
  preferredProfileView: 'research',
  tableRowLimit: 12,
}

function isTableDomain(v: unknown): v is ResearchTableDomain {
  return (
    v === 'literature' ||
    v === 'grants' ||
    v === 'trials' ||
    v === 'structures'
  )
}

function isHubDomain(v: unknown): v is DataHubDomain {
  return (
    v === 'identity' ||
    v === 'chemistry' ||
    v === 'regulatory' ||
    v === 'clinical' ||
    v === 'targets' ||
    v === 'safety' ||
    v === 'literature' ||
    v === 'other'
  )
}

export function parseResearchViewPrefs(raw: unknown): ResearchViewPrefs {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_RESEARCH_VIEW_PREFS }

  const o = raw as Record<string, unknown>
  const tables = Array.isArray(o.researchTables)
    ? o.researchTables.filter(isTableDomain)
    : [...DEFAULT_RESEARCH_VIEW_PREFS.researchTables]
  const hubs = Array.isArray(o.hubDomains)
    ? o.hubDomains.filter(isHubDomain)
    : [...DEFAULT_RESEARCH_VIEW_PREFS.hubDomains]

  const limit =
    typeof o.tableRowLimit === 'number' &&
    Number.isFinite(o.tableRowLimit) &&
    o.tableRowLimit >= 4 &&
    o.tableRowLimit <= 50
      ? Math.round(o.tableRowLimit)
      : DEFAULT_RESEARCH_VIEW_PREFS.tableRowLimit

  const preferred: PreferredProfileView =
    o.preferredProfileView === 'panels' || o.preferredProfileView === 'research'
      ? o.preferredProfileView
      : DEFAULT_RESEARCH_VIEW_PREFS.preferredProfileView

  return {
    researchTables:
      tables.length > 0 ? tables : [...DEFAULT_RESEARCH_VIEW_PREFS.researchTables],
    hubDomains: hubs.length > 0 ? hubs : [...DEFAULT_RESEARCH_VIEW_PREFS.hubDomains],
    hideEmpty: o.hideEmpty === false ? false : true,
    preferredProfileView: preferred,
    tableRowLimit: limit,
  }
}

export function loadResearchViewPrefs(): ResearchViewPrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_RESEARCH_VIEW_PREFS }
  try {
    const raw = window.localStorage.getItem(RESEARCH_VIEW_PREFS_KEY)
    if (!raw) return { ...DEFAULT_RESEARCH_VIEW_PREFS }
    return parseResearchViewPrefs(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_RESEARCH_VIEW_PREFS }
  }
}

export function saveResearchViewPrefs(prefs: ResearchViewPrefs): void {
  if (typeof window === 'undefined') return
  try {
    const normalized = parseResearchViewPrefs(prefs)
    window.localStorage.setItem(RESEARCH_VIEW_PREFS_KEY, JSON.stringify(normalized))
    window.dispatchEvent(
      new CustomEvent(RESEARCH_VIEW_PREFS_EVENT, { detail: normalized }),
    )
  } catch {
    // quota / private mode
  }
}

export function patchResearchViewPrefs(
  patch: Partial<ResearchViewPrefs>,
): ResearchViewPrefs {
  const next = parseResearchViewPrefs({ ...loadResearchViewPrefs(), ...patch })
  saveResearchViewPrefs(next)
  return next
}

export function resetResearchViewPrefs(): ResearchViewPrefs {
  const d = { ...DEFAULT_RESEARCH_VIEW_PREFS }
  saveResearchViewPrefs(d)
  return d
}

export function isResearchTableEnabled(
  prefs: ResearchViewPrefs,
  domain: ResearchTableDomain,
): boolean {
  if (!prefs.researchTables.length) return true
  return prefs.researchTables.includes(domain)
}

export function isHubDomainEnabled(
  prefs: ResearchViewPrefs,
  domain: DataHubDomain,
): boolean {
  if (!prefs.hubDomains.length) return true
  return prefs.hubDomains.includes(domain)
}

export function toggleListItem<T extends string>(
  list: T[],
  item: T,
  all: readonly T[],
): T[] {
  const set = new Set(list)
  if (set.has(item)) {
    set.delete(item)
  } else {
    set.add(item)
  }
  // Never allow empty selection — fall back to all
  if (set.size === 0) return [...all]
  // Preserve canonical order
  return all.filter((x) => set.has(x))
}
