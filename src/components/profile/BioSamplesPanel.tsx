'use client'

import React, { useMemo } from 'react'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import { Panel } from '@/components/ui/Panel'
import type { BioSample } from '@/lib/api/biosamples'
import { alphaSortOptions, dateSortOptions } from '@/lib/listControls'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

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
  const list = samples ?? []
  const hasData = list.length > 0

  const sortOptions = useMemo(
    () => [
      ...dateSortOptions<BioSample>((s) => s.updateDate || s.submissionDate),
      ...alphaSortOptions<BioSample>((s) => s.name || s.id),
    ],
    [],
  )

  if (!hasData) {
    return (
      <Panel panelId={panelId} title="BioSamples" lastFetched={lastFetched}>
        <p className="text-gray-500 text-sm">No biological sample data available.</p>
      </Panel>
    )
  }

  return (
    <Panel panelId={panelId} title={`BioSamples (${list.length})`} lastFetched={lastFetched}>
      <div className="space-y-4">
        <FilterablePaginatedList
          items={list}
          getSearchText={(s) =>
            [
              s.name,
              s.id,
              s.organism,
              s.description,
              s.submitter,
              ...(s.attributes ?? []).flatMap((a) => [a.name, a.value]),
            ]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="date-desc"
          filterPlaceholder="Filter samples…"
          getKey={(s) => s.id}
          pageSize={5}
          renderItem={(sample) => (
            <div className="p-4 border rounded-lg bg-gray-50">
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
                      <StyledTooltip key={idx} content={`${attr.name}: ${attr.value}`}>
                        <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded">
                          {attr.name}
                        </span>
                      </StyledTooltip>
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
          )}
        />
      </div>
    </Panel>
  )
}
