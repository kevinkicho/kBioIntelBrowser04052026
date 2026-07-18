'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { BgeeExpression } from '@/lib/types'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'
import { BgeeExpressionRow } from '@/components/expression/BgeeExpressionRow'

interface BgeePanelProps {
  expressions?: BgeeExpression[]
  panelId?: string
  lastFetched?: Date
}

export const BgeePanel = memo(function BgeePanel({
  expressions,
  panelId,
  lastFetched,
}: BgeePanelProps) {
  const list = Array.isArray(expressions) ? expressions : []
  const isEmpty = list.length === 0
  const tissueCount = new Set(list.map((e) => e.anatomicalEntityName || 'Unknown')).size
  const withScore = list.filter((e) => (e.expressionScore ?? 0) > 0).length
  const title = isEmpty
    ? 'Bgee'
    : `Bgee Gene Expression (${list.length} rows · ${tissueCount} tissues${withScore ? ` · ${withScore} scored` : ''})`

  const sortOptions = useMemo(
    () => [
      ...numberSortOptions<BgeeExpression>((e) => e.expressionScore ?? 0, {
        high: 'Highest score',
        low: 'Lowest score',
        idPrefix: 'score',
      }),
      ...alphaSortOptions<BgeeExpression>((e) => e.anatomicalEntityName || ''),
      {
        id: 'stage-asc',
        label: 'Stage A–Z',
        compare: (a: BgeeExpression, b: BgeeExpression) =>
          (a.developmentalStageName || '').localeCompare(b.developmentalStageName || ''),
      },
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
        <>
          <p className="mb-2 text-[10px] text-slate-500 leading-relaxed">
            Human expression from Bgee (UBERON tissues preferred). Each row shows anatomy, ontology
            id, stage when available, presence/score, and links to Bgee / OLS.
          </p>
          <FilterablePaginatedList
            items={list}
            getSearchText={(e) =>
              [
                e.anatomicalEntityName,
                e.anatomicalEntityId,
                e.developmentalStageName,
                e.expressionLevel,
                e.geneSymbol,
                e.species,
                String(e.expressionScore ?? ''),
              ]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={sortOptions}
            defaultSortId="score-desc"
            filterPlaceholder="Filter tissue, stage, UBERON id, gene…"
            getKey={(e, i) =>
              `${e.anatomicalEntityId || e.anatomicalEntityName}-${e.developmentalStageName}-${i}`
            }
            pageSize={10}
            renderItem={(expr) => (
              <BgeeExpressionRow expr={expr} fetchedAt={lastFetched} />
            )}
          />
        </>
      )}
    </Panel>
  )
})
