'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { BgeeExpression } from '@/lib/types'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'
import { BgeeExpressionRow } from '@/components/expression/BgeeExpressionRow'
import { bgeeColumnFlags } from '@/lib/api/bgeeColumns'

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
  const flags = useMemo(() => bgeeColumnFlags(list), [list])
  const tissueCount = new Set(list.map((e) => e.anatomicalEntityName || 'Unknown')).size
  const title = isEmpty
    ? 'Bgee'
    : `Bgee Gene Expression (${list.length} rows · ${tissueCount} tissues${
        flags.hasScore ? ` · ${list.filter((e) => (e.expressionScore ?? 0) > 0).length} scored` : ' · presence'
      })`

  const sortOptions = useMemo(() => {
    const opts = [...alphaSortOptions<BgeeExpression>((e) => e.anatomicalEntityName || '')]
    if (flags.hasScore) {
      opts.unshift(
        ...numberSortOptions<BgeeExpression>((e) => e.expressionScore ?? 0, {
          high: 'Highest score',
          low: 'Lowest score',
          idPrefix: 'score',
        }),
      )
    }
    if (flags.hasStage) {
      opts.push({
        id: 'stage-asc',
        label: 'Stage A–Z',
        compare: (a: BgeeExpression, b: BgeeExpression) =>
          (a.developmentalStageName || '').localeCompare(b.developmentalStageName || ''),
      })
    }
    return opts
  }, [flags.hasScore, flags.hasStage])

  return (
    <Panel
      title={title}
      panelId={panelId}
      lastFetched={lastFetched}
      help={
        flags.presenceOnly
          ? 'Bgee presence calls (isExpressedIn): anatomy where the gene is reported expressed. Stage and expression scores are omitted when Bgee does not return them for this gene. Open links to Bgee / OLS.'
          : 'Human expression from Bgee (UBERON tissues preferred). Rows show anatomy, ontology id, stage/score when the SPARQL call graph returns them, and deep links to Bgee / OLS.'
      }
      empty={isEmpty ? 'No gene expression data found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <>
          {flags.presenceOnly && (
            <p className="mb-2 text-[10px] text-slate-500" data-testid="bgee-presence-only-note">
              Presence-only sample — stage and score columns are hidden because every row lacks those fields.
            </p>
          )}
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
            defaultSortId={flags.hasScore ? 'score-desc' : 'name-asc'}
            filterPlaceholder={
              flags.hasStage ? 'Filter tissue, stage, UBERON id, gene…' : 'Filter tissue, UBERON id, gene…'
            }
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
