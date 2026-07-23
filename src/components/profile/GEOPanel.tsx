'use client'

import { memo, useMemo } from 'react'
import { DescriptionTip } from '@/components/ui/HelperTip'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { GEODataset } from '@/lib/types'
import {
  alphaSortOptions,
  dateSortOptions,
  numberSortOptions,
} from '@/lib/listControls'

function GEOItem({ dataset }: { dataset: GEODataset }) {
  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <a
          href={dataset.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-slate-100 text-sm hover:text-cyan-400 transition-colors line-clamp-2"
        >
          {dataset.title}
        </a>
        <span className="text-xs bg-purple-900/40 text-purple-300 border border-purple-700/30 px-2 py-0.5 rounded shrink-0">
          {dataset.accession}
        </span>
      </div>
      <p className="text-xs text-slate-500 mt-1">{dataset.organism}</p>
      {dataset.summary && (
        <DescriptionTip text={dataset.summary} className="mt-2" label="Summary" />
      )}
      <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-400">
        <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{dataset.platformType}</span>
        <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{dataset.sampleType}</span>
        <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{dataset.nSamples} samples</span>
        <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{dataset.nFeatures} features</span>
      </div>
    </div>
  )
}

export const GEOPanel = memo(function GEOPanel({ datasets, panelId, lastFetched }: { datasets: GEODataset[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = datasets.length === 0
  const sortOptions = useMemo(
    () => [
      ...dateSortOptions<GEODataset>((d) => d.releaseDate || d.lastUpdate, {
        newest: 'Newest release',
        oldest: 'Oldest release',
      }),
      ...alphaSortOptions<GEODataset>((d) => d.title || ''),
      ...numberSortOptions<GEODataset>((d) => d.nSamples ?? 0, {
        high: 'Most samples',
        low: 'Fewest samples',
      }),
      ...numberSortOptions<GEODataset>((d) => d.nFeatures ?? 0, {
        high: 'Most features',
        low: 'Fewest features',
        idPrefix: 'feat',
      }),
      ...alphaSortOptions<GEODataset>((d) => d.accession || d.geoId || '').map((o) => ({
        ...o,
        id: `acc-${o.id}`,
        label: o.id === 'name-asc' ? 'Accession A–Z' : 'Accession Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title="GEO"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No GEO datasets found for this molecule." : undefined}
    >
      {!isEmpty && (
        <>
          <p className="text-xs text-slate-400 mb-3">Gene Expression Omnibus datasets</p>
          <FilterablePaginatedList
            items={datasets}
            getSearchText={(dataset) =>
              [
                dataset.title,
                dataset.accession,
                dataset.geoId,
                dataset.organism,
                dataset.summary,
                dataset.platformType,
                dataset.sampleType,
              ]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={sortOptions}
            defaultSortId="date-desc"
            filterPlaceholder="Filter datasets…"
            getKey={(dataset, i) => `${dataset.geoId}-${i}`}
            pageSize={5}
            className="space-y-3"
            renderItem={(dataset) => <GEOItem dataset={dataset} />}
          />
        </>
      )}
    </Panel>
  )
})
