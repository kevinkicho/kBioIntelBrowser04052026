'use client'

import React, { useMemo } from 'react'
import { PaginatedList } from '@/components/ui/PaginatedList'
import { Panel } from '@/components/ui/Panel'
import type { MassIVEDataset } from '@/lib/api/massive'

interface MassivePanelProps {
  datasets?: MassIVEDataset[]
  panelId: string
  lastFetched?: Date
}

export function MassivePanel({
  datasets,
  panelId,
  lastFetched,
}: MassivePanelProps) {
  const hasData = Boolean(datasets?.length)

  const renderDatasetCard = useMemo(() => {
    // eslint-disable-next-line react/display-name
    return (dataset: MassIVEDataset) => (
      <div key={dataset.id} className="p-4 border rounded-lg bg-gray-50">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-mono">
                {dataset.id}
              </span>
              {dataset.datasetType && (
                <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
                  {dataset.datasetType}
                </span>
              )}
            </div>
            <h4 className="font-semibold text-blue-700 mb-1">{dataset.title}</h4>
          </div>
          <a
            href={dataset.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline whitespace-nowrap"
          >
            View Dataset
          </a>
        </div>

        {dataset.description && (
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{dataset.description}</p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-2">
          {dataset.organism && (
            <div>
              <span className="text-gray-500">Organism:</span>{' '}
              <span className="font-medium">{dataset.organism}</span>
            </div>
          )}
          {dataset.instrumentType && (
            <div>
              <span className="text-gray-500">Instrument:</span>{' '}
              <span className="font-medium">{dataset.instrumentType}</span>
            </div>
          )}
          {dataset.sampleType && (
            <div>
              <span className="text-gray-500">Sample:</span>{' '}
              <span className="font-medium">{dataset.sampleType}</span>
            </div>
          )}
          <div>
            <span className="text-gray-500">Files:</span>{' '}
            <span className="font-medium">{dataset.fileCount}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
          <span>Submitter: {dataset.submitter}</span>
          <span>•</span>
          <span>Updated: {new Date(dataset.updateDate).toLocaleDateString()}</span>
        </div>

        {(dataset.publication || dataset.pubmedId) && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs text-gray-500 mb-1">Publication:</p>
            {dataset.pubmedId ? (
              <a
                href={`https://pubmed.ncbi.nlm.nih.gov/${dataset.pubmedId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                PubMed: {dataset.pubmedId}
              </a>
            ) : (
              <span className="text-xs text-gray-600">{dataset.publication}</span>
            )}
          </div>
        )}

        {dataset.doi && (
          <div className="mt-2 pt-2 border-t">
            <a
              href={`https://doi.org/${dataset.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              DOI: {dataset.doi}
            </a>
          </div>
        )}
      </div>
    )
  }, [])

  if (!hasData) {
    return (
      <Panel panelId={panelId} title="MassIVE Proteomics" lastFetched={lastFetched}>
        <p className="text-gray-500 text-sm">No MassIVE proteomics datasets available.</p>
      </Panel>
    )
  }

  return (
    <Panel panelId={panelId} title={`MassIVE Proteomics (${datasets?.length})`} lastFetched={lastFetched}>
      <div className="space-y-4">
        <PaginatedList pageSize={5}>
          {(datasets ?? []).map(renderDatasetCard)}
        </PaginatedList>
      </div>
    </Panel>
  )
}
