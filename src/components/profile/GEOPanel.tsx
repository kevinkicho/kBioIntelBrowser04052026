import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { GEODataset } from '@/lib/types'

function GEOItem({ dataset }: { dataset: GEODataset }) {
  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <a
          href={dataset.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-slate-100 text-sm hover:text-cyan-400 transition-colors line-clamp-2"
        >
          {dataset.title}
        </a>
        <span className="text-xs bg-purple-900/40 text-purple-300 border border-purple-700/30 px-2 py-0.5 rounded shrink-0">
          {dataset.accession}
        </span>
      </div>
      <p className="text-xs text-slate-500 mt-1">{dataset.organism}</p>
      {dataset.summary && (
        <p className="text-xs text-slate-600 mt-2 line-clamp-2">{dataset.summary}</p>
      )}
      <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-400">
        <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{dataset.platformType}</span>
        <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{dataset.sampleType}</span>
        <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{dataset.nSamples} samples</span>
        <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{dataset.nFeatures} features</span>
      </div>
    </div>
  )
}

export const GEOPanel = memo(function GEOPanel({ datasets, panelId, lastFetched }: { datasets: GEODataset[], panelId?: string, lastFetched?: Date }) {
  if (datasets.length === 0) {
    return (
      <Panel title="GEO" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No GEO datasets found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="GEO" panelId={panelId} lastFetched={lastFetched}>
      <p className="text-xs text-slate-400 mb-3">Gene Expression Omnibus datasets</p>
      <PaginatedList className="space-y-3">
        {datasets.map((dataset, i) => (
          <GEOItem key={`${dataset.geoId}-${i}`} dataset={dataset} />
        ))}
      </PaginatedList>
    </Panel>
  )
})