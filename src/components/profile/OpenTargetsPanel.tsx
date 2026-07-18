'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { DiseaseAssociation } from '@/lib/types'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'
import { emptyDataClass, isEmptyMetric } from '@/lib/summaryEmpty'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

function diseaseHref(disease: DiseaseAssociation): string {
  if (disease.diseaseId) {
    return `https://platform.opentargets.org/disease/${encodeURIComponent(disease.diseaseId)}`
  }
  return `https://platform.opentargets.org/search?q=${encodeURIComponent(disease.diseaseName)}&page=1`
}

export const OpenTargetsPanel = memo(function OpenTargetsPanel({
  diseases,
  panelId,
  lastFetched,
}: {
  diseases: DiseaseAssociation[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(diseases) ? diseases : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...numberSortOptions<DiseaseAssociation>((d) => d.score ?? 0, {
        high: 'Highest score',
        low: 'Lowest score',
      }),
      ...numberSortOptions<DiseaseAssociation>((d) => d.evidenceCount || 0, {
        high: 'Most evidence',
        low: 'Least evidence',
        idPrefix: 'evidence',
      }),
      ...alphaSortOptions<DiseaseAssociation>((d) => d.diseaseName || ''),
    ],
    [],
  )

  return (
    <Panel
      title="Disease Associations (Open Targets)"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No disease associations found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(disease) =>
            [
              disease.diseaseName,
              disease.diseaseId,
              disease.description,
              ...(disease.therapeuticAreas || []),
            ]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="num-desc"
          filterPlaceholder="Filter diseases (name, ID, area…)"
          getKey={(disease, i) => `${disease.diseaseId || disease.diseaseName}-${i}`}
          pageSize={8}
          className="space-y-0"
          renderItem={(disease, index) => {
            const otUrl = diseaseHref(disease)
            const scoreEmpty = isEmptyMetric(disease.score)
            const evEmpty = isEmptyMetric(disease.evidenceCount)
            return (
              <div>
                {index === 0 && (
                  <div
                    className="grid grid-cols-[minmax(0,1.4fr)_minmax(5rem,0.8fr)_3.5rem_3.5rem_2.5rem] gap-x-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80"
                    role="row"
                  >
                    <span>Disease</span>
                    <span>ID</span>
                    <span className="text-right">Score</span>
                    <span className="text-right">Evid.</span>
                    <span className="text-right">Open</span>
                  </div>
                )}
                <a
                  href={otUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open on Open Targets Platform"
                  onClick={() =>
                    onDeepLinkClick('opentargets', otUrl, {
                      panelId: 'opentargets',
                      label: disease.diseaseName,
                    })
                  }
                  className="grid grid-cols-[minmax(0,1.4fr)_minmax(5rem,0.8fr)_3.5rem_3.5rem_2.5rem] gap-x-2 items-center px-2 py-2 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group"
                >
                  <span className="text-sm font-medium text-indigo-300 group-hover:text-indigo-200 truncate">
                    {disease.diseaseName || '—'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-600 truncate">
                    {disease.diseaseId || '—'}
                  </span>
                  <span
                    className={`text-xs tabular-nums text-right text-emerald-300/90 ${emptyDataClass(scoreEmpty)}`}
                  >
                    {scoreEmpty ? '—' : disease.score.toFixed(2)}
                  </span>
                  <span
                    className={`text-xs tabular-nums text-right text-slate-400 ${emptyDataClass(evEmpty)}`}
                  >
                    {evEmpty ? '—' : disease.evidenceCount}
                  </span>
                  <span className="text-xs text-cyan-400 group-hover:text-cyan-300 text-right">
                    ↗
                  </span>
                </a>
              </div>
            )
          }}
        />
      )}
    </Panel>
  )
})
