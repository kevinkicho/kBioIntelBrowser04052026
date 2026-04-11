'use client'

import React, { useMemo } from 'react'
import { PaginatedList } from '@/components/ui/PaginatedList'
import { Panel } from '@/components/ui/Panel'
import type { BioSample } from '@/lib/api/biosamples'

interface BioSamplesPanelProps {
  samples?: BioSample[]
  panelId: string
  lastFetched?: Date
}

export function BioSamplesPanel({
  samples,
  panelId,
  lastFetched,
}: BioSamplesPanelProps) {
  const hasData = Boolean(samples?.length)

  const renderSampleCard = useMemo(() => {
    // eslint-disable-next-line react/display-name
    return (sample: BioSample) => (
      <div key={sample.id} className="p-4 border rounded-lg bg-gray-50">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <h4 className="font-semibold text-blue-700 mb-1">{sample.name}</h4>
            <p className="text-xs text-gray-500 mb-1">ID: {sample.id}</p>
            {sample.organism && (
              <span className="inline-block px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full mb-2">
                {sample.organism}
              </span>
            )}
          </div>
          <a
            href={`https://www.ebi.ac.uk/biosamples/samples/${sample.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline whitespace-nowrap"
          >
            View Sample
          </a>
        </div>

        {sample.description && (
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{sample.description}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
          <span>Submitter: {sample.submitter}</span>
          <span>•</span>
          <span>Updated: {new Date(sample.updateDate).toLocaleDateString()}</span>
        </div>

        {(sample.attributes?.length ?? 0) > 0 && (
          <div className="mt-2 pt-2 border-t">
            <div className="flex flex-wrap gap-1">
              {sample.attributes.slice(0, 6).map((attr, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded"
                  title={`${attr.name}: ${attr.value}`}
                >
                  {attr.name}
                </span>
              ))}
              {sample.attributes.length > 6 && (
                <span className="px-2 py-0.5 text-xs text-gray-500">
                  +{sample.attributes.length - 6} more
                </span>
              )}
            </div>
          </div>
        )}

        {(sample.externalReferences?.length ?? 0) > 0 && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs text-gray-500 mb-1">External Links:</p>
            <div className="flex flex-wrap gap-1">
              {sample.externalReferences.slice(0, 4).map((ref, idx) => (
                <a
                  key={idx}
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  {ref.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }, [])

  if (!hasData) {
    return (
      <Panel panelId={panelId} title="BioSamples" lastFetched={lastFetched}>
        <p className="text-gray-500 text-sm">No biological sample data available.</p>
      </Panel>
    )
  }

  return (
    <Panel panelId={panelId} title={`BioSamples (${samples?.length})`} lastFetched={lastFetched}>
      <div className="space-y-4">
        <PaginatedList pageSize={5}>
          {(samples ?? []).map(renderSampleCard)}
        </PaginatedList>
      </div>
    </Panel>
  )
}
