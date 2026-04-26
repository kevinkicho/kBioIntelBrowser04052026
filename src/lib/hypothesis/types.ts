/**
 * Types for the Hypothesis Builder.
 *
 * v1: stack 2 filters, intersect on molecule CID. Each filter narrows the
 * candidate set; a molecule matches if it appears in every filter's result.
 */

export type FilterAxis =
  | 'targets-gene'
  | 'indicated-for'
  | 'trial-phase'
  | 'atc-class'

export interface Filter {
  axis: FilterAxis
  /** Free-form value: gene symbol, disease name, ATC code, or phase number-as-string. */
  value: string
}

/**
 * A molecule that survived a single filter, with a one-line human-readable
 * reason describing why this filter matched it.
 */
export interface MoleculeMatch {
  cid: number
  name: string
  reason: string
}

/**
 * Result returned to the client: a molecule that matched ALL active filters,
 * with the per-filter reasons aggregated.
 */
export interface IntersectedMatch {
  cid: number
  name: string
  reasons: string[]
}

/**
 * Saved hypothesis (localStorage). The id is a stable timestamp-derived string.
 */
export interface Hypothesis {
  id: string
  name: string
  filters: Filter[]
  savedAt: string
}
