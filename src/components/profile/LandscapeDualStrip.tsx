'use client'

import { memo, useId, useMemo, useState, type ReactNode } from 'react'
import {
  buildLandscapeDualStripFromProfileData,
  type JurisdictionPresence,
  type LandscapeStripChip,
} from '@/lib/landscapeDualStrip'
import { onDeepLinkClick } from '@/lib/trackDeepLink'
import { isBrokenSourceShellUrl } from '@/lib/deepLinkPolicy'
import { HelperTip } from '@/components/ui/HelperTip'
import { StyledTooltip, STYLED_TOOLTIP_Z } from '@/components/ui/StyledTooltip'

const TONE: Record<NonNullable<LandscapeStripChip['tone']>, string> = {
  emerald: 'border-emerald-800/40 bg-emerald-950/30 text-emerald-200',
  violet: 'border-violet-800/40 bg-violet-950/30 text-violet-200',
  amber: 'border-amber-800/40 bg-amber-950/30 text-amber-200',
  sky: 'border-sky-800/40 bg-sky-950/30 text-sky-200',
  slate: 'border-slate-700 bg-slate-900/50 text-slate-300',
  rose: 'border-rose-800/40 bg-rose-950/30 text-rose-200',
}

function stableHttpHref(url: string | null | undefined): string | null {
  const u = (url || '').trim()
  if (!/^https?:\/\//i.test(u)) return null
  if (isBrokenSourceShellUrl(u)) return null
  return u
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
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="text-xs font-semibold text-slate-100">
            Landscape dual strip
            {strip.family.stem ? (
              <span className="ml-1.5 font-normal text-slate-500">· {strip.family.stem}</span>
            ) : null}
          </h3>
          <HelperTip
            content="Free public joins only — biosimilar family · evidence neighborhood · multi-jurisdiction presence. Not clinical advice or competitive ranking."
            label="About landscape dual strip"
            testId="landscape-dual-strip-help"
          />
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
                <JurisdictionChip j={j} moleculeName={strip.moleculeName} />
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

function JurisdictionChip({
  j,
  moleculeName,
}: {
  j: JurisdictionPresence
  moleculeName: string
}) {
  const uid = useId()
  const tipId = `${uid}-tip`
  const [open, setOpen] = useState(false)
  const href = stableHttpHref(j.href)
  const emptyCount = !j.count || j.count === 0

  const className = `inline-flex max-w-full items-center gap-1 rounded border px-2 py-1 text-[10px] ${
    href
      ? 'border-slate-700 bg-slate-950/50 text-slate-300 hover:border-indigo-700/50 hover:text-indigo-200'
      : 'border-slate-800 bg-slate-950/30 text-slate-400 cursor-default'
  } ${emptyCount && !href ? 'opacity-30' : emptyCount ? 'opacity-80' : ''}`

  const body = (
    <>
      <span className="font-semibold text-slate-100 shrink-0">{j.region}</span>
      <span className="text-slate-500 truncate">{j.label}</span>
      {j.count > 0 ? (
        <span className="font-mono tabular-nums text-indigo-300 shrink-0">{j.count}</span>
      ) : null}
      {/* No trailing — saves space; hover tooltip explains navigation */}
    </>
  )

  return (
    <span
      className="relative inline-flex max-w-full"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
          aria-describedby={open ? tipId : undefined}
          data-testid="jurisdiction-chip"
          data-clickable="true"
          data-region={j.region}
          onClick={() =>
            onDeepLinkClick('other', href, {
              panelId: 'landscape-dual-strip',
              label: j.id,
            })
          }
        >
          {body}
        </a>
      ) : (
        <span
          className={className}
          aria-describedby={open ? tipId : undefined}
          data-testid="jurisdiction-chip"
          data-clickable="false"
          data-region={j.region}
        >
          {body}
        </span>
      )}

      {open && (
        <JurisdictionTooltip
          tipId={tipId}
          j={j}
          moleculeName={moleculeName}
          href={href}
        />
      )}
    </span>
  )
}

function JurisdictionTooltip({
  tipId,
  j,
  moleculeName,
  href,
}: {
  tipId: string
  j: JurisdictionPresence
  moleculeName: string
  href: string | null
}) {
  return (
    <span
      id={tipId}
      role="tooltip"
      data-testid="jurisdiction-chip-tooltip"
      style={{ zIndex: STYLED_TOOLTIP_Z }}
      className="pointer-events-none absolute left-0 bottom-full mb-1.5 w-72 max-w-[min(18rem,92vw)] rounded-lg border border-slate-600 bg-slate-950 p-2.5 shadow-xl shadow-black/50 text-left"
    >
      <span className="block text-[10px] font-semibold text-sky-200">
        {j.region} · {j.label}
      </span>
      <span className="mt-0.5 block text-[9px] font-medium uppercase tracking-wide text-slate-500">
        Jurisdiction presence · free public registers
      </span>
      {j.count > 0 && (
        <span className="mt-1 block font-mono text-[10px] text-indigo-300">
          {j.count} free-API row{j.count === 1 ? '' : 's'}
          {j.detail ? ` · ${j.detail}` : ''}
        </span>
      )}

      <TipBlock title="Why this chip is here">
        {j.whyShowing ||
          `Free public data for ${moleculeName} includes a ${j.region} register or portal signal (${j.label}).`}
      </TipBlock>
      <TipBlock title="What you can learn if you navigate">
        {j.learnMore ||
          'Open the official regulator/register page for product names, status, and public documentation. BioIntel does not give clinical or regulatory decisions.'}
      </TipBlock>
      <TipBlock title="How BioIntel decided">
        {j.method ||
          'Deterministic join of free-public profile panels and portal deep links. Not LLM ranking or competitive scoring.'}
      </TipBlock>
      {j.sourceName && (
        <TipBlock title="Source">{j.sourceName}</TipBlock>
      )}
      <TipBlock title="Link">
        {href
          ? 'Official http(s) deep link — opens in a new tab.'
          : 'No stable deep link for this row — chip is not clickable.'}
      </TipBlock>
      {href && (
        <span className="mt-1 block break-all font-mono text-[8px] text-slate-600">{href}</span>
      )}
      <span className="mt-1.5 block text-[9px] leading-snug text-slate-600">
        Not admissions, clinical referral, or regulatory decision support.
      </span>
    </span>
  )
}

function TipBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <span className="mt-1.5 block">
      <span className="block text-[9px] font-semibold text-indigo-300/90">{title}</span>
      <span className="mt-0.5 block text-[10px] leading-snug text-slate-300">{children}</span>
    </span>
  )
}

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
      <StyledTooltip content={`Open ${chip.label} panel`}>
        <button
          type="button"
          className={className}
          data-testid={`landscape-chip-${chip.id}`}
          aria-label={`Open ${chip.label} panel`}
          onClick={() => onOpenPanel!(chip.categoryId!, chip.panelId!)}
        >
          {body}
        </button>
      </StyledTooltip>
    )
  }
  return (
    <StyledTooltip content={empty ? `${chip.label}: no data` : chip.label}>
      <span
        className={className}
        data-testid={`landscape-chip-${chip.id}`}
        data-empty={empty ? 'true' : 'false'}
      >
        {body}
      </span>
    </StyledTooltip>
  )
}
