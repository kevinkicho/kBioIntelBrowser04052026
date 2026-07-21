/** NHGRI AnVIL datasets. */

'use client'

import { memo, useMemo } from 'react'
import type { AnvilDataset } from '@/lib/types'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import { DataPoint } from '@/components/ui/DataPoint'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'

interface NhgriAnvilPanelProps {
  data: AnvilDataset[]
  isLoading?: boolean
  panelId?: string
  lastFetched?: Date
}

function datasetUrl(d: AnvilDataset): string {
  // AnVIL catalog browse; dataset IDs vary by workspace
  if (d.datasetId) {
    return `https://anvilproject.org/data?search=${encodeURIComponent(d.datasetId)}`
  }
  if (d.name) {
    return `https://anvilproject.org/data?search=${encodeURIComponent(d.name)}`
  }
  return 'https://anvilproject.org/data'
}

export const NhgriAnvilPanel = memo(function NhgriAnvilPanel({
  data,
  isLoading,
  panelId = 'nhgri-anvil',
  lastFetched,
}: NhgriAnvilPanelProps) {
  const list = Array.isArray(data) ? data : []
  const isEmpty = !isLoading && list.length === 0

  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<AnvilDataset>((d) => d.name || ''),
      ...numberSortOptions<AnvilDataset>((d) => d.participantCount ?? 0, {
        high: 'Most participants',
        low: 'Fewest participants',
        idPrefix: 'participants',
      }),
      ...numberSortOptions<AnvilDataset>((d) => d.sampleCount ?? 0, {
        high: 'Most samples',
        low: 'Fewest samples',
        idPrefix: 'samples',
      }),
    ],
    [],
  )

  return (
    <Panel
      title={isEmpty ? 'NHGRI AnVIL Datasets' : `NHGRI AnVIL Datasets (${list.length})`}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={
        isLoading
          ? 'Loading AnVIL datasets…'
          : isEmpty
            ? 'No genomic datasets found for this molecule.'
            : undefined
      }
    >
      {!isEmpty && !isLoading && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(d) =>
            [
              d.name,
              d.datasetId,
              d.studyName,
              d.description,
              ...(d.dataTypes || []),
              ...(d.consentGroups || []),
            ]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="name-asc"
          filterPlaceholder="Filter datasets (name, study, type…)"
          getKey={(d, i) => `${d.datasetId}-${i}`}
          renderItem={(d) => {
            const href = datasetUrl(d)
            return (
              <DataPoint
                sourceKey="nhgri-anvil"
                label={d.name}
                recordUrl={href}
                fetchedAt={lastFetched}
              >
                <div className="py-2 border-b border-slate-700/60 last:border-0 pr-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-slate-100 hover:text-indigo-300"
                        >
                          {d.name}
                        </a>
                        {d.datasetId && (
                          <span className="text-[10px] font-mono text-indigo-300/90 bg-indigo-900/20 border border-indigo-800/40 px-1.5 py-0.5 rounded">
                            {d.datasetId}
                          </span>
                        )}
                      </div>
                      {d.studyName && (
                        <p className="mt-0.5 text-[11px] text-slate-400">Study: {d.studyName}</p>
                      )}
                      {d.description && (
                        <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2 leading-snug">
                          {d.description}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-slate-500">
                        {[
                          d.participantCount != null && `${d.participantCount} participants`,
                          d.sampleCount != null && `${d.sampleCount} samples`,
                          d.dataTypes?.length ? d.dataTypes.slice(0, 4).join(', ') : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      {d.consentGroups?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {d.consentGroups.slice(0, 4).map((g) => (
                            <span
                              key={g}
                              className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-[10px] text-indigo-400 hover:text-indigo-300"
                    >
                      AnVIL
                    </a>
                  </div>
                </div>
              </DataPoint>
            )
          }}
        />
      )}
    </Panel>
  )
})
