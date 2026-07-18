'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { BgeeExpression } from '@/lib/types'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'
import { bgeeRecordUrl } from '@/lib/api/bgee'
import { DataPoint } from '@/components/ui/DataPoint'

interface BgeePanelProps {
  expressions?: BgeeExpression[]
  panelId?: string
  lastFetched?: Date
}

function levelTone(level: string | undefined): string {
  const l = (level || '').toLowerCase()
  if (!l || l === 'present') return 'bg-emerald-900/40 text-emerald-300 border-emerald-800/40'
  if (l.includes('high') || l.includes('gold')) return 'bg-amber-900/40 text-amber-200 border-amber-800/40'
  if (l.includes('low') || l.includes('silver') || l.includes('bronze'))
    return 'bg-slate-700/50 text-slate-300 border-slate-600/50'
  if (l.includes('absent')) return 'bg-rose-900/30 text-rose-300 border-rose-800/40'
  return 'bg-slate-800/60 text-slate-400 border-slate-700/50'
}

function BgeeItem({ expr }: { expr: BgeeExpression }) {
  const url = bgeeRecordUrl(expr)
  const anatId = expr.anatomicalEntityId?.replace(/^UBERON_/, 'UBERON:') || ''
  const metaBits = [
    expr.species,
    anatId,
    expr.geneSymbol ? `gene ${expr.geneSymbol}` : null,
    expr.geneId && expr.geneId !== expr.geneSymbol ? expr.geneId : null,
  ].filter(Boolean)

  return (
    <DataPoint
      sourceKey="bgee"
      label={expr.anatomicalEntityName || 'Bgee expression'}
      recordUrl={url}
      className="!gap-0 border-b border-slate-700/50 last:border-0 py-2"
    >
      <div className="min-w-0 w-full pr-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-200 leading-snug">
              {expr.anatomicalEntityName || 'Unknown tissue'}
            </p>
            {expr.developmentalStageName ? (
              <p className="text-[11px] text-slate-400 mt-0.5">
                Stage: {expr.developmentalStageName}
                {expr.developmentalStageId ? (
                  <span className="ml-1 font-mono text-[9px] text-slate-600">
                    {expr.developmentalStageId}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {typeof expr.expressionScore === 'number' && expr.expressionScore > 0 ? (
              <span
                className="text-[10px] px-1.5 py-0.5 bg-green-900/50 text-green-300 rounded tabular-nums"
                title="Bgee expression score"
              >
                score {expr.expressionScore.toFixed(2)}
              </span>
            ) : null}
            {expr.expressionLevel ? (
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded border ${levelTone(expr.expressionLevel)}`}
                title="Expression level / presence"
              >
                {expr.expressionLevel}
              </span>
            ) : null}
            {typeof expr.confidenceScore === 'number' && expr.confidenceScore > 0 ? (
              <span className="text-[9px] text-slate-500 tabular-nums" title="Confidence">
                conf {expr.confidenceScore.toFixed(2)}
              </span>
            ) : null}
          </div>
        </div>
        {metaBits.length > 0 && (
          <p className="mt-1 text-[10px] text-slate-500 font-mono truncate" title={metaBits.join(' · ')}>
            {metaBits.join(' · ')}
          </p>
        )}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-[10px] text-indigo-400/90 hover:text-indigo-300 hover:underline"
        >
          Open in Bgee ↗
        </a>
      </div>
    </DataPoint>
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
            Human expression calls from Bgee (UBERON tissues preferred). Each row shows anatomy,
            developmental stage, level/score when the SPARQL graph provides them, and a deep link.
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
            renderItem={(expr) => <BgeeItem expr={expr} />}
          />
        </>
      )}
    </Panel>
  )
})
