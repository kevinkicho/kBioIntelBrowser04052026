'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  DISCOVER_EXPECTATIONS,
  DISCOVER_PIPELINE_STAGES,
  SCORE_AXIS_GUIDE,
  effortLabel,
} from '@/lib/discovery/algorithmGuide'
import { PrefTooltip } from '@/components/discovery/PrefTooltip'
import { emitProductEvent } from '@/lib/productEvents'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

interface DiscoverAlgorithmGuideProps {
  /** Compact strip under hero (default) vs full card */
  variant?: 'hero' | 'panel'
  className?: string
}

/**
 * Educational “how Discover works” UI — deterministic multi-axis algorithms + tooltips.
 * Does not call LLMs; ranking stays free-API + rubric based.
 */
export function DiscoverAlgorithmGuide({
  variant = 'hero',
  className = '',
}: DiscoverAlgorithmGuideProps) {
  const [open, setOpen] = useState(false)

  function toggle() {
    const next = !open
    setOpen(next)
    if (next) {
      emitProductEvent('preference_tooltip_opened', { key: 'discover_algorithm_guide' })
    }
  }

  if (variant === 'hero') {
    return (
      <div
        className={`mt-5 rounded-xl border border-slate-800/80 bg-slate-900/40 ${className}`}
        data-testid="discover-algorithm-guide"
      >
        <button
          type="button"
          onClick={toggle}
          className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-800/30 transition-colors rounded-xl"
          aria-expanded={open}
        >
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 text-sm">
            ✦
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-100">
                {DISCOVER_EXPECTATIONS.headline}
              </span>
              <span className="rounded-full border border-emerald-800/50 bg-emerald-950/40 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-300/90">
                Deterministic · free APIs
              </span>
              <PrefTooltip
                eventKey="discover_rank_law"
                text={DISCOVER_EXPECTATIONS.lawNote}
              />
            </span>
            <span className="mt-0.5 block text-[12px] text-slate-400 leading-relaxed">
              {DISCOVER_EXPECTATIONS.subhead}{' '}
              <span className="text-indigo-300/80">
                {open ? 'Hide pipeline details' : 'What to expect →'}
              </span>
            </span>
          </span>
          <span
            className={`mt-1 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden
          >
            ▾
          </span>
        </button>

        {open && (
          <div className="border-t border-slate-800/80 px-4 pb-4 pt-3 space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {DISCOVER_EXPECTATIONS.bullets.map((b) => (
                <div
                  key={b.title}
                  className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"
                >
                  <p className="text-[11px] font-semibold text-slate-200">{b.title}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{b.text}</p>
                </div>
              ))}
            </div>

            <PipelineSteps />
            <AxisStrip />

            <p className="text-[10px] leading-relaxed text-slate-600">
              {DISCOVER_EXPECTATIONS.lawNote}
            </p>
            <Link
              href="/how-it-works"
              className="inline-flex text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline"
            >
              Full algorithms & AI prompt catalog →
            </Link>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900/50 p-4 ${className}`}
      data-testid="discover-algorithm-guide-panel"
    >
      <h3 className="text-sm font-semibold text-slate-100 mb-1">How ranking works</h3>
      <p className="text-[11px] text-slate-500 mb-3">{DISCOVER_EXPECTATIONS.subhead}</p>
      <PipelineSteps />
      <div className="mt-3">
        <AxisStrip />
      </div>
    </div>
  )
}

function PipelineSteps() {
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Pipeline (in order)
      </p>
      <ol className="space-y-1.5">
        {DISCOVER_PIPELINE_STAGES.map((stage, i) => (
          <li
            key={stage.id}
            id={`discover-pipeline-${stage.id}`}
            className="group relative flex gap-2 rounded-lg border border-slate-800/80 bg-slate-950/40 px-2.5 py-2 scroll-mt-24"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-mono text-indigo-300">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Link
                  href={`/how-it-works#discover_rank`}
                  className="text-[12px] font-medium text-slate-200 hover:text-indigo-300"
                >
                  {stage.title}
                </Link>
                <span className="text-[9px] text-slate-600">{effortLabel(stage.effort)}</span>
                <PrefTooltip eventKey={`pipeline_${stage.id}`} text={stage.detail} />
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500 leading-snug">{stage.short}</p>
              <StyledTooltip content={stage.sources.join(' · ')}>
                <p className="mt-1 text-[9px] text-slate-600 truncate">
                  Sources: {stage.sources.join(' · ')}
                </p>
              </StyledTooltip>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function AxisStrip() {
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Score axes
      </p>
      <div className="flex flex-wrap gap-1.5">
        {SCORE_AXIS_GUIDE.map((ax) => (
          <span
            key={ax.key}
            className="group relative inline-flex items-center gap-1 rounded-full border border-slate-700/70 bg-slate-900/80 px-2.5 py-1 text-[10px] text-slate-300 cursor-help"
            tabIndex={0}
          >
            {ax.label}
            <PrefTooltip
              eventKey={`axis_${ax.key}`}
              text={`${ax.summary} Expect: ${ax.expect}`}
            />
          </span>
        ))}
      </div>
    </div>
  )
}
