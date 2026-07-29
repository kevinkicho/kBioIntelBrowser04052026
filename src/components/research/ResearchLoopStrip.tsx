'use client'

/**
 * Of-record research loop progress: shortlist → board → pack → RH.
 * Does not involve LLM ranking. Labels AI steps as non-of-record when noted.
 */

import Link from 'next/link'
import { HelperTip } from '@/components/ui/HelperTip'

export type LoopStepId = 'shortlist' | 'board' | 'promote' | 'pack' | 'rh'

export interface LoopStepState {
  id: LoopStepId
  label: string
  done: boolean
  detail?: string
  href?: string
}

export function ResearchLoopStrip({
  steps,
  className = '',
  title = 'Research loop',
}: {
  steps: LoopStepState[]
  className?: string
  title?: string
}) {
  if (steps.length === 0) return null
  const done = steps.filter((s) => s.done).length

  return (
    <div
      className={`rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2.5 ${className}`}
      data-testid="research-loop-strip"
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <HelperTip
          content="Of-record path only: Discover rank → project board → promote → pack → research hypothesis. Optional AI on packs/RH is claim-bound and non-of-record."
          label="About research loop"
          testId="research-loop-strip-help"
        />
        <span className="ml-auto text-[10px] tabular-nums text-slate-500">
          {done}/{steps.length}
        </span>
      </div>
      <ol className="flex flex-wrap gap-1.5">
        {steps.map((s, i) => {
          const chip = (
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${
                s.done
                  ? 'border-emerald-800/50 bg-emerald-950/30 text-emerald-200'
                  : 'border-slate-700 bg-slate-950/40 text-slate-500'
              }`}
              data-testid={`loop-step-${s.id}`}
              data-done={s.done ? 'true' : 'false'}
              title={s.detail}
            >
              <span className="font-mono text-[9px] opacity-70">{i + 1}</span>
              {s.label}
            </span>
          )
          return (
            <li key={s.id} className="flex items-center gap-1">
              {s.href && !s.done ? (
                <Link href={s.href} className="hover:opacity-90">
                  {chip}
                </Link>
              ) : (
                chip
              )}
              {i < steps.length - 1 && (
                <span className="text-[10px] text-slate-700" aria-hidden>
                  →
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** Build strip state for a Discover success surface. */
export function discoverLoopSteps(opts: {
  hasCandidates: boolean
  savedCount?: number
}): LoopStepState[] {
  return [
    {
      id: 'shortlist',
      label: 'Shortlist',
      done: opts.hasCandidates,
      detail: opts.hasCandidates ? 'Deterministic free-API rank' : 'Run Rank on a disease',
      href: '/discover',
    },
    {
      id: 'board',
      label: 'Board',
      done: (opts.savedCount ?? 0) > 0,
      detail: 'Save to project from a card',
      href: '/projects',
    },
    {
      id: 'promote',
      label: 'Promote',
      done: false,
      detail: 'On the board: set Promote + harvest',
      href: '/projects',
    },
    {
      id: 'pack',
      label: 'Pack',
      done: false,
      detail: 'Build claim-bound pack (≤5 extractors)',
      href: '/projects',
    },
    {
      id: 'rh',
      label: 'RH',
      done: false,
      detail: 'Seed research hypothesis (AI optional, non-of-record)',
      href: '/projects',
    },
  ]
}

/** Build strip state for a project board. */
export function projectLoopSteps(opts: {
  candidateCount: number
  promoteCount: number
  packCount: number
  rhCount: number
  projectId: string
}): LoopStepState[] {
  const base = `/projects/${opts.projectId}`
  return [
    {
      id: 'shortlist',
      label: 'Shortlist',
      done: true,
      detail: 'Arrived via Discover / save',
      href: '/discover',
    },
    {
      id: 'board',
      label: 'Board',
      done: opts.candidateCount > 0,
      detail: `${opts.candidateCount} candidates`,
      href: base,
    },
    {
      id: 'promote',
      label: 'Promote',
      done: opts.promoteCount > 0,
      detail: opts.promoteCount > 0 ? `${opts.promoteCount} promoted` : 'Set status Promote',
      href: base,
    },
    {
      id: 'pack',
      label: 'Pack',
      done: opts.packCount > 0,
      detail: opts.packCount > 0 ? `${opts.packCount} pack(s)` : 'Build pack below',
      href: base,
    },
    {
      id: 'rh',
      label: 'RH',
      done: opts.rhCount > 0,
      detail:
        opts.rhCount > 0
          ? `${opts.rhCount} hypothesis(es)`
          : 'Seed RH (pack AI is non-of-record)',
      href: base,
    },
  ]
}
