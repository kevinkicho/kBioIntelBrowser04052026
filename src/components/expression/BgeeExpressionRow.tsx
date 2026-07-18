'use client'

import type { BgeeExpression } from '@/lib/types'
import { bgeeRecordUrl } from '@/lib/api/bgee'
import { DataPoint } from '@/components/ui/DataPoint'

function formatAnatId(id: string | undefined): string {
  if (!id) return ''
  return id
    .replace(/^UBERON_/, 'UBERON:')
    .replace(/^CL_/, 'CL:')
    .replace(/^HsapDv_/, 'HsapDv:')
}

function levelLabel(level: string | undefined): { text: string; title: string; className: string } {
  const l = (level || '').trim()
  if (!l || l.toLowerCase() === 'present') {
    return {
      text: 'expressed',
      title: 'Bgee presence call (gene is reported expressed in this anatomy)',
      className: 'bg-emerald-900/40 text-emerald-300 border-emerald-800/40',
    }
  }
  const low = l.toLowerCase()
  if (low.includes('absent')) {
    return {
      text: l,
      title: 'Not expressed in this condition',
      className: 'bg-rose-900/30 text-rose-300 border-rose-800/40',
    }
  }
  if (low.includes('high') || low.includes('gold')) {
    return {
      text: l,
      title: 'Expression level / quality',
      className: 'bg-amber-900/40 text-amber-200 border-amber-800/40',
    }
  }
  return {
    text: l,
    title: 'Expression level / quality',
    className: 'bg-slate-800/60 text-slate-300 border-slate-700/50',
  }
}

export interface BgeeExpressionRowProps {
  expr: BgeeExpression
  fetchedAt?: Date | string | null
  /** Compact for dense gene-page lists */
  compact?: boolean
}

/**
 * Dense Bgee list row: tissue, UBERON/stage, species/gene, level/score, deep link.
 * Matches the gene Expression panel + molecule Bgee panel.
 */
export function BgeeExpressionRow({ expr, fetchedAt, compact = false }: BgeeExpressionRowProps) {
  const url = bgeeRecordUrl(expr)
  const anatId = formatAnatId(expr.anatomicalEntityId)
  const stageId = formatAnatId(expr.developmentalStageId)
  const level = levelLabel(expr.expressionLevel)
  const olsUrl = anatId
    ? `https://www.ebi.ac.uk/ols4/ontologies/uberon/terms?iri=${encodeURIComponent(
        `http://purl.obolibrary.org/obo/${anatId.replace(':', '_')}`,
      )}`
    : null

  const metaLine = [
    expr.species || null,
    anatId || null,
    expr.geneSymbol ? `gene ${expr.geneSymbol}` : null,
    expr.geneId && expr.geneId !== expr.geneSymbol ? expr.geneId : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <DataPoint
      sourceKey="bgee"
      fetchedAt={fetchedAt}
      label={expr.anatomicalEntityName || 'Bgee expression'}
      recordUrl={url}
      className={compact ? '' : '!gap-0 border-b border-slate-700/50 last:border-0 py-2'}
    >
      <div className={`min-w-0 w-full ${compact ? 'py-1.5 px-2' : 'pr-1'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-200 leading-snug">
              {expr.anatomicalEntityName || 'Unknown tissue'}
            </p>
            {expr.developmentalStageName ? (
              <p className="text-[11px] text-slate-400 mt-0.5">
                Stage: {expr.developmentalStageName}
                {stageId ? (
                  <span className="ml-1 font-mono text-[9px] text-slate-600">{stageId}</span>
                ) : null}
              </p>
            ) : (
              <p className="text-[10px] text-slate-600 mt-0.5">
                Developmental stage not returned for this presence call
              </p>
            )}
            {metaLine ? (
              <p
                className="mt-0.5 text-[10px] font-mono text-slate-500 truncate"
                title={metaLine}
              >
                {metaLine}
              </p>
            ) : null}
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-indigo-400/90 hover:text-indigo-300 hover:underline"
              >
                Bgee gene ↗
              </a>
              {olsUrl && anatId.startsWith('UBERON') && (
                <a
                  href={olsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-slate-500 hover:text-slate-300 hover:underline"
                >
                  {anatId} ↗
                </a>
              )}
            </div>
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
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded border ${level.className}`}
              title={level.title}
            >
              {level.text}
            </span>
            {typeof expr.confidenceScore === 'number' && expr.confidenceScore > 0 ? (
              <span className="text-[9px] text-slate-500 tabular-nums" title="Confidence">
                conf {expr.confidenceScore.toFixed(2)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </DataPoint>
  )
}
