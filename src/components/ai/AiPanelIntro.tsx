'use client'

/**
 * Shared first-look chrome for AI generation panels.
 * Answers: What is this? What do I need? What do I get? What is it not?
 */

import type { AiSurfaceIntro } from '@/lib/ai/aiUiCopy'

export interface AiPanelIntroProps {
  intro: AiSurfaceIntro
  /** Optional badge (e.g. ready / need claims / connect AI) */
  status?: {
    label: string
    tone: 'ready' | 'warn' | 'muted'
  } | null
  className?: string
  testId?: string
  /** Compact = single paragraph; full = What / Needs / Gets rows */
  density?: 'full' | 'compact'
}

export function AiPanelIntro({
  intro,
  status = null,
  className = '',
  testId = 'ai-panel-intro',
  density = 'full',
}: AiPanelIntroProps) {
  const toneClass =
    status?.tone === 'ready'
      ? 'border-emerald-800/50 bg-emerald-950/30 text-emerald-200'
      : status?.tone === 'warn'
        ? 'border-amber-800/50 bg-amber-950/30 text-amber-200'
        : 'border-slate-700 bg-slate-900/50 text-slate-400'

  if (density === 'compact') {
    return (
      <div className={`mb-2 ${className}`} data-testid={testId}>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-semibold text-slate-100">{intro.title}</h3>
          {status && (
            <span
              className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${toneClass}`}
              data-testid={`${testId}-status`}
            >
              {status.label}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{intro.what}</p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-slate-600">{intro.not}</p>
      </div>
    )
  }

  return (
    <div
      className={`mb-3 rounded-lg border border-slate-800/80 bg-slate-900/40 px-2.5 py-2 ${className}`}
      data-testid={testId}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-xs font-semibold text-slate-100">{intro.title}</h3>
        {status && (
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${toneClass}`}
            data-testid={`${testId}-status`}
          >
            {status.label}
          </span>
        )}
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-300">{intro.what}</p>
      <dl className="mt-2 grid gap-1.5 text-[10px] leading-snug sm:grid-cols-2">
        <div className="rounded border border-slate-800/60 bg-slate-950/40 px-2 py-1.5">
          <dt className="font-semibold uppercase tracking-wide text-slate-500">You need</dt>
          <dd className="mt-0.5 text-slate-400">{intro.needs}</dd>
        </div>
        <div className="rounded border border-slate-800/60 bg-slate-950/40 px-2 py-1.5">
          <dt className="font-semibold uppercase tracking-wide text-slate-500">You get</dt>
          <dd className="mt-0.5 text-slate-400">{intro.gets}</dd>
        </div>
      </dl>
      <p className="mt-1.5 text-[9px] leading-relaxed text-slate-600">{intro.not}</p>
    </div>
  )
}
