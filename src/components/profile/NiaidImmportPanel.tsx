/** NIAID ImmPort immunology studies. */

'use client'

import { memo, useMemo } from 'react'
import type { ImmPortStudy } from '@/lib/types'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import { DataPoint } from '@/components/ui/DataPoint'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'

interface NiaidImmportPanelProps {
  data: ImmPortStudy[]
  isLoading?: boolean
  panelId?: string
  lastFetched?: Date
}

function studyUrl(studyId: string): string {
  // ImmPort shared study landing (public)
  return `https://www.immport.org/shared/study/${encodeURIComponent(studyId)}`
}

export const NiaidImmportPanel = memo(function NiaidImmportPanel({
  data,
  isLoading,
  panelId = 'niaid-immport',
  lastFetched,
}: NiaidImmportPanelProps) {
  const list = Array.isArray(data) ? data : []
  const isEmpty = !isLoading && list.length === 0

  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<ImmPortStudy>((s) => s.title || ''),
      ...numberSortOptions<ImmPortStudy>((s) => s.participantCount ?? 0, {
        high: 'Most participants',
        low: 'Fewest participants',
      }),
      ...alphaSortOptions<ImmPortStudy>((s) => s.conditionStudied || '').map((o) => ({
        ...o,
        id: `condition-${o.id}`,
        label: o.id.includes('asc') ? 'Condition A–Z' : 'Condition Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title={isEmpty ? 'NIAID ImmPort Studies' : `NIAID ImmPort Studies (${list.length})`}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={
        isLoading
          ? 'Loading ImmPort studies…'
          : isEmpty
            ? 'No immunology studies found for this molecule.'
            : undefined
      }
    >
      {!isEmpty && !isLoading && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(s) =>
            [
              s.title,
              s.studyId,
              s.studyType,
              s.description,
              s.conditionStudied,
              s.intervention,
              ...(s.arms || []),
            ]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="name-asc"
          filterPlaceholder="Filter studies (title, condition, ID…)"
          getKey={(s, i) => `${s.studyId}-${i}`}
          renderItem={(s) => {
            const href = studyUrl(s.studyId)
            return (
              <DataPoint
                sourceKey="niaid-immport"
                label={s.title}
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
                          className="text-sm font-medium text-slate-100 hover:text-emerald-300"
                        >
                          {s.title}
                        </a>
                        <span className="text-[10px] font-mono bg-emerald-900/30 text-emerald-300 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                          {s.studyId}
                        </span>
                        {s.studyType && (
                          <span className="text-[10px] text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded">
                            {s.studyType}
                          </span>
                        )}
                      </div>
                      {s.description && (
                        <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2 leading-snug">
                          {s.description}
                        </p>
                      )}
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {[
                          s.conditionStudied && `Condition: ${s.conditionStudied}`,
                          s.intervention && `Focus: ${s.intervention}`,
                          s.participantCount != null && `${s.participantCount} participants`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      {s.arms?.length > 0 && (
                        <p className="mt-0.5 text-[10px] text-slate-600">
                          Arms: {s.arms.slice(0, 6).join(', ')}
                          {s.arms.length > 6 ? '…' : ''}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1 text-[10px]">
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:text-emerald-300"
                      >
                        ImmPort
                      </a>
                      <a
                        href={`https://www.immport.org/shared/search?term=${encodeURIComponent(s.studyId)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-slate-300"
                      >
                        Search
                      </a>
                    </div>
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
