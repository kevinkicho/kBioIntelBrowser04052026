import { memo } from 'react'
import Link from 'next/link'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { OrphanetDisease } from '@/lib/types'

interface OrphanetPanelProps {
  diseases?: OrphanetDisease[]
  panelId?: string
  lastFetched?: Date
}

export const OrphanetPanel = memo(function OrphanetPanel({ diseases, panelId, lastFetched }: OrphanetPanelProps) {
  const isEmpty = !diseases || diseases.length === 0
  const title = isEmpty ? "Orphanet" : "Orphanet Rare Diseases"

  return (
    <Panel
      title={title}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No rare disease data found for this molecule." : undefined}
    >
      {!isEmpty && diseases && (
        <PaginatedList className="space-y-2">
          {diseases.map((disease, idx) => (
            <div key={idx} className="py-2 border-b border-slate-700/50 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/disease?q=${encodeURIComponent(disease.diseaseName)}`}
                      className="text-sm font-medium text-slate-200 hover:text-indigo-300 transition-colors"
                    >
                      {disease.diseaseName}
                    </Link>
                    <a
                      href={disease.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-400 hover:text-blue-300"
                      title="View on Orphanet"
                    >
                      ↗
                    </a>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    ORPHA: {disease.orphaCode} | Type: {disease.diseaseType}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 bg-purple-900/50 text-purple-300 rounded whitespace-nowrap">
                  {disease.prevalence || 'Unknown'}
                </span>
              </div>
              {disease.definition && (
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{disease.definition}</p>
              )}
              {disease.genes && disease.genes.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  Genes: {disease.genes.slice(0, 5).join(', ')}
                  {disease.genes.length > 5 && ` +${disease.genes.length - 5} more`}
                </p>
              )}
            </div>
          ))}
        </PaginatedList>
      )}
    </Panel>
  )
})