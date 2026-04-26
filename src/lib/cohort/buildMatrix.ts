/**
 * Pure matrix construction for the cohort view.
 *
 * `buildMatrix` consumes the cohort (ordered list of molecules) and the merged
 * data blob per molecule, and produces one MatrixRow per attribute. Cells
 * carry the raw value, a normalized [0, 1] heat value (for numeric rows), and
 * a pre-formatted display string. Rows expose a variance number computed on
 * the normalized values so callers can sort by "most differentiating".
 *
 * Heat normalization rules:
 *   - String/categorical rows: heat is null for every cell.
 *   - Numeric rows: if all finite values are equal, heat is 0.5 for those cells.
 *     Otherwise we normalize to [0, 1] using log10 if max/min > 100 (and all
 *     values are positive), else linear (min..max).
 *   - Cells whose value is null/NaN keep heat = null (rendered neutral).
 *   - When `higherIsBetter === false`, the heat is inverted (1 − heat) so the
 *     "good" end stays on the same side of the colorbar.
 */
import type { Attribute, MatrixCell, MatrixRow, Molecule } from './types'

/** Format a numeric value compactly for display (no trailing zeros). */
function formatNumber(v: number, format: 'number' | 'integer'): string {
  if (!Number.isFinite(v)) return ''
  if (format === 'integer') return String(Math.round(v))
  if (Math.abs(v) >= 1000) return v.toFixed(0)
  if (Math.abs(v) >= 100) return v.toFixed(1)
  return v.toFixed(2).replace(/\.?0+$/, '')
}

function variance(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const sq = values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / values.length
  return sq
}

/**
 * Build the full matrix. `dataByCid` maps the molecule CID → the merged data
 * blob for that molecule (or undefined if not yet loaded). Missing molecules
 * yield null cells.
 */
export function buildMatrix(
  molecules: Molecule[],
  attributes: Attribute[],
  dataByCid: Record<number, Record<string, unknown> | undefined>,
): MatrixRow[] {
  if (molecules.length === 0 || attributes.length === 0) return []

  return attributes.map((attribute) => {
    const rawValues: (number | string | null)[] = molecules.map((m) => {
      const data = dataByCid[m.cid]
      if (!data) return null
      try {
        const v = attribute.extract(data)
        if (v === null || v === undefined) return null
        if (typeof v === 'number') return Number.isFinite(v) ? v : null
        if (typeof v === 'string') return v.length > 0 ? v : null
        return null
      } catch {
        return null
      }
    })

    const isNumeric = attribute.format === 'number' || attribute.format === 'integer'
    const cells: MatrixCell[] = []

    if (!isNumeric) {
      for (const v of rawValues) {
        cells.push({
          value: v,
          heat: null,
          display: typeof v === 'string' ? v : '—',
        })
      }
      return { attribute, cells, variance: 0 }
    }

    // Numeric: gather finite values for normalization
    const finite = rawValues.filter((v): v is number => typeof v === 'number')
    let heatFor: (v: number) => number

    if (finite.length === 0) {
      heatFor = () => 0.5
    } else {
      const min = Math.min(...finite)
      const max = Math.max(...finite)
      if (min === max) {
        heatFor = () => 0.5
      } else if (min > 0 && max / min > 100) {
        // log-scale
        const lmin = Math.log10(min)
        const lmax = Math.log10(max)
        heatFor = (v: number) => {
          if (v <= 0) return 0
          return (Math.log10(v) - lmin) / (lmax - lmin)
        }
      } else {
        heatFor = (v: number) => (v - min) / (max - min)
      }
    }

    const heatValues: number[] = []
    for (const v of rawValues) {
      if (typeof v === 'number') {
        let h = heatFor(v)
        if (!Number.isFinite(h)) h = 0.5
        h = Math.max(0, Math.min(1, h))
        if (attribute.higherIsBetter === false) h = 1 - h
        heatValues.push(h)
        cells.push({
          value: v,
          heat: h,
          display: formatNumber(v, attribute.format as 'number' | 'integer'),
        })
      } else {
        cells.push({ value: null, heat: null, display: '—' })
      }
    }

    return { attribute, cells, variance: variance(heatValues) }
  })
}

/**
 * Sort rows in-place-ish (returns a new array) by descending variance.
 * Rows with zero variance fall to the bottom but keep their original order.
 */
export function sortByVariance(rows: MatrixRow[]): MatrixRow[] {
  return [...rows]
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      if (b.r.variance !== a.r.variance) return b.r.variance - a.r.variance
      return a.i - b.i
    })
    .map(({ r }) => r)
}
