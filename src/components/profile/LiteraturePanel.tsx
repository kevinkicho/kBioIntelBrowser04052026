import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import { PaginatedVirtualizedList } from '@/components/ui/VirtualizedList'
import type { LiteratureResult } from '@/lib/types'

const VIRTUALIZATION_THRESHOLD = 20

function LiteratureItem({ paper }: { paper: LiteratureResult }) {
  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <p className="font-semibold text-slate-100 text-sm leading-snug">{paper.title}</p>
      {paper.authors && (
        <p className="text-xs text-slate-400 mt-1 truncate">{paper.authors}</p>
      )}
      <div className="flex items-center gap-3 mt-1">
        {paper.journal && (
          <span className="text-xs text-slate-500">{paper.journal}</span>
        )}
        {paper.year > 0 && (
          <span className="text-xs text-slate-500">{paper.year}</span>
        )}
        {paper.citedByCount !== undefined && paper.citedByCount > 0 && (
          <span className="text-xs bg-blue-900/40 text-blue-300 border border-blue-700/30 px-2 py-0.5 rounded">
            {paper.citedByCount} cited
          </span>
        )}
      </div>
      {paper.doi && (
        <a
          href={`https://doi.org/${paper.doi}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={paper.doi}
          className="text-xs text-blue-400 hover:text-blue-300 mt-1 block doi-display"
          data-doi={paper.doi}
        />
      )}
    </div>
  )
}

export const LiteraturePanel = memo(function LiteraturePanel({ results, panelId, lastFetched }: { results: LiteratureResult[], panelId?: string, lastFetched?: Date }) {
  if (results.length === 0) {
    return (
      <Panel title="Scientific Literature (Europe PMC)" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No publications found for this molecule.</p>
      </Panel>
    )
  }

  // Use virtualization for large datasets
  if (results.length > VIRTUALIZATION_THRESHOLD) {
    return (
      <Panel title="Scientific Literature (Europe PMC)" panelId={panelId} lastFetched={lastFetched}>
        <PaginatedVirtualizedList
          items={results}
          renderItem={(paper, i) => <LiteratureItem key={`${paper.doi || paper.title}-${i}`} paper={paper} />}
          initialCount={10}
          estimateSize={120}
          emptyMessage="No publications found for this molecule."
        />
      </Panel>
    )
  }

  return (
    <Panel title="Scientific Literature (Europe PMC)" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {results.map((paper, i) => (
          <LiteratureItem key={`${paper.doi || paper.title}-${i}`} paper={paper} />
        ))}
      </PaginatedList>
    </Panel>
  )
})