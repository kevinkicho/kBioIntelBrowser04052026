'use client'

/**
 * Entity-centric multi-source evidence strip.
 * Chips keep free-API provenance; click opens siloed panel or external deep link.
 */

import { useMemo } from 'react'
import type { CrossSourceBundle, CrossSourceFact, CrossSourceTone } from '@/lib/crossSource'
import { isFactEmpty } from '@/lib/crossSource'
import { emptyDataClass } from '@/lib/summaryEmpty'
import { isBrokenSourceShellUrl } from '@/lib/deepLinkPolicy'
import { onDeepLinkClick } from '@/lib/trackDeepLink'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

const TONE: Record<CrossSourceTone, string> = {
  emerald: 'border-emerald-800/40 bg-emerald-950/30 text-emerald-200',
  violet: 'border-violet-800/40 bg-violet-950/30 text-violet-200',
  amber: 'border-amber-800/40 bg-amber-950/30 text-amber-200',
  sky: 'border-sky-800/40 bg-sky-950/30 text-sky-200',
  slate: 'border-slate-700 bg-slate-900/50 text-slate-300',
  rose: 'border-rose-800/40 bg-rose-950/30 text-rose-200',
  cyan: 'border-cyan-800/40 bg-cyan-950/30 text-cyan-200',
  indigo: 'border-indigo-800/40 bg-indigo-950/30 text-indigo-200',
}

function stableHref(url?: string): string | null {
  const u = (url || '').trim()
  if (!/^https?:\/\//i.test(u)) return null
  if (isBrokenSourceShellUrl(u)) return null
  return u
}

export interface CrossSourceStripProps {
  bundle: CrossSourceBundle
  /** Scroll / load category panel when a chip has panelId */
  onOpenPanel?: (categoryId: string, panelId: string) => void
  className?: string
  testId?: string
  /** compact = fewer notes / denser chips */
  density?: 'full' | 'compact'
  title?: string
}

export function CrossSourceStrip({
  bundle,
  onOpenPanel,
  className = '',
  testId = 'cross-source-strip',
  density = 'full',
  title,
}: CrossSourceStripProps) {
  const byId = useMemo(() => {
    const m = new Map<string, CrossSourceFact>()
    for (const f of bundle.facts) m.set(f.id, f)
    return m
  }, [bundle.facts])

  const heading =
    title ||
    (bundle.surface === 'discover'
      ? 'Multi-source evidence'
      : bundle.surface === 'gene'
        ? 'Cross-source glance'
        : bundle.surface === 'disease'
          ? 'Joined disease sources'
          : bundle.surface === 'org'
            ? 'Joined public registers'
            : 'Cross-source evidence')

  return (
    <section
      className={`rounded-xl border border-slate-800 bg-slate-900/40 p-3 sm:p-4 ${className}`}
      data-testid={testId}
      data-empty={bundle.empty ? 'true' : 'false'}
      data-source-count={bundle.sourceCount}
      aria-label={heading}
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-xs font-semibold text-slate-100">{heading}</h3>
          {density === 'full' && (
            <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
              Free public sources joined for analysis — each chip keeps its source. Open a chip for
              the full siloed table (list cards stay one-API for provenance).
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold tabular-nums ${
            bundle.empty
              ? 'border-slate-700 text-slate-500'
              : 'border-indigo-800/50 bg-indigo-950/40 text-indigo-200'
          }`}
          data-testid={`${testId}-source-count`}
        >
          {bundle.empty ? 'No sources yet' : `${bundle.sourceCount} sources`}
        </span>
      </div>

      {bundle.groups.map((g) => {
        const facts = g.factIds
          .map((id) => byId.get(id))
          .filter((f): f is CrossSourceFact => Boolean(f))
        if (facts.length === 0) return null
        const allEmpty = facts.every(isFactEmpty)
        return (
          <div
            key={g.id}
            className={`mb-2 last:mb-0 ${emptyDataClass(allEmpty)}`}
            data-testid={`${testId}-group-${g.id}`}
          >
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              {g.title}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {facts.map((f) => (
                <FactChip
                  key={f.id}
                  fact={f}
                  onOpenPanel={onOpenPanel}
                  testId={`${testId}-fact-${f.id}`}
                />
              ))}
            </div>
          </div>
        )
      })}

      {bundle.notes[0] && density === 'full' && (
        <p className="mt-2 text-[9px] leading-relaxed text-slate-600">{bundle.notes[0]}</p>
      )}
    </section>
  )
}

function FactChip({
  fact,
  onOpenPanel,
  testId,
}: {
  fact: CrossSourceFact
  onOpenPanel?: (categoryId: string, panelId: string) => void
  testId: string
}) {
  const empty = isFactEmpty(fact)
  const tone = TONE[fact.tone || 'slate']
  const href = stableHref(fact.sourceUrl)
  const canPanel = Boolean(fact.panelId && fact.categoryId && onOpenPanel)
  const interactive = canPanel || Boolean(href)

  const body = (
    <>
      <span className="font-semibold text-slate-100 tabular-nums">
        {typeof fact.value === 'number' ? fact.value.toLocaleString() : fact.value}
      </span>
      <span className="text-slate-400">{fact.label}</span>
      <span className="text-[8px] uppercase tracking-wide text-slate-500">{fact.source}</span>
    </>
  )

  const tip = [
    fact.detail || fact.label,
    `Source: ${fact.source}`,
    canPanel ? 'Click to open siloed panel' : href ? 'Click for source record' : '',
  ]
    .filter(Boolean)
    .join('\n')

  const className = `inline-flex max-w-full flex-col items-start gap-0.5 rounded-lg border px-2 py-1 text-[10px] leading-tight transition-colors ${tone} ${emptyDataClass(empty)} ${
    interactive ? 'cursor-pointer hover:brightness-125' : ''
  }`

  if (canPanel) {
    return (
      <StyledTooltip content={tip}>
        <button
          type="button"
          className={className}
          data-testid={testId}
          data-empty={empty ? 'true' : 'false'}
          data-source={fact.source}
          onClick={() => onOpenPanel!(fact.categoryId!, fact.panelId!)}
        >
          {body}
        </button>
      </StyledTooltip>
    )
  }

  if (href) {
    return (
      <StyledTooltip content={tip}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
          data-testid={testId}
          data-empty={empty ? 'true' : 'false'}
          data-source={fact.source}
          onClick={() =>
            onDeepLinkClick(fact.source, href, {
              panelId: fact.panelId,
              label: fact.label,
            })
          }
        >
          {body}
        </a>
      </StyledTooltip>
    )
  }

  return (
    <StyledTooltip content={tip}>
      <span
        className={className}
        data-testid={testId}
        data-empty={empty ? 'true' : 'false'}
        data-source={fact.source}
      >
        {body}
      </span>
    </StyledTooltip>
  )
}
