import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { GTExExpression } from '@/lib/types'

export const GTExPanel = memo(function GTExPanel({ expressions, panelId, lastFetched }: { expressions: GTExExpression[], panelId?: string, lastFetched?: Date }) {
  if (expressions.length === 0) {
    return (
      <Panel title="GTEx Tissue Expression" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No GTEx expression data found.</p>
      </Panel>
    )
  }

  // Sort by TPM descending
  const sorted = [...expressions].sort((a, b) => b.tpm - a.tpm)
  const topTissues = sorted.slice(0, 10)
  const maxTpm = Math.max(...expressions.map(e => e.tpm))

  return (
    <Panel title="GTEx Tissue Expression" panelId={panelId} lastFetched={lastFetched}>
      <div className="mb-3 text-xs text-slate-400">
        Top expressed tissues (TPM = Transcripts Per Million)
      </div>
      <PaginatedList className="space-y-2">
        {topTissues.map((exp, i) => (
          <div key={i} className="py-2 border-b border-slate-700 last:border-0">
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
        ))}
      </PaginatedList>
    </Panel>
  )
})
