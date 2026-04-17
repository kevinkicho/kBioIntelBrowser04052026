import { computeOverlaps, type OverlapResult } from './comparisonUtils'
import type { MoleculeData } from './page'

interface ComparisonInsightsProps {
  dataA: MoleculeData
  dataB: MoleculeData
  nameA: string
  nameB: string
}

function OverlapBadge({ count, label, color }: { count: number; label: string; color: string }) {
  if (count === 0) return null
  const colorClasses = color === 'indigo'
    ? 'text-indigo-300 bg-indigo-900/40 border-indigo-800/50'
    : color === 'emerald'
      ? 'text-emerald-300 bg-emerald-900/40 border-emerald-800/50'
      : 'text-amber-300 bg-amber-900/40 border-amber-800/50'
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border ${colorClasses}`}>
      {count} shared {label}{count !== 1 ? 's' : ''}
    </span>
  )
}

function SharedList({ items, maxPreview = 5 }: { items: string[]; maxPreview?: number }) {
  if (items.length === 0) return <span className="text-xs text-slate-600 italic">none shared</span>
  const preview = items.slice(0, maxPreview)
  const remaining = items.length - maxPreview
  return (
    <div className="flex flex-wrap gap-1.5">
      {preview.map(item => (
        <span key={item} className="text-xs px-2 py-0.5 rounded bg-indigo-900/30 text-indigo-300 border border-indigo-800/40">
          {item}
        </span>
      ))}
      {remaining > 0 && (
        <span className="text-xs text-slate-500">+{remaining} more</span>
      )}
    </div>
  )
}

export function ComparisonInsights({ dataA, dataB, nameA, nameB }: ComparisonInsightsProps) {
  const overlaps: OverlapResult = computeOverlaps(dataA, dataB)

  const totalShared = overlaps.sharedTargets.length + overlaps.sharedPathways.length + overlaps.sharedManufacturers.length + overlaps.sharedIndications.length
  if (totalShared === 0) {
    return (
      <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Comparison Insights</h2>
        <p className="text-sm text-slate-500">No shared targets, pathways, manufacturers, or indications found between {nameA} and {nameB}.</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-5 mb-6">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Comparison Insights</h2>

      <div className="flex flex-wrap gap-2 mb-4">
        <OverlapBadge count={overlaps.sharedTargets.length} label="target" color="indigo" />
        <OverlapBadge count={overlaps.sharedPathways.length} label="pathway" color="emerald" />
        <OverlapBadge count={overlaps.sharedManufacturers.length} label="manufacturer" color="amber" />
        <OverlapBadge count={overlaps.sharedIndications.length} label="indication" color="indigo" />
      </div>

      <div className="space-y-3">
        {overlaps.sharedTargets.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-1.5">Shared Protein Targets</p>
            <SharedList items={overlaps.sharedTargets} />
          </div>
        )}

        {overlaps.sharedPathways.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-1.5">Shared Pathways</p>
            <SharedList items={overlaps.sharedPathways} />
          </div>
        )}

        {overlaps.sharedManufacturers.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-1.5">Shared Manufacturers</p>
            <SharedList items={overlaps.sharedManufacturers} />
          </div>
        )}

        {overlaps.sharedIndications.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-1.5">Shared Indications</p>
            <SharedList items={overlaps.sharedIndications} />
          </div>
        )}

        {(overlaps.onlyInA.targets.length > 0 || overlaps.onlyInB.targets.length > 0) && (
          <div className="pt-2 border-t border-slate-700/50">
            <p className="text-xs text-slate-400 mb-1.5">Unique Targets</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-slate-500 mb-1">Only in {nameA}</p>
                <SharedList items={overlaps.onlyInA.targets} maxPreview={3} />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 mb-1">Only in {nameB}</p>
                <SharedList items={overlaps.onlyInB.targets} maxPreview={3} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}