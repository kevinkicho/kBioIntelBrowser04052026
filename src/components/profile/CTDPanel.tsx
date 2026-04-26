'use client'

import { memo, useState } from 'react'
import Link from 'next/link'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { CTDInteraction, CTDDiseaseAssociation } from '@/lib/types'

interface CTDPanelProps {
  interactions?: CTDInteraction[]
  diseaseAssociations?: CTDDiseaseAssociation[]
  panelId?: string
  lastFetched?: Date
}

export const CTDPanel = memo(function CTDPanel({ interactions, diseaseAssociations, panelId, lastFetched }: CTDPanelProps) {
  const [activeTab, setActiveTab] = useState<'interactions' | 'diseases'>('interactions')
  const items = interactions ?? []
  const diseases = diseaseAssociations ?? []
  const isEmpty = items.length === 0 && diseases.length === 0
  const title = isEmpty ? "CTD" : "CTD Chemical-Gene-Disease Interactions"

  return (
    <Panel
      title={title}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No CTD interactions found for this molecule." : undefined}
    >
      {!isEmpty && (
        <>
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
          Gene Interactions ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('diseases')}
          className={`px-2.5 py-1 text-xs rounded transition-colors ${
            activeTab === 'diseases'
              ? 'bg-blue-900/50 text-blue-300'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
        >
          Disease Associations ({diseases.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'interactions' && (
        <PaginatedList className="space-y-1">
          {items.map((interaction, idx) => (
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
          {diseases.map((disease, idx) => (
            <div key={idx} className="py-1.5 border-b border-slate-700/50 last:border-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/disease?q=${encodeURIComponent(disease.diseaseName)}`}
                    className="text-sm font-medium text-slate-200 hover:text-indigo-300 transition-colors"
                  >
                    {disease.diseaseName}
                  </Link>
                  <a
                    href={`http://ctdbase.org/detail.go?type=disease&acc=${disease.diseaseId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-400 hover:text-blue-300"
                    title="View on CTD"
                  >
                    ↗
                  </a>
                </div>
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
        </>
      )}
    </Panel>
  )
})