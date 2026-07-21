/**
 * Cross-source representation contract.
 * Entity-centric joins for analysis — each fact keeps free-API provenance.
 * Does not change of-record Discover ranks or invent clinical conclusions.
 */

export type CrossSourceKind =
  | 'count'
  | 'entity'
  | 'claim'
  | 'identity'
  | 'org'
  | 'axis'
  | 'status'

export type CrossSourceSurface =
  | 'molecule'
  | 'gene'
  | 'disease'
  | 'discover'
  | 'org'
  | 'project'

export type CrossSourceTone =
  | 'emerald'
  | 'violet'
  | 'amber'
  | 'sky'
  | 'slate'
  | 'rose'
  | 'cyan'
  | 'indigo'

/** One labeled fact/chip from a free public source. */
export interface CrossSourceFact {
  id: string
  label: string
  value: string | number
  /** Human source name e.g. "ClinicalTrials.gov" */
  source: string
  sourceUrl?: string
  panelId?: string
  categoryId?: string
  kind: CrossSourceKind
  detail?: string
  tone?: CrossSourceTone
  /** Optional claim id if derived from extractors */
  claimId?: string
}

export interface CrossSourceGroup {
  id: string
  title: string
  factIds: string[]
}

export interface CrossSourceBundle {
  subjectId: string
  subjectLabel: string
  surface: CrossSourceSurface
  facts: CrossSourceFact[]
  groups: CrossSourceGroup[]
  notes: string[]
  empty: boolean
  /** Distinct source labels with at least one non-empty count/entity fact */
  sourceCount: number
}

export function emptyCrossSourceBundle(
  subjectId: string,
  subjectLabel: string,
  surface: CrossSourceSurface,
  notes: string[] = [],
): CrossSourceBundle {
  return {
    subjectId,
    subjectLabel,
    surface,
    facts: [],
    groups: [],
    notes,
    empty: true,
    sourceCount: 0,
  }
}

/** Distinct sources that contributed a non-empty numeric/entity fact. */
export function countActiveSources(facts: CrossSourceFact[]): number {
  const set = new Set<string>()
  for (const f of facts) {
    if (isFactEmpty(f)) continue
    set.add(f.source)
  }
  return set.size
}

export function isFactEmpty(f: CrossSourceFact): boolean {
  if (f.value === '—' || f.value === '' || f.value == null) return true
  if (typeof f.value === 'number' && (f.value === 0 || Number.isNaN(f.value))) return true
  return false
}
