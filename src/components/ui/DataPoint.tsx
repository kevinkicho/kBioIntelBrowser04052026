'use client'

/**
 * Clickable datapoint wrapper — opens a provenance popover so users can
 * inspect API source, fetch timestamp, endpoint, and record URL.
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import {
  formatProvenanceTimestamp,
  resolveProvenance,
  type ProvenanceInfo,
} from '@/lib/provenance'

export interface DataPointProps {
  /** Tracker / panel source key (e.g. gtex, bgee, disgenet) */
  sourceKey: string
  children: ReactNode
  /** Optional deep link for this row (PubMed, GXA experiment, etc.) */
  recordUrl?: string
  /** When this category/panel was fetched */
  fetchedAt?: Date | string | null
  /** Override endpoint if known for this call */
  endpointOverride?: string
  /** Short label shown in the popover header */
  label?: string
  className?: string
  /** Disable click (e.g. nested interactive already handles navigation) */
  disabled?: boolean
}

export function DataPoint({
  sourceKey,
  children,
  recordUrl,
  fetchedAt,
  endpointOverride,
  label,
  className = '',
  disabled = false,
}: DataPointProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const popoverId = useId()

  const provenance: ProvenanceInfo = resolveProvenance(sourceKey, {
    recordUrl,
    fetchedAt,
    endpointOverride,
  })

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [open, close])

  const onKeyDown = (e: KeyboardEvent) => {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen((v) => !v)
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard?.writeText(text)
    } catch {
      /* ignore */
    }
  }

  return (
    <div ref={rootRef} className={`relative group/dp ${className}`}>
      <div
        role={disabled ? undefined : 'button'}
        tabIndex={disabled ? undefined : 0}
        aria-expanded={disabled ? undefined : open}
        aria-controls={disabled ? undefined : popoverId}
        onClick={
          disabled
            ? undefined
            : (e) => {
                // Don't steal clicks from nested links/buttons
                const t = e.target as HTMLElement
                if (t.closest('a, button, input, select, textarea')) return
                e.stopPropagation()
                setOpen((v) => !v)
              }
        }
        onKeyDown={disabled ? undefined : onKeyDown}
        className={
          disabled
            ? undefined
            : 'cursor-pointer rounded-md outline-none ring-indigo-500/40 focus-visible:ring-2 hover:bg-slate-700/40 transition-colors'
        }
        title={disabled ? undefined : 'Click for API source & timestamp'}
        data-testid="datapoint"
        data-source-key={sourceKey}
      >
        <div className="flex items-start gap-1 min-w-0">
          <div className="min-w-0 flex-1">{children}</div>
          {!disabled && (
            <span
              className="mt-0.5 shrink-0 text-[9px] font-mono text-slate-600 opacity-0 group-hover/dp:opacity-100 group-focus-within/dp:opacity-100 transition-opacity"
              aria-hidden
            >
              i
            </span>
          )}
        </div>
      </div>

      {open && !disabled && (
        <div
          id={popoverId}
          role="dialog"
          aria-label={`Provenance for ${label || provenance.api}`}
          data-testid="datapoint-provenance"
          className="absolute z-[60] left-0 right-0 sm:left-auto sm:right-0 sm:w-80 mt-1 rounded-lg border border-slate-600 bg-[#12141c] shadow-xl p-3 text-left"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">API provenance</p>
              <p className="text-xs font-semibold text-slate-100 truncate">
                {label || provenance.api}
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              className="rounded p-0.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800"
              aria-label="Close provenance"
            >
              ✕
            </button>
          </div>

          <dl className="space-y-1.5 text-[11px]">
            <Row label="Source" value={provenance.organization} />
            <Row label="API" value={provenance.api} mono />
            <Row label="Fetched" value={formatProvenanceTimestamp(provenance.fetchedAt)} mono />
            {provenance.endpoint && (
              <Row
                label="Endpoint"
                value={provenance.endpoint}
                mono
                href={provenance.endpoint.startsWith('http') ? provenance.endpoint : undefined}
                onCopy={() => copy(provenance.endpoint)}
              />
            )}
            {provenance.docs && (
              <Row
                label="Docs"
                value={provenance.docs}
                mono
                href={provenance.docs}
              />
            )}
            {provenance.recordUrl && (
              <Row
                label="Record"
                value={provenance.recordUrl}
                mono
                href={provenance.recordUrl}
                onCopy={() => copy(provenance.recordUrl!)}
              />
            )}
            {provenance.description && (
              <div className="pt-1 border-t border-slate-800">
                <dt className="text-[10px] text-slate-500 mb-0.5">About</dt>
                <dd className="text-[10px] text-slate-400 leading-relaxed">{provenance.description}</dd>
              </div>
            )}
          </dl>

          <p className="mt-2 text-[9px] text-slate-600 leading-relaxed">
            Free public source — verify upstream yourself. BioIntel does not invent associations.
          </p>
        </div>
      )}
    </div>
  )
}

function Row({
  label,
  value,
  mono,
  href,
  onCopy,
}: {
  label: string
  value: string
  mono?: boolean
  href?: string
  onCopy?: () => void
}) {
  return (
    <div className="flex gap-2 items-start">
      <dt className="w-14 shrink-0 text-[10px] text-slate-500 pt-0.5">{label}</dt>
      <dd className="min-w-0 flex-1">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`break-all text-cyan-400/90 hover:text-cyan-300 ${mono ? 'font-mono text-[10px]' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            {value}
          </a>
        ) : (
          <span className={`break-all text-slate-300 ${mono ? 'font-mono text-[10px]' : ''}`}>{value}</span>
        )}
        {onCopy && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onCopy()
            }}
            className="ml-1 text-[9px] text-slate-600 hover:text-slate-300"
            title="Copy"
          >
            copy
          </button>
        )}
      </dd>
    </div>
  )
}
