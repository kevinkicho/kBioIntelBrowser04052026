'use client'

import { memo, useState } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { IEDBEpitope } from '@/lib/types'

interface IEDBPanelProps {
  epitopes?: IEDBEpitope[]
  panelId?: string
  lastFetched?: Date
}

export const IEDBPanel = memo(function IEDBPanel({ epitopes, panelId, lastFetched }: IEDBPanelProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'bcell' | 'tcell'>('all')

  if (!epitopes || epitopes.length === 0) {
    return (
      <Panel title="IEDB" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No epitope data found for this molecule.</p>
      </Panel>
    )
  }

  const bCellEpitopes = epitopes.filter(e => e.epitopeType === 'B cell')
  const tCellEpitopes = epitopes.filter(e => e.epitopeType === 'T cell')

  const filteredEpitopes =
    activeTab === 'bcell' ? bCellEpitopes :
    activeTab === 'tcell' ? tCellEpitopes :
    epitopes

  return (
    <Panel title={`IEDB Epitopes (${bCellEpitopes.length} B-cell, ${tCellEpitopes.length} T-cell)`} panelId={panelId} lastFetched={lastFetched}>
      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-2.5 py-1 text-xs rounded transition-colors ${
            activeTab === 'all'
              ? 'bg-blue-900/50 text-blue-300'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
        >
          All ({epitopes.length})
        </button>
        <button
          onClick={() => setActiveTab('bcell')}
          className={`px-2.5 py-1 text-xs rounded transition-colors ${
            activeTab === 'bcell'
              ? 'bg-green-900/50 text-green-300'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
        >
          B-cell ({bCellEpitopes.length})
        </button>
        <button
          onClick={() => setActiveTab('tcell')}
          className={`px-2.5 py-1 text-xs rounded transition-colors ${
            activeTab === 'tcell'
              ? 'bg-purple-900/50 text-purple-300'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
        >
          T-cell ({tCellEpitopes.length})
        </button>
      </div>

      {/* Content */}
      <PaginatedList className="space-y-2">
        {filteredEpitopes.slice(0, 20).map((epitope, idx) => (
          <div key={idx} className="py-2 border-b border-slate-700/50 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <a
                    href={epitope.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                  >
                    {epitope.name || `Epitope ${epitope.epitopeId}`}
                  </a>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    epitope.epitopeType === 'B cell'
                      ? 'bg-green-900/50 text-green-300'
                      : epitope.epitopeType === 'T cell'
                      ? 'bg-purple-900/50 text-purple-300'
                      : 'bg-slate-700 text-slate-300'
                  }`}>
                    {epitope.epitopeType}
                  </span>
                </div>

                {epitope.sequence && (
                  <p className="font-mono text-xs text-slate-400 mt-1 bg-slate-700/50 px-1.5 py-0.5 rounded inline-block">
                    {epitope.sequence.length > 30
                      ? `${epitope.sequence.substring(0, 30)}...`
                      : epitope.sequence}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 mt-1 text-xs text-slate-400">
                  {epitope.antigenName && (
                    <div>
                      <span className="text-slate-500">Antigen:</span> {epitope.antigenName}
                    </div>
                  )}
                  {epitope.organismName && (
                    <div>
                      <span className="text-slate-500">Organism:</span> {epitope.organismName}
                    </div>
                  )}
                  {epitope.mhcRestriction && (
                    <div>
                      <span className="text-slate-500">MHC:</span> {epitope.mhcRestriction}
                    </div>
                  )}
                </div>

                {epitope.assayCount > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    {epitope.positiveAssayCount}/{epitope.assayCount} positive assays
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
        {filteredEpitopes.length > 20 && (
          <p className="text-xs text-slate-500 text-center py-1">
            Showing 20 of {filteredEpitopes.length} epitopes
          </p>
        )}
      </PaginatedList>
    </Panel>
  )
})