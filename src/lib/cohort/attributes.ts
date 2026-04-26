/**
 * Cohort attribute registry — the curated list of attributes pulled into the
 * matrix view. Each attribute knows which CategoryId its data lives under so
 * the orchestrator can drive a minimal fetch set.
 */
import type { Attribute } from './types'
import type { CategoryId } from '@/lib/categoryConfig'

function asArray(val: unknown): Record<string, unknown>[] {
  return Array.isArray(val) ? (val as Record<string, unknown>[]) : []
}

function asNumber(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val)) return val
  if (typeof val === 'string') {
    const parsed = Number(val)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

/** A trial counts as "active" if its status is RECRUITING / ACTIVE / NOT_YET_RECRUITING. */
const ACTIVE_TRIAL_STATUSES = new Set([
  'RECRUITING',
  'NOT_YET_RECRUITING',
  'ACTIVE_NOT_RECRUITING',
  'ENROLLING_BY_INVITATION',
])

function isActiveTrial(status: unknown): boolean {
  if (typeof status !== 'string') return false
  return ACTIVE_TRIAL_STATUSES.has(status.trim().toUpperCase().replace(/\s+/g, '_'))
}

/**
 * Top-level ATC letter (one of A, B, C, D, G, H, J, L, M, N, P, R, S, V).
 * We pick the most common letter across all classifications for the molecule.
 */
function topAtcLetter(data: Record<string, unknown>): string | null {
  const atc = asArray(data.atcClassifications)
  if (atc.length === 0) return null
  const counts: Record<string, number> = {}
  for (const cls of atc) {
    const code = typeof cls?.code === 'string' ? cls.code.trim() : ''
    if (!code) continue
    const letter = code[0]?.toUpperCase()
    if (letter && /[A-Z]/.test(letter)) {
      counts[letter] = (counts[letter] || 0) + 1
    }
  }
  let best: string | null = null
  let bestN = 0
  for (const [letter, n] of Object.entries(counts)) {
    if (n > bestN) {
      best = letter
      bestN = n
    }
  }
  return best
}

/** Top mechanism of action: most common actionType from chemblMechanisms. */
function topMechanism(data: Record<string, unknown>): string | null {
  const mechs = asArray(data.chemblMechanisms)
  if (mechs.length === 0) return null
  const counts: Record<string, number> = {}
  for (const m of mechs) {
    const action = typeof m?.actionType === 'string' ? m.actionType.trim() : ''
    if (!action) continue
    counts[action] = (counts[action] || 0) + 1
  }
  let best: string | null = null
  let bestN = 0
  for (const [action, n] of Object.entries(counts)) {
    if (n > bestN) {
      best = action
      bestN = n
    }
  }
  return best
}

/** Distinct manufacturers across companies + ndcProducts (best-effort dedup by lowercase name). */
function distinctManufacturers(data: Record<string, unknown>): number {
  const seen = new Set<string>()
  for (const c of asArray(data.companies)) {
    const name = typeof c?.company === 'string' ? c.company.trim().toLowerCase() : ''
    if (name) seen.add(name)
  }
  for (const p of asArray(data.ndcProducts)) {
    const name =
      typeof p?.manufacturer === 'string'
        ? p.manufacturer.trim().toLowerCase()
        : typeof p?.labelerName === 'string'
          ? p.labelerName.trim().toLowerCase()
          : ''
    if (name) seen.add(name)
  }
  return seen.size
}

/** Distinct targets across chemblActivities + drugGeneInteractions (by gene/target name). */
function distinctTargets(data: Record<string, unknown>): number {
  const seen = new Set<string>()
  for (const a of asArray(data.chemblActivities)) {
    const t = typeof a?.targetName === 'string' ? a.targetName.trim().toLowerCase() : ''
    if (t) seen.add(t)
  }
  for (const dgi of asArray(data.drugGeneInteractions)) {
    const g = typeof dgi?.geneSymbol === 'string' ? dgi.geneSymbol.trim().toUpperCase() : ''
    if (g) seen.add(g)
  }
  return seen.size
}

export const COHORT_ATTRIBUTES: Attribute[] = [
  // Molecular & chemical (computedProperties + molecularWeight)
  {
    id: 'mw',
    label: 'Molecular weight (g/mol)',
    category: 'molecular-chemical',
    format: 'number',
    extract: (d) => asNumber(d.molecularWeight),
  },
  {
    id: 'logp',
    label: 'LogP',
    category: 'molecular-chemical',
    format: 'number',
    extract: (d) => {
      const cp = d.computedProperties as Record<string, unknown> | null | undefined
      return cp ? asNumber(cp.xLogP) : null
    },
  },
  {
    id: 'tpsa',
    label: 'TPSA (Å²)',
    category: 'molecular-chemical',
    format: 'number',
    extract: (d) => {
      const cp = d.computedProperties as Record<string, unknown> | null | undefined
      return cp ? asNumber(cp.tpsa) : null
    },
  },
  {
    id: 'hbd',
    label: 'H-bond donors',
    category: 'molecular-chemical',
    format: 'integer',
    extract: (d) => {
      const cp = d.computedProperties as Record<string, unknown> | null | undefined
      return cp ? asNumber(cp.hBondDonorCount) : null
    },
  },
  {
    id: 'hba',
    label: 'H-bond acceptors',
    category: 'molecular-chemical',
    format: 'integer',
    extract: (d) => {
      const cp = d.computedProperties as Record<string, unknown> | null | undefined
      return cp ? asNumber(cp.hBondAcceptorCount) : null
    },
  },
  {
    id: 'rot-bonds',
    label: 'Rotatable bonds',
    category: 'molecular-chemical',
    format: 'integer',
    extract: (d) => {
      const cp = d.computedProperties as Record<string, unknown> | null | undefined
      return cp ? asNumber(cp.rotatableBondCount) : null
    },
  },

  // Pharmaceutical
  {
    id: 'manufacturers',
    label: 'Distinct manufacturers',
    category: 'pharmaceutical',
    format: 'integer',
    higherIsBetter: true,
    extract: (d) => distinctManufacturers(d),
  },
  {
    id: 'atc-class',
    label: 'ATC top-level',
    category: 'pharmaceutical',
    format: 'string',
    extract: (d) => topAtcLetter(d),
  },

  // Clinical & safety
  {
    id: 'active-trials',
    label: 'Active trials',
    category: 'clinical-safety',
    format: 'integer',
    higherIsBetter: true,
    extract: (d) => asArray(d.clinicalTrials).filter(t => isActiveTrial(t?.status)).length,
  },
  {
    id: 'total-trials',
    label: 'Total trials',
    category: 'clinical-safety',
    format: 'integer',
    higherIsBetter: true,
    extract: (d) => asArray(d.clinicalTrials).length,
  },
  {
    id: 'adverse-events',
    label: 'Adverse event reports',
    category: 'clinical-safety',
    format: 'integer',
    higherIsBetter: false,
    extract: (d) => asArray(d.adverseEvents).length,
  },
  {
    id: 'recalls',
    label: 'Recalls',
    category: 'clinical-safety',
    format: 'integer',
    higherIsBetter: false,
    extract: (d) => asArray(d.drugRecalls).length,
  },

  // Bioactivity & targets
  {
    id: 'distinct-targets',
    label: 'Distinct targets',
    category: 'bioactivity-targets',
    format: 'integer',
    higherIsBetter: true,
    extract: (d) => distinctTargets(d),
  },
  {
    id: 'top-mechanism',
    label: 'Top mechanism',
    category: 'bioactivity-targets',
    format: 'string',
    extract: (d) => topMechanism(d),
  },

  // Research
  {
    id: 'pubmed-count',
    label: 'PubMed citations',
    category: 'research-literature',
    format: 'integer',
    higherIsBetter: true,
    extract: (d) => asArray(d.pubmedArticles).length,
  },
]

/** Distinct categories that need to be fetched to populate every attribute. */
export function requiredCategories(attributes: Attribute[]): CategoryId[] {
  const set = new Set<CategoryId>()
  for (const a of attributes) set.add(a.category)
  return Array.from(set)
}
