import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { MoleculeData } from '@/lib/types'

interface OrphanetPanelProps {
  data: MoleculeData
  panelId?: string
  lastFetched?: Date
}

export const OrphanetPanel = memo(function OrphanetPanel({ data, panelId, lastFetched }: OrphanetPanelProps) {
  const diseases = data.orphanetDiseases ?? []

  if (diseases.length === 0) {
    return (
      <Panel title="Orphanet" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No rare disease data found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="Orphanet Rare Diseases" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-2">
        {diseases.map((disease, idx) => (
          <div key={idx} className="py-2 border-b border-slate-700/50 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <a
                  href={disease.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                >
                  {disease.diseaseName}
                </a>
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
    </Panel>
  )
})