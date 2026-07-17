'use client'

/**
 * Datapoint row with an explicit "API" button that opens provenance.
 * Row content (links, Discover, etc.) keeps normal click behavior.
 */

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import {
  formatProvenanceTimestamp,
  resolveProvenance,
  type ProvenanceInfo,
} from '@/lib/provenance'

/** Above AI modal (z-200), panel modals, sticky chrome */
const PROVENANCE_Z = 300

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
  /** Hide the provenance button */
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
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const popoverId = useId()

  const provenance: ProvenanceInfo = resolveProvenance(sourceKey, {
    recordUrl,
    fetchedAt,
    endpointOverride,
  })

  const close = useCallback(() => setOpen(false), [])

  const placePopover = useCallback(() => {
    const btn = btnRef.current
    if (!btn || typeof window === 'undefined') return
    const rect = btn.getBoundingClientRect()
    const width = 320
    const pad = 8
    let left = rect.right - width
    if (left < pad) left = pad
    if (left + width > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - width - pad)
    }
    let top = rect.bottom + 6
    const estHeight = 280
    if (top + estHeight > window.innerHeight - pad) {
      top = Math.max(pad, rect.top - estHeight - 6)
    }
    setCoords({ top, left })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    placePopover()
  }, [open, placePopover])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node
      if (btnRef.current?.contains(t)) return
      if (popoverRef.current?.contains(t)) return
      close()
    }
    const onReposition = () => placePopover()
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, close, placePopover])

  const copy = async (text: string) => {
    try {
      await navigator.clipboard?.writeText(text)
    } catch {
      /* ignore */
    }
  }

  const popover =
    open &&
    !disabled &&
    coords &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        ref={popoverRef}
        id={popoverId}
        role="dialog"
        aria-label={`Provenance for ${label || provenance.api}`}
        data-testid="datapoint-provenance"
        className="fixed w-80 max-w-[calc(100vw-16px)] rounded-lg border border-slate-600 bg-[#12141c] shadow-2xl p-3 text-left"
        style={{ top: coords.top, left: coords.left, zIndex: PROVENANCE_Z }}
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
            <Row label="Docs" value={provenance.docs} mono href={provenance.docs} />
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
      </div>,
      document.body,
    )

  return (
    <div className={`group/dp flex items-start gap-1.5 min-w-0 ${className}`}>
      <div className="min-w-0 flex-1">{children}</div>
      {!disabled && (
        <button
          ref={btnRef}
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setOpen((v) => !v)
          }}
          aria-expanded={open}
          aria-controls={open ? popoverId : undefined}
          aria-haspopup="dialog"
          title="API provenance — source, timestamp, endpoint"
          data-testid="datapoint-provenance-btn"
          className="shrink-0 mt-0.5 rounded border border-slate-700/80 bg-slate-800/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400 hover:border-cyan-700/50 hover:bg-cyan-950/40 hover:text-cyan-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 transition-colors"
        >
          API
        </button>
      )}
      {popover}
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
