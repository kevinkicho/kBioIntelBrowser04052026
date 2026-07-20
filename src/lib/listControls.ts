/**
 * Shared helpers for list filter + sort in profile panels.
 */

/** Parse many free-form scientific date strings → epoch ms (0 if unknown). */
export function parseListDate(raw: unknown): number {
  if (raw == null || raw === '') return 0
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    // year only
    if (raw > 1800 && raw < 2200) return Date.UTC(raw, 0, 1)
    return raw
  }
  const s = String(raw).trim()
  if (!s) return 0
  // YYYY or YYYY-MM or YYYY-MM-DD
  const iso = s.match(/^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?/)
  if (iso) {
    const y = Number(iso[1])
    const m = Number(iso[2] || 1) - 1
    const d = Number(iso[3] || 1)
    const t = Date.UTC(y, m, d)
    return Number.isFinite(t) ? t : 0
  }
  // MM/DD/YYYY or DD/MM/YYYY — prefer ISO parse
  const t = Date.parse(s)
  return Number.isFinite(t) ? t : 0
}

/** Coerce free-API values (numbers, null, rare objects) before localeCompare. */
export function compareText(a: unknown, b: unknown): number {
  const sa = a == null ? '' : typeof a === 'string' ? a : String(a)
  const sb = b == null ? '' : typeof b === 'string' ? b : String(b)
  return sa.localeCompare(sb, undefined, { sensitivity: 'base', numeric: true })
}

export function compareNumber(a: number, b: number): number {
  const na = Number.isFinite(a) ? a : 0
  const nb = Number.isFinite(b) ? b : 0
  return na - nb
}

export type ListSortOption<T> = {
  id: string
  label: string
  compare: (a: T, b: T) => number
}

/** Common A–Z / Z–A sorts from a label getter. */
export function alphaSortOptions<T>(
  getLabel: (item: T) => unknown,
): ListSortOption<T>[] {
  return [
    {
      id: 'name-asc',
      label: 'Name A–Z',
      compare: (a, b) => compareText(getLabel(a), getLabel(b)),
    },
    {
      id: 'name-desc',
      label: 'Name Z–A',
      compare: (a, b) => compareText(getLabel(b), getLabel(a)),
    },
  ]
}

/** Newest / oldest from a date field getter. */
export function dateSortOptions<T>(
  getDate: (item: T) => unknown,
  labels: { newest?: string; oldest?: string; idPrefix?: string } = {},
): ListSortOption<T>[] {
  const p = labels.idPrefix ?? 'date'
  return [
    {
      id: `${p}-desc`,
      label: labels.newest ?? 'Newest first',
      compare: (a, b) => parseListDate(getDate(b)) - parseListDate(getDate(a)),
    },
    {
      id: `${p}-asc`,
      label: labels.oldest ?? 'Oldest first',
      compare: (a, b) => parseListDate(getDate(a)) - parseListDate(getDate(b)),
    },
  ]
}

/** Highest / lowest numeric field. */
export function numberSortOptions<T>(
  getNum: (item: T) => number,
  labels: { high?: string; low?: string; idPrefix?: string } = {},
): ListSortOption<T>[] {
  const p = labels.idPrefix ?? 'num'
  return [
    {
      id: `${p}-desc`,
      label: labels.high ?? 'Highest first',
      compare: (a, b) => compareNumber(getNum(b), getNum(a)),
    },
    {
      id: `${p}-asc`,
      label: labels.low ?? 'Lowest first',
      compare: (a, b) => compareNumber(getNum(a), getNum(b)),
    },
  ]
}

export function applyFilterSort<T>(
  items: T[],
  opts: {
    query: string
    getSearchText: (item: T) => string
    sortId: string
    sortOptions: ListSortOption<T>[]
  },
): T[] {
  const q = opts.query.trim().toLowerCase()
  let out = items
  if (q) {
    out = items.filter((item) => {
      try {
        const hay = String(opts.getSearchText(item) ?? '').toLowerCase()
        return hay.includes(q)
      } catch {
        return false
      }
    })
  }
  const sort = opts.sortOptions.find((s) => s.id === opts.sortId) ?? opts.sortOptions[0]
  if (!sort) return out
  try {
    return [...out].sort((a, b) => {
      try {
        return sort.compare(a, b)
      } catch {
        return 0
      }
    })
  } catch {
    return out
  }
}
