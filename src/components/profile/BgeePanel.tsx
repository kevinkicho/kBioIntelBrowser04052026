'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { BgeeExpression } from '@/lib/types'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'

interface BgeePanelProps {
  expressions?: BgeeExpression[]
  panelId?: string
  lastFetched?: Date
}

function BgeeItem({ expr }: { expr: BgeeExpression }) {
  return (
    <div className="py-1.5 border-b border-slate-700/50 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-200">
            {expr.anatomicalEntityName || 'Unknown tissue'}
          </p>
          {expr.developmentalStageName && (
            <p className="text-[11px] text-slate-500 mt-0.5">{expr.developmentalStageName}</p>
          )}
        </div>
        {expr.expressionScore > 0 && (
          <span className="text-[10px] shrink-0 px-1.5 py-0.5 bg-green-900/50 text-green-300 rounded">
            {expr.expressionScore.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  )
}

export const BgeePanel = memo(function BgeePanel({
  expressions,
  panelId,
  lastFetched,
}: BgeePanelProps) {
  const list = Array.isArray(expressions) ? expressions : []
  const isEmpty = list.length === 0
  const tissueCount = new Set(list.map((e) => e.anatomicalEntityName || 'Unknown')).size
  const title = isEmpty
    ? 'Bgee'
    : `Bgee Gene Expression (${list.length} across ${tissueCount} tissues)`

  const sortOptions = useMemo(
    () => [
      ...numberSortOptions<BgeeExpression>((e) => e.expressionScore ?? 0, {
        high: 'Highest score',
        low: 'Lowest score',
        idPrefix: 'score',
      }),
      ...alphaSortOptions<BgeeExpression>((e) => e.anatomicalEntityName || ''),
    ],
    [],
  )

  return (
    <Panel
      title={title}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No gene expression data found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(e) =>
            [e.anatomicalEntityName, e.developmentalStageName, String(e.expressionScore ?? '')]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="score-desc"
          filterPlaceholder="Filter tissues / stages…"
          getKey={(e, i) => `${e.anatomicalEntityName}-${e.developmentalStageName}-${i}`}
          pageSize={10}
          renderItem={(expr) => <BgeeItem expr={expr} />}
        />
      )}
    </Panel>
  )
})
