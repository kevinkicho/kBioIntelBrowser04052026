/** NCI EVS / caDSR-adjacent concepts — free public EVS REST. */

'use client'

import { memo, useMemo } from 'react'
import type { CadsrConcept } from '@/lib/types'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import { DataPoint } from '@/components/ui/DataPoint'
import { StyledTooltip } from '@/components/ui/StyledTooltip'
import { alphaSortOptions } from '@/lib/listControls'

interface NciCadsrPanelProps {
  data: CadsrConcept[]
  isLoading?: boolean
  panelId?: string
  lastFetched?: Date
}

function conceptUrl(c: CadsrConcept): string {
  const code = c.conceptId || ''
  if (code) {
    return `https://evsexplore.semantics.cancer.gov/evsexplore/concept/ncit/${encodeURIComponent(code)}`
  }
  return 'https://api-evsrest.nci.nih.gov/'
}

export const NciCadsrPanel = memo(function NciCadsrPanel({
  data,
  isLoading,
  panelId = 'nci-cadsr',
  lastFetched,
}: NciCadsrPanelProps) {
  const list = Array.isArray(data) ? data : []
  const isEmpty = !isLoading && list.length === 0

  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<CadsrConcept>((c) => c.preferredName || ''),
      ...alphaSortOptions<CadsrConcept>((c) => c.conceptId || '').map((o) => ({
        ...o,
        id: `id-${o.id}`,
        label: o.id.includes('asc') ? 'Concept ID A–Z' : 'Concept ID Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title={
        isEmpty
          ? 'NCI caDSR / EVS (NCIt)'
          : `NCI caDSR / EVS (NCIt) (${list.length})`
      }
      panelId={panelId}
      lastFetched={lastFetched}
      empty={
        isLoading
          ? 'Loading NCI EVS concepts…'
          : isEmpty
            ? 'No NCI Thesaurus concepts found for this query.'
            : undefined
      }
    >
      {!isEmpty && !isLoading && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(c) =>
            [c.preferredName, c.conceptId, c.workflowStatus, c.context, c.evsSource, c.definition]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="name-asc"
          filterPlaceholder="Filter concepts (name, ID, definition…)"
          getKey={(c, i) => `${c.conceptId}-${i}`}
          renderItem={(c) => {
            const href = conceptUrl(c)
            return (
              <DataPoint
                sourceKey="nci-cadsr"
                label={c.preferredName}
                recordUrl={href}
                fetchedAt={lastFetched}
              >
                <div className="py-2 border-b border-slate-700/60 last:border-0 pr-1">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StyledTooltip content={`Open ${c.preferredName} in NCI EVS`}>
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-slate-100 hover:text-cyan-300"
                        >
                          {c.preferredName}
                        </a>
                      </StyledTooltip>
                      {c.conceptId && (
                        <span className="text-[10px] font-mono bg-cyan-900/30 text-cyan-300 border border-cyan-800/40 px-1.5 py-0.5 rounded">
                          {c.conceptId}
                        </span>
                      )}
                      {c.workflowStatus && (
                        <span className="text-[10px] text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded">
                          {c.workflowStatus}
                        </span>
                      )}
                    </div>
                    {(c.context || c.evsSource) && (
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {[c.context, c.evsSource].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {c.definition && (
                      <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2 leading-snug">
                        {c.definition}
                      </p>
                    )}
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
