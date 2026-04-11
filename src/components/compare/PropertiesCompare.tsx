import type { ComputedProperties } from '@/lib/types'

interface Props {
  a: ComputedProperties | null
  b: ComputedProperties | null
  mwA: number
  mwB: number
}

interface Row {
  label: string
  valueA: number | null | undefined
  valueB: number | null | undefined
  threshold?: number
}

function formatValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A'
  return String(value)
}

function valueClass(value: number | null | undefined, threshold?: number): string {
  if (value === null || value === undefined) return 'text-sm text-slate-600 text-center'
  if (threshold !== undefined && value > threshold) return 'text-sm text-amber-300 text-center'
  return 'text-sm text-slate-200 text-center'
}

export function PropertiesCompare({ a, b, mwA, mwB }: Props) {
  const rows: Row[] = [
    { label: 'Molecular Weight', valueA: mwA, valueB: mwB, threshold: 500 },
    { label: 'LogP', valueA: a?.xLogP, valueB: b?.xLogP, threshold: 5 },
    { label: 'TPSA (Å²)', valueA: a?.tpsa, valueB: b?.tpsa },
    { label: 'H-Bond Donors', valueA: a?.hBondDonorCount, valueB: b?.hBondDonorCount, threshold: 5 },
    { label: 'H-Bond Acceptors', valueA: a?.hBondAcceptorCount, valueB: b?.hBondAcceptorCount, threshold: 10 },
    { label: 'Complexity', valueA: a?.complexity, valueB: b?.complexity },
    { label: 'Rotatable Bonds', valueA: a?.rotatableBondCount, valueB: b?.rotatableBondCount },
  ]

  return (
    <div className="space-y-1">
      {rows.map(row => (
        <div key={row.label} className="grid grid-cols-3 gap-4 py-1.5 border-b border-slate-800">
          <span className="text-xs text-slate-400">{row.label}</span>
          <span className={valueClass(row.valueA, row.threshold)}>{formatValue(row.valueA)}</span>
          <span className={valueClass(row.valueB, row.threshold)}>{formatValue(row.valueB)}</span>
        </div>
      ))}
    </div>
  )
}
