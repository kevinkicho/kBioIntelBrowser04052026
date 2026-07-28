'use client'

/**
 * Of-record claim graph from hub ledger — list + domain counts + export.
 */

import { useMemo, useState } from 'react'
import type { DataHubLedger } from '@/lib/dataHub'
import {
  buildHubClaimGraph,
  hubClaimGraphToMarkdown,
} from '@/lib/dataHub/hubClaimGraph'
import { downloadFile } from '@/lib/exportData'
import { HelperTip } from '@/components/ui/HelperTip'
import { ApiProvenanceChip } from '@/components/ui/ApiProvenanceChip'

export function HubClaimGraphPanel({
  ledger,
  className = '',
  testId = 'hub-claim-graph',
}: {
  ledger: DataHubLedger
  className?: string
  testId?: string
}) {
  const [open, setOpen] = useState(false)
  const graph = useMemo(() => buildHubClaimGraph(ledger), [ledger])

  if (graph.claims.length === 0) return null

  return (
    <div
      className={`rounded-lg border border-slate-800/80 bg-slate-950/40 p-2.5 ${className}`}
      data-testid={testId}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Claim graph
          </p>
          <HelperTip
            content="Of-record claims derived 1:1 from data hub facts (no LLM). Edges only mean same free-API source or domain — not mechanism causality."
            label="About claim graph"
          />
          <span className="text-[10px] text-slate-500">
            {graph.claims.length} claims · {graph.edges.length} edges
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300"
            data-testid={`${testId}-toggle`}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Hide' : 'Show'}
          </button>
          <button
            type="button"
            className="rounded border border-indigo-800/40 bg-indigo-950/30 px-2 py-0.5 text-[10px] text-indigo-300"
            data-testid={`${testId}-export`}
            onClick={() => {
              const md = hubClaimGraphToMarkdown(graph)
              const slug = ledger.subjectLabel
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .slice(0, 40)
              downloadFile(
                md,
                `biointel-claim-graph-${slug}-${ledger.subjectId}.md`,
                'text/markdown;charset=utf-8',
              )
            }}
          >
            Export MD
          </button>
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-1">
        {Object.entries(graph.byDomain)
          .slice(0, 8)
          .map(([d, n]) => (
            <span
              key={d}
              className="rounded-full border border-slate-700/60 px-1.5 py-0.5 text-[9px] text-slate-400"
            >
              {d} · {n}
            </span>
          ))}
      </div>

      {open && (
        <ul
          className="mt-2 max-h-48 space-y-1 overflow-y-auto text-[10px] text-slate-400"
          data-testid={`${testId}-list`}
        >
          {graph.claims.slice(0, 40).map((c) => (
            <li key={c.id} className="flex flex-wrap items-start gap-1 border-t border-slate-800/50 pt-1">
              <span className="shrink-0 rounded bg-slate-800/80 px-1 text-[8px] uppercase text-slate-500">
                {c.claimType}
              </span>
              <span className="min-w-0 flex-1 text-slate-300">{c.statement}</span>
              <ApiProvenanceChip
                sourceKey={c.provenance.source}
                sourceUrl={c.provenance.sourceUrl}
                fetchedAt={c.provenance.retrievedAt}
                testId={`${testId}-api-${c.id}`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
