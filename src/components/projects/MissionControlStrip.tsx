'use client'

/**
 * Project mission control — resume unfinished discovery loop.
 * Solo local: uses project state + lastOpened; no multi-tenant DB.
 */

import Link from 'next/link'
import type { Project } from '@/lib/domain'
import { HelperTip } from '@/components/ui/HelperTip'

function promoteCount(p: Project): number {
  return p.candidates.filter((c) => c.boardStatus === 'promote').length
}

function watchingCount(p: Project): number {
  return p.candidates.filter((c) => c.boardStatus === 'watching').length
}

export function MissionControlStrip({
  projects,
  lastOpened,
}: {
  projects: Project[]
  lastOpened: Record<string, string>
}) {
  if (projects.length === 0) return null

  const ranked = [...projects].sort((a, b) => {
    const ao = lastOpened[a.id] ?? ''
    const bo = lastOpened[b.id] ?? ''
    if (ao || bo) return (bo || '').localeCompare(ao || '')
    return b.updatedAt.localeCompare(a.updatedAt)
  })
  const focus = ranked[0]
  if (!focus) return null

  const promote = promoteCount(focus)
  const watching = watchingCount(focus)
  const disease =
    (focus.preferencesSnapshot as { diseaseName?: string } | undefined)?.diseaseName ||
    focus.name
  const unfinishedPack = promote > 0
  const needsBoard = focus.candidates.length === 0

  return (
    <div
      className="mb-6 rounded-xl border border-emerald-900/40 bg-gradient-to-br from-emerald-950/40 to-slate-900/60 p-4"
      data-testid="mission-control-strip"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/90">
              Mission control
            </p>
            <HelperTip
              content={[
                needsBoard
                  ? 'Board empty — rank candidates in Discover.'
                  : unfinishedPack
                    ? 'Promote set ready — open board pack for claim-rich export / RH seed.'
                    : promote === 0
                      ? 'Triage board: set promote / hold / kill on candidates.'
                      : 'Continue triage or open the project board.',
                'Of-record scores stay deterministic; optional AI analysis is non-of-record.',
              ].join('\n\n')}
              label="Mission control next steps"
              testId="mission-control-help"
            />
          </div>
          <h2 className="text-lg font-semibold text-slate-100 truncate mt-0.5">
            {focus.name}
          </h2>
          <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
            {focus.candidates.length} candidates · {promote} promote · {watching} watching
            {disease ? ` · ${disease}` : ''}
          </p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Link
            href={`/projects/${focus.id}`}
            className="rounded-lg bg-emerald-700/90 px-3 py-2 text-center text-xs font-medium text-white hover:bg-emerald-600"
            data-testid="mission-control-open"
          >
            Continue project
          </Link>
          <Link
            href="/discover"
            className="rounded-lg border border-slate-700 px-3 py-2 text-center text-xs text-slate-300 hover:border-indigo-700 hover:text-indigo-300"
          >
            New Discover run
          </Link>
        </div>
      </div>
    </div>
  )
}
