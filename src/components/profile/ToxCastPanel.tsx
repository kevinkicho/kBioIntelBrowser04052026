import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { ToxCastData } from '@/lib/types'

interface ToxCastPanelProps {
  data?: ToxCastData | null
  panelId?: string
  lastFetched?: Date
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const colors = {
    'active': 'bg-red-900/40 text-red-300 border-red-700/30',
    'inactive': 'bg-emerald-900/40 text-emerald-300 border-emerald-700/30',
    'inconclusive': 'bg-amber-900/40 text-amber-300 border-amber-700/30',
  }
  const colorClass = colors[outcome as keyof typeof colors] || 'bg-slate-700 text-slate-300'

  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${colorClass} capitalize`}>
      {outcome}
    </span>
  )
}

export const ToxCastPanel = memo(function ToxCastPanel({ data, panelId, lastFetched }: ToxCastPanelProps) {
  const isEmpty = !data || !data.assays || data.assays.length === 0

  return (
    <Panel
      title="EPA ToxCast / Tox21"
      panelId={panelId}
      lastFetched={lastFetched}
      className="space-y-4"
      empty={isEmpty ? "No ToxCast toxicity data found for this chemical." : undefined}
    >
      {!isEmpty && data && (() => {
        const assays = data.assays
        const activeCount = assays.filter(a => a.outcome === 'active').length
        const inactiveCount = data.assays.filter(a => a.outcome === 'inactive').length
        const inconclusiveCount = data.assays.filter(a => a.outcome === 'inconclusive').length
        return (
          <>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Chemical Info</h3>
              <div className="text-sm text-slate-300">
                <p><span className="font-medium text-slate-100">Name:</span> {data.chemicalName}</p>
                <p><span className="font-medium text-slate-100">DTXSID:</span> {data.dtxsid}</p>
                {data.casrn && (
                  <p><span className="font-medium text-slate-100">CASRN:</span> {data.casrn}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-700">
                <p className="text-2xl font-bold text-slate-100">{data.summary.totalAssays}</p>
                <p className="text-xs text-slate-500">Total Assays</p>
              </div>
              <div className="bg-red-900/20 rounded-lg p-3 text-center border border-red-800/30">
                <p className="text-2xl font-bold text-red-300">{activeCount}</p>
                <p className="text-xs text-red-400">Active</p>
              </div>
              <div className="bg-emerald-900/20 rounded-lg p-3 text-center border border-emerald-800/30">
                <p className="text-2xl font-bold text-emerald-300">{inactiveCount}</p>
                <p className="text-xs text-emerald-400">Inactive</p>
              </div>
              <div className="bg-amber-900/20 rounded-lg p-3 text-center border border-amber-800/30">
                <p className="text-2xl font-bold text-amber-300">{inconclusiveCount}</p>
                <p className="text-xs text-amber-400">Inconclusive</p>
              </div>
            </div>

            {data.summary.topHitSubcategory && (
              <div className="bg-indigo-900/20 border border-indigo-800/30 rounded-lg p-3">
                <p className="text-xs text-indigo-300">
                  <span className="font-medium">Top Hit Subcategory:</span> {data.summary.topHitSubcategory}
                </p>
              </div>
            )}

            {assays.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Assay Results ({assays.length})
                </h3>
                <PaginatedList className="space-y-2">
                  {assays.slice(0, 50).map((assay, i) => (
                    <div key={i} className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-slate-100 text-sm">{assay.assayName}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{assay.endpoint}</p>
                        </div>
                        <OutcomeBadge outcome={assay.outcome} />
                      </div>

                      <div className="flex items-center gap-3 mt-2 text-xs">
                        {assay.potencyValue !== undefined && assay.potencyValue !== null && (
                          <span className="text-slate-400">
                            Potency: <span className="text-slate-200">{assay.potencyValue} {assay.potencyUnit}</span>
                          </span>
                        )}
                        <span className="text-slate-500">
                          n={assay.nConst + assay.nGain + assay.nLoss}
                        </span>
                      </div>
                    </div>
                  ))}
                </PaginatedList>
              </div>
            )}

            <div className="mt-3">
              <a
                href={`https://comptox.epa.gov/dashboard/chemical/details/${data.dtxsid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
              >
                View in EPA CompTox Dashboard →
              </a>
            </div>
          </>
        )
      })()}
    </Panel>
  )
})
