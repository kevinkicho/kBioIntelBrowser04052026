'use client'

import { memo, useState } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { MoleculeData } from '@/lib/types'

interface CTDPanelProps {
  data: MoleculeData
  panelId?: string
  lastFetched?: Date
}

export const CTDPanel = memo(function CTDPanel({ data, panelId, lastFetched }: CTDPanelProps) {
  const [activeTab, setActiveTab] = useState<'interactions' | 'diseases'>('interactions')
  const interactions = data.ctdInteractions ?? []
  const diseaseAssociations = data.ctdDiseaseAssociations ?? []

  if (interactions.length === 0 && diseaseAssociations.length === 0) {
    return (
      <Panel title="CTD" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No CTD interactions found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title={`CTD Chemical-Gene-Disease Interactions`} panelId={panelId} lastFetched={lastFetched}>
      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setActiveTab('interactions')}
          className={`px-2.5 py-1 text-xs rounded transition-colors ${
            activeTab === 'interactions'
              ? 'bg-blue-900/50 text-blue-300'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
        >
          Gene Interactions ({interactions.length})
        </button>
        <button
          onClick={() => setActiveTab('diseases')}
          className={`px-2.5 py-1 text-xs rounded transition-colors ${
            activeTab === 'diseases'
              ? 'bg-blue-900/50 text-blue-300'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
        >
          Disease Associations ({diseaseAssociations.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'interactions' && (
        <PaginatedList className="space-y-1">
          {interactions.map((interaction, idx) => (
            <div key={idx} className="py-1.5 border-b border-slate-700/50 last:border-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-200">{interaction.geneSymbol}</span>
                <span className="text-xs px-1.5 py-0.5 bg-blue-900/50 text-blue-300 rounded">
                  {interaction.interaction}
                </span>
              </div>
              {interaction.interactionActions && interaction.interactionActions.length > 0 && (
                <p className="text-xs text-slate-400 mt-0.5">
                  Actions: {interaction.interactionActions.slice(0, 3).join(', ')}
                </p>
              )}
            </div>
          ))}
        </PaginatedList>
      )}

      {activeTab === 'diseases' && (
        <PaginatedList className="space-y-1">
          {diseaseAssociations.map((disease, idx) => (
            <div key={idx} className="py-1.5 border-b border-slate-700/50 last:border-0">
              <div className="flex items-center justify-between">
                <a
                  href={`http://ctdbase.org/detail.go?type=disease&acc=${disease.diseaseId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  {disease.diseaseName}
                </a>
                {disease.inferenceScore > 0 && (
                  <span className="text-xs px-1.5 py-0.5 bg-orange-900/50 text-orange-300 rounded">
                    Score: {disease.inferenceScore.toFixed(2)}
                  </span>
                )}
              </div>
              {disease.pmids && disease.pmids.length > 0 && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {disease.pmids.slice(0, 3).map((pmid) => (
                    <a
                      key={pmid}
                      href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline mr-2"
                    >
                      PMID:{pmid}
                    </a>
                  ))}
                </p>
              )}
            </div>
          ))}
        </PaginatedList>
      )}
    </Panel>
  )
})