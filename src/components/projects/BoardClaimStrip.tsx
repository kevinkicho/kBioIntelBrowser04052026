'use client'

/**
 * Lightweight claim-density strip on the project board (no full pack fetch).
 * Shows claim types / sources already on candidates when present.
 */

import type { MoleculeCandidate, Project } from '@/lib/domain'
import { HelperTip } from '@/components/ui/HelperTip'

function claimHints(c: MoleculeCandidate): string[] {
  const hints: string[] = []
  if (c.origins?.length) {
    hints.push(...c.origins.slice(0, 3).map((o) => String(o)))
  }
  if (c.evidenceBreadthSources?.length) {
    hints.push(...c.evidenceBreadthSources.slice(0, 4))
  }
  if (c.links?.length) {
    hints.push(...c.links.slice(0, 3).map((l) => l.type))
  }
  return Array.from(new Set(hints)).slice(0, 6)
}

export function BoardClaimStrip({ project }: { project: Project }) {
  const promote = project.candidates.filter((c) => c.boardStatus === 'promote')
  const sample = (promote.length > 0 ? promote : project.candidates).slice(0, 8)
  if (sample.length === 0) return null

  return (
    <div
      className="mb-4 rounded-xl border border-slate-800 bg-slate-900/40 p-3"
      data-testid="board-claim-strip"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Evidence strip (board)
          </p>
          <HelperTip
            content="Origins and source breadth already on candidates — open Pack below for citable claims. Prefer the promote set when available. Of-record scores stay free-API deterministic."
            label="About board evidence strip"
            testId="board-claim-strip-help"
          />
        </div>
        {promote.length > 0 && (
          <span
            className="rounded-full border border-emerald-800/40 bg-emerald-950/30 px-2 py-0.5 text-[10px] text-emerald-300"
            data-testid="board-claim-strip-promote-count"
          >
            {promote.length} promote → pack
          </span>
        )}
      </div>
      <div className="space-y-2">
        {sample.map((c) => {
          const hints = claimHints(c)
          return (
            <div
              key={c.candidateId}
              className="flex flex-wrap items-center gap-1.5 text-[10px]"
            >
              <span className="font-medium text-slate-300 min-w-[6rem] truncate">
                {c.identity.name}
              </span>
              <span className="text-slate-600">{c.boardStatus ?? 'untriaged'}</span>
              {hints.length === 0 ? (
                <span className="text-slate-600 italic">no source tags yet</span>
              ) : (
                hints.map((h) => (
                  <span
                    key={h}
                    className="rounded border border-slate-700 bg-slate-950/60 px-1.5 py-0.5 text-slate-400 font-mono"
                  >
                    {h}
                  </span>
                ))
              )}
            </div>
          )
        })}
      </div>
      {promote.length > 0 && (
        <p className="mt-2 text-[10px] text-slate-500">
          Next:{' '}
          <span className="text-emerald-400/90">build evidence pack</span> for claim-rich export /
          RH seed (below).
        </p>
      )}
    </div>
  )
}
