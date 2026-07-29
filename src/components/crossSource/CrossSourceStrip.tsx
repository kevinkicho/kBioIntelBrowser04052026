'use client'

/**
 * Entity-centric multi-source evidence strip.
 * Chips keep free-API provenance; click opens siloed panel or external deep link.
 * Empty counts are hidden by default so coverage uses available space.
 */

import { useMemo, useState } from 'react'
import type { CrossSourceBundle, CrossSourceFact, CrossSourceTone } from '@/lib/crossSource'
import { isFactEmpty } from '@/lib/crossSource'
import { emptyDataClass } from '@/lib/summaryEmpty'
import { isBrokenSourceShellUrl } from '@/lib/deepLinkPolicy'
import { onDeepLinkClick } from '@/lib/trackDeepLink'
import { HelperTip } from '@/components/ui/HelperTip'
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
  /** Start with empty counts visible (default false — hide sparse zeros) */
  showEmptyDefault?: boolean
}

export function CrossSourceStrip({
  bundle,
  onOpenPanel,
  className = '',
  testId = 'cross-source-strip',
  density = 'full',
  title,
  showEmptyDefault = false,
}: CrossSourceStripProps) {
  const [showEmpty, setShowEmpty] = useState(showEmptyDefault)

  const byId = useMemo(() => {
    const m = new Map<string, CrossSourceFact>()
    for (const f of bundle.facts) m.set(f.id, f)
    return m
  }, [bundle.facts])

  const emptyCount = useMemo(
    () => bundle.facts.filter((f) => isFactEmpty(f)).length,
    [bundle.facts],
  )
  const filledCount = bundle.facts.length - emptyCount

  const groups = useMemo(() => {
    return bundle.groups
      .map((g) => {
        const facts = g.factIds
          .map((id) => byId.get(id))
          .filter((f): f is CrossSourceFact => Boolean(f))
          .filter((f) => showEmpty || !isFactEmpty(f))
        return { g, facts }
      })
      .filter(({ facts }) => facts.length > 0)
  }, [bundle.groups, byId, showEmpty])

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
      className={`rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5 sm:px-4 ${className}`}
      data-testid={testId}
      data-empty={bundle.empty ? 'true' : 'false'}
      data-source-count={bundle.sourceCount}
      data-hide-empty={showEmpty ? 'false' : 'true'}
      aria-label={heading}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="min-w-0 flex flex-wrap items-center gap-1.5">
          <h3 className="text-xs font-semibold text-slate-100">{heading}</h3>
          {density === 'full' && (
            <HelperTip
              content={[
                'Free public sources joined for analysis — each chip keeps its source. Open a chip for the full siloed table (list cards stay one-API for provenance).',
                'Empty zero counts are hidden by default so coverage fills the row with real signal.',
                bundle.notes[0] || '',
              ]
                .filter(Boolean)
                .join('\n\n')}
              label="About this evidence strip"
              testId={`${testId}-help`}
            />
          )}
          <span
            className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold tabular-nums ${
              bundle.empty
                ? 'border-slate-700 text-slate-500'
                : 'border-indigo-800/50 bg-indigo-950/40 text-indigo-200'
            }`}
            data-testid={`${testId}-source-count`}
          >
            {bundle.empty
              ? 'No sources yet'
              : `${filledCount} with data · ${bundle.sourceCount} sources`}
          </span>
        </div>
        {emptyCount > 0 && (
          <button
            type="button"
            onClick={() => setShowEmpty((v) => !v)}
            className={`rounded border px-2 py-0.5 text-[10px] font-medium transition-colors ${
              showEmpty
                ? 'border-slate-600 text-slate-300'
                : 'border-slate-700 text-slate-500 hover:text-slate-300'
            }`}
            data-testid={`${testId}-toggle-empty`}
          >
            {showEmpty ? 'Hide empty' : `Show ${emptyCount} empty`}
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="text-[11px] text-slate-500">
          {bundle.empty
            ? 'No multi-source counts loaded yet — categories still hydrating.'
            : 'All coverage counts are empty for this session. Load more panels or show empty chips.'}
        </p>
      ) : (
        <div
          className={
            density === 'compact'
              ? 'space-y-1.5'
              : 'grid gap-x-4 gap-y-2 sm:grid-cols-2 xl:grid-cols-3'
          }
        >
          {groups.map(({ g, facts }) => {
            const allEmpty = facts.every(isFactEmpty)
            return (
              <div
                key={g.id}
                className={`min-w-0 ${emptyDataClass(allEmpty)}`}
                data-testid={`${testId}-group-${g.id}`}
              >
                <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                  {g.title}
                  <span className="ml-1 font-normal normal-case tabular-nums text-slate-600">
                    ({facts.length})
                  </span>
                </p>
                <div className="flex flex-wrap gap-1">
                  {facts.map((f) => (
                    <FactChip
                      key={f.id}
                      fact={f}
                      onOpenPanel={onOpenPanel}
                      compact={density === 'compact'}
                      testId={`${testId}-fact-${f.id}`}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function FactChip({
  fact,
  onOpenPanel,
  compact,
  testId,
}: {
  fact: CrossSourceFact
  onOpenPanel?: (categoryId: string, panelId: string) => void
  compact?: boolean
  testId: string
}) {
  const empty = isFactEmpty(fact)
  const tone = TONE[fact.tone || 'slate']
  const href = stableHref(fact.sourceUrl)
  const canPanel = Boolean(fact.panelId && fact.categoryId && onOpenPanel)
  const interactive = canPanel || Boolean(href)

  const value =
    typeof fact.value === 'number' ? fact.value.toLocaleString() : fact.value

  // Single-line dense chip: value · label · source — fills horizontal space
  const body = (
    <span className="inline-flex max-w-full items-baseline gap-1 whitespace-nowrap">
      <span className="font-semibold tabular-nums text-slate-100">{value}</span>
      <span className="truncate text-slate-400">{fact.label}</span>
      {!compact && (
        <span className="hidden text-[8px] uppercase tracking-wide text-slate-500 sm:inline">
          · {fact.source}
        </span>
      )}
    </span>
  )

  const tip = [
    fact.detail || fact.label,
    `Source: ${fact.source}`,
    canPanel ? 'Click to open siloed panel' : href ? 'Click for source record' : '',
  ]
    .filter(Boolean)
    .join('\n')

  const className = `inline-flex max-w-full items-center rounded-md border px-1.5 py-0.5 text-[10px] leading-tight transition-colors ${tone} ${emptyDataClass(empty)} ${
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
