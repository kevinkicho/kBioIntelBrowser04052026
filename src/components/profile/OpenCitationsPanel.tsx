import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { CitationMetric } from '@/lib/types'

export const OpenCitationsPanel = memo(function OpenCitationsPanel({ metrics, panelId, lastFetched }: { metrics: CitationMetric[], panelId?: string, lastFetched?: Date }) {
  if (metrics.length === 0) {
    return (
      <Panel title="Citation Metrics (OpenCitations)" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No citation metric data found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="Citation Metrics (OpenCitations)" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {metrics.map((metric, i) => (
          <div key={i} className="py-3 border-b border-slate-700 last:border-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-2 py-0.5 rounded font-mono">
                {metric.doi}
              </span>
            </div>

            {metric.title && (
              <p className="text-sm text-slate-200 mt-1">{metric.title}</p>
            )}

            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-slate-100 font-semibold">
                Citations: <span className="text-lg font-mono">{metric.citationCount}</span>
              </span>
              <a
                href={metric.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 underline"
              >
                DOI →
              </a>
            </div>
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})
