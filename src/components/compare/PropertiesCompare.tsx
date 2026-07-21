import type { ComputedProperties } from '@/lib/types'

export interface PropertiesColumn {
  label: string
  props: ComputedProperties | null
  mw: number
}

interface Props {
  /** Preferred: N columns. Falls back to a/b when omitted. */
  columns?: PropertiesColumn[]
  /** @deprecated pairwise — use columns */
  a?: ComputedProperties | null
  b?: ComputedProperties | null
  mwA?: number
  mwB?: number
}

function formatValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return String(value)
}

function valueClass(value: number | null | undefined, threshold?: number): string {
  if (value === null || value === undefined) return 'text-sm text-slate-600 text-center tabular-nums'
  if (threshold !== undefined && value > threshold)
    return 'text-sm text-amber-300 text-center tabular-nums'
  return 'text-sm text-slate-200 text-center tabular-nums'
}

export function PropertiesCompare({ columns, a, b, mwA = 0, mwB = 0 }: Props) {
  const cols: PropertiesColumn[] =
    columns && columns.length > 0
      ? columns
      : [
          { label: 'A', props: a ?? null, mw: mwA },
          { label: 'B', props: b ?? null, mw: mwB },
        ]

  const n = cols.length
  const gridTemplate = `minmax(7rem,1.2fr) repeat(${n}, minmax(0,1fr))`

  const rows: {
    label: string
    values: (number | null | undefined)[]
    threshold?: number
  }[] = [
    { label: 'Molecular Weight', values: cols.map((c) => c.mw), threshold: 500 },
    { label: 'LogP', values: cols.map((c) => c.props?.xLogP), threshold: 5 },
    { label: 'TPSA (Å²)', values: cols.map((c) => c.props?.tpsa) },
    {
      label: 'H-Bond Donors',
      values: cols.map((c) => c.props?.hBondDonorCount),
      threshold: 5,
    },
    {
      label: 'H-Bond Acceptors',
      values: cols.map((c) => c.props?.hBondAcceptorCount),
      threshold: 10,
    },
    { label: 'Complexity', values: cols.map((c) => c.props?.complexity) },
    {
      label: 'Rotatable Bonds',
      values: cols.map((c) => c.props?.rotatableBondCount),
    },
  ]

  return (
    <div className="space-y-0.5 overflow-x-auto">
      <div
        className="grid gap-2 border-b border-slate-800 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <span>Property</span>
        {cols.map((c) => (
          <span key={c.label} className="truncate text-center text-slate-400">
            {c.label}
          </span>
        ))}
      </div>
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid gap-2 border-b border-slate-800/60 py-1.5"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          <span className="text-xs text-slate-400">{row.label}</span>
          {row.values.map((v, i) => (
            <span key={i} className={valueClass(v, row.threshold)}>
              {formatValue(v)}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}
