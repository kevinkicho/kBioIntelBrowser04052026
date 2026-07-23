'use client'

/**
 * Shared first-look chrome for AI generation panels.
 * Title + status only; What / Needs / Gets / Not live in HelperTip tooltips.
 */

import type { AiSurfaceIntro } from '@/lib/ai/aiUiCopy'
import { HelperTip } from '@/components/ui/HelperTip'

export interface AiPanelIntroProps {
  intro: AiSurfaceIntro
  /** Optional badge (e.g. ready / need claims / connect AI) */
  status?: {
    label: string
    tone: 'ready' | 'warn' | 'muted'
  } | null
  className?: string
  testId?: string
  /** Compact = title row only; full = same chrome (descriptions always in tooltips) */
  density?: 'full' | 'compact'
}

function buildIntroHelp(intro: AiSurfaceIntro): string {
  return [
    intro.what,
    `You need: ${intro.needs}`,
    `You get: ${intro.gets}`,
    intro.not,
  ]
    .filter(Boolean)
    .join('\n\n')
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

  const help = buildIntroHelp(intro)
  const padded = density === 'full'

  return (
    <div
      className={`${padded ? 'mb-3 rounded-lg border border-slate-800/80 bg-slate-900/40 px-2.5 py-2' : 'mb-2'} ${className}`}
      data-testid={testId}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xs font-semibold text-slate-100">{intro.title}</h3>
        <HelperTip
          content={help}
          label={`About ${intro.title}`}
          testId={`${testId}-help`}
          maxWidth="20rem"
        />
        {status && (
          <HelperTip
            content={help}
            label={status.label}
            testId={`${testId}-status-help`}
          >
            <span
              className={`cursor-help rounded-full border px-2 py-0.5 text-[9px] font-semibold ${toneClass}`}
              data-testid={`${testId}-status`}
            >
              {status.label}
            </span>
          </HelperTip>
        )}
      </div>
      {/* Keep full copy available to a11y / tests without permanent visual clutter */}
      <span className="sr-only" data-testid={`${testId}-what`}>
        {intro.what}
      </span>
      <span className="sr-only" data-testid={`${testId}-needs`}>
        {intro.needs}
      </span>
      <span className="sr-only" data-testid={`${testId}-gets`}>
        {intro.gets}
      </span>
      <span className="sr-only" data-testid={`${testId}-not`}>
        {intro.not}
      </span>
    </div>
  )
}
