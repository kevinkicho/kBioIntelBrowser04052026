'use client'

/**
 * Lightweight claim-density strip on the project board (no full pack fetch).
 * Shows claim types / sources already on candidates when present.
 */

import type { MoleculeCandidate, Project } from '@/lib/domain'

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
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
        Evidence strip (board)
      </p>
      <p className="text-[10px] text-slate-600 mb-2">
        Origins and source breadth already on candidates — open Pack for citable claims. Prefer
        promote set when available.
      </p>
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
    </div>
  )
}
