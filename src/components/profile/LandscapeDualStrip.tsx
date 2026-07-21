'use client'

import { memo, useMemo } from 'react'
import {
  buildLandscapeDualStripFromProfileData,
  type LandscapeStripChip,
} from '@/lib/landscapeDualStrip'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

const TONE: Record<NonNullable<LandscapeStripChip['tone']>, string> = {
  emerald: 'border-emerald-800/40 bg-emerald-950/30 text-emerald-200',
  violet: 'border-violet-800/40 bg-violet-950/30 text-violet-200',
  amber: 'border-amber-800/40 bg-amber-950/30 text-amber-200',
  sky: 'border-sky-800/40 bg-sky-950/30 text-sky-200',
  slate: 'border-slate-700 bg-slate-900/50 text-slate-300',
  rose: 'border-rose-800/40 bg-rose-950/30 text-rose-200',
}

export const LandscapeDualStrip = memo(function LandscapeDualStrip({
  moleculeName,
  data,
  onOpenPanel,
}: {
  moleculeName: string
  data: Record<string, unknown>
  /** Scroll / load category panel when a chip is clicked */
  onOpenPanel?: (categoryId: string, panelId: string) => void
}) {
  const strip = useMemo(
    () => buildLandscapeDualStripFromProfileData(moleculeName, data),
    [moleculeName, data],
  )

  return (
    <section
      className="mb-4 rounded-xl border border-slate-800 bg-slate-900/40 p-3 sm:p-4"
      data-testid="landscape-dual-strip"
      aria-label="Landscape dual strip"
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold text-slate-100">
            Landscape dual strip
            {strip.family.stem ? (
              <span className="ml-1.5 font-normal text-slate-500">· {strip.family.stem}</span>
            ) : null}
          </h3>
          <p className="mt-0.5 text-[10px] text-slate-500 leading-relaxed">
            Free public joins only — biosimilar family · evidence neighborhood · multi-jurisdiction
            presence. Not clinical advice or competitive ranking.
          </p>
        </div>
        {!strip.hasSignal && (
          <span className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-500">
            Load Pharma + Clinical categories
          </span>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div>
          <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300/90">
            Biosimilar family
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {strip.familyChips.map((c) => (
              <Chip key={c.id} chip={c} onOpenPanel={onOpenPanel} />
            ))}
          </div>
        </div>
        <div>
          <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300/90">
            Evidence neighborhood
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {strip.neighborhoodChips.map((c) => (
              <Chip key={c.id} chip={c} onOpenPanel={onOpenPanel} />
            ))}
          </div>
        </div>
      </div>

      {strip.jurisdictions.length > 0 && (
        <div className="mt-3 border-t border-slate-800 pt-3">
          <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Jurisdiction presence
          </h4>
          <ul className="flex flex-wrap gap-1.5">
            {strip.jurisdictions.map((j) => (
              <li key={j.id}>
                {j.href ? (
                  <a
                    href={j.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-950/50 px-2 py-1 text-[10px] text-slate-300 hover:border-indigo-700/50 hover:text-indigo-200"
                    title={j.detail}
                    onClick={() =>
                      onDeepLinkClick('other', j.href!, {
                        panelId: 'landscape-dual-strip',
                        label: j.id,
                      })
                    }
                  >
                    <span className="font-semibold text-slate-100">{j.region}</span>
                    <span className="text-slate-500">{j.label}</span>
                    {j.count > 0 ? (
                      <span className="font-mono text-indigo-300">{j.count}</span>
                    ) : (
                      <span className="text-slate-600">↗</span>
                    )}
                  </a>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 rounded border border-slate-800 px-2 py-1 text-[10px] text-slate-400"
                    title={j.detail}
                  >
                    <span className="font-semibold text-slate-200">{j.region}</span>
                    {j.count > 0 ? (
                      <span className="font-mono text-slate-300">{j.count}</span>
                    ) : null}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {strip.notes.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {strip.notes.map((n) => (
            <li key={n} className="text-[10px] text-amber-500/80">
              {n}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
})

function Chip({
  chip,
  onOpenPanel,
}: {
  chip: LandscapeStripChip
  onOpenPanel?: (categoryId: string, panelId: string) => void
}) {
  const tone = TONE[chip.tone || 'slate']
  const empty = typeof chip.value === 'number' && chip.value === 0
  // In-panel scroll is not a deep link — only style as clickable when parent provided handler
  // and value is non-zero (zero chips stay inert)
  const clickable = Boolean(onOpenPanel && chip.categoryId && chip.panelId && !empty)
  const className = `inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] ${tone} ${
    empty ? 'opacity-30' : ''
  } ${clickable ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`

  const body = (
    <>
      <span className="font-semibold tabular-nums">{chip.value}</span>
      <span className="opacity-80">{chip.label}</span>
    </>
  )

  if (clickable) {
    return (
      <button
        type="button"
        className={className}
        data-testid={`landscape-chip-${chip.id}`}
        title={`Open ${chip.label} panel`}
        onClick={() => onOpenPanel!(chip.categoryId!, chip.panelId!)}
      >
        {body}
      </button>
    )
  }
  return (
    <span
      className={className}
      data-testid={`landscape-chip-${chip.id}`}
      data-empty={empty ? 'true' : 'false'}
      title={empty ? `${chip.label}: no data` : chip.label}
    >
      {body}
    </span>
  )
}
