'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { GTExExpression } from '@/lib/types'
import {
  alphaSortOptions,
  numberSortOptions,
} from '@/lib/listControls'

export const GTExPanel = memo(function GTExPanel({ expressions, panelId, lastFetched }: { expressions: GTExExpression[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = expressions.length === 0
  const maxTpm = useMemo(
    () => (isEmpty ? 1 : Math.max(...expressions.map((e) => e.tpm), 1)),
    [expressions, isEmpty],
  )
  const sortOptions = useMemo(
    () => [
      ...numberSortOptions<GTExExpression>((e) => e.tpm ?? 0, {
        high: 'Highest TPM',
        low: 'Lowest TPM',
      }),
      ...numberSortOptions<GTExExpression>((e) => e.percentile ?? 0, {
        high: 'Highest percentile',
        low: 'Lowest percentile',
        idPrefix: 'pct',
      }),
      ...numberSortOptions<GTExExpression>((e) => e.nSamples ?? 0, {
        high: 'Most samples',
        low: 'Fewest samples',
        idPrefix: 'samples',
      }),
      ...alphaSortOptions<GTExExpression>((e) => e.tissueName || ''),
    ],
    [],
  )

  return (
    <Panel
      title="GTEx Tissue Expression"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No GTEx expression data found." : undefined}
    >
      {!isEmpty && (
        <>
          <div className="mb-3 text-xs text-slate-400">
            Tissue expression (TPM = Transcripts Per Million)
          </div>
          <FilterablePaginatedList
            items={expressions}
            getSearchText={(exp) =>
              [exp.tissueName, String(exp.tpm), String(exp.percentile), String(exp.nSamples)]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={sortOptions}
            defaultSortId="num-desc"
            filterPlaceholder="Filter tissues…"
            getKey={(exp, i) => `${exp.tissueName}-${i}`}
            pageSize={5}
            className="space-y-2"
            renderItem={(exp) => (
              <div className="py-2 border-b border-slate-700 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-200 flex-1">{exp.tissueName}</span>
                  <span className="text-xs font-mono bg-blue-900/30 text-blue-300 border border-blue-700/30 px-2 py-0.5 rounded shrink-0">
                    {exp.tpm.toFixed(1)} TPM
                  </span>
                </div>
                <div className="mt-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
                    style={{ width: `${(exp.tpm / maxTpm) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between mt-0.5 text-xs text-slate-500">
                  <span>n={exp.nSamples}</span>
                  <span>Percentile: {exp.percentile}</span>
                </div>
              </div>
            )}
          />
        </>
      )}
    </Panel>
  )
})
