/**
 * Types for the Cohort Comparison feature.
 *
 * v1: pick 5–10 molecules, render as a column-per-molecule × row-per-attribute
 * heatmap. Each cell holds a raw value (number | string | null) and, for
 * numeric rows, a normalized [0,1] heat value used by the cell coloring.
 */
import type { CategoryId } from '@/lib/categoryConfig'

export type AttributeFormat = 'number' | 'integer' | 'string'

/**
 * A single attribute exposed in the matrix. `extract` is a pure function over
 * the merged `mergedData` blob (the same shape `mergedData` takes in
 * `ProfilePageClient`), returning a number, a string, or `null` if the data
 * for that molecule isn't available.
 */
export interface Attribute {
  id: string
  label: string
  category: CategoryId
  format: AttributeFormat
  /** Higher = better (used to flip the heatmap polarity for unfavorable rows). */
  higherIsBetter?: boolean
  extract: (data: Record<string, unknown>) => number | string | null
}

/** A molecule entry in the cohort. */
export interface Molecule {
  cid: number
  name: string
}

/** A cohort is a small ordered list of molecules. */
export interface Cohort {
  molecules: Molecule[]
}

/**
 * One cell in the matrix. `heat` is `null` when the value isn't a finite
 * number, or when the row is categorical (string).
 */
export interface MatrixCell {
  value: number | string | null
  heat: number | null
  display: string
}

/**
 * One row in the matrix: the attribute followed by per-molecule cells in the
 * same order as the cohort, plus the row's variance (used for sort).
 */
export interface MatrixRow {
  attribute: Attribute
  cells: MatrixCell[]
  variance: number
}

/** A saved cohort entry (localStorage). */
export interface SavedCohort {
  id: string
  name: string
  molecules: Molecule[]
  savedAt: string
}
