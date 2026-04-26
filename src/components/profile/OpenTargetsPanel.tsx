import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { DiseaseAssociation } from '@/lib/types'

export const OpenTargetsPanel = memo(function OpenTargetsPanel({ diseases, panelId, lastFetched }: { diseases: DiseaseAssociation[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = diseases.length === 0
  return (
    <Panel
      title="Disease Associations (Open Targets)"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No disease associations found for this molecule." : undefined}
    >
      {!isEmpty && (
        <PaginatedList className="space-y-3">
          {diseases.map((disease, i) => (
            <div key={i} className="py-3 border-b border-slate-700 last:border-0">
              <p className="font-semibold text-slate-100 text-sm">{disease.diseaseName}</p>
              <div className="flex gap-2 mt-1 flex-wrap">
                {disease.therapeuticAreas?.map((area, j) => (
                  <span
                    key={j}
                    className="text-xs bg-indigo-900/40 text-indigo-300 border border-indigo-700/30 px-2 py-0.5 rounded"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </PaginatedList>
      )}
    </Panel>
  )
})
