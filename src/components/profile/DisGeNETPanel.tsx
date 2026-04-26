import { memo } from 'react'
import Link from 'next/link'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { DisGeNetAssociation } from '@/lib/types'

interface DisGeNETPanelProps {
  associations?: DisGeNetAssociation[]
  panelId?: string
  lastFetched?: Date
}

export const DisGeNETPanel = memo(function DisGeNETPanel({ associations, panelId, lastFetched }: DisGeNETPanelProps) {
  const isEmpty = !associations || associations.length === 0
  const title = isEmpty ? "DisGeNET" : "DisGeNET Gene-Disease Associations"

  return (
    <Panel
      title={title}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No disease-gene associations found for this molecule." : undefined}
    >
      {!isEmpty && associations && (
        <PaginatedList className="space-y-2">
          {associations.map((assoc, idx) => (
            <div key={idx} className="py-2 border-b border-slate-700/50 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/disease?q=${encodeURIComponent(assoc.diseaseName)}`}
                      className="text-sm font-medium text-slate-200 hover:text-indigo-300 transition-colors"
                    >
                      {assoc.diseaseName}
                    </Link>
                    <a
                      href={`https://www.disgenet.org/browser/0/1/${assoc.diseaseId}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-400 hover:text-blue-300"
                      title="View on DisGeNET"
                    >
                      ↗
                    </a>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Score: {assoc.score?.toFixed(3) ?? 'N/A'}
                    {assoc.confidenceScore && ` | Confidence: ${assoc.confidenceScore.toFixed(2)}`}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 bg-blue-900/50 text-blue-300 rounded whitespace-nowrap">
                  {assoc.source}
                </span>
              </div>
              {assoc.pmids && assoc.pmids.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  {assoc.pmids.slice(0, 3).join(', ')}
                  {assoc.pmids.length > 3 && ` +${assoc.pmids.length - 3} more`}
                </p>
              )}
            </div>
          ))}
        </PaginatedList>
      )}
    </Panel>
  )
})