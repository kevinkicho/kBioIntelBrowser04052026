'use client'

/**
 * Compact API provenance control for of-record content.
 * Body-portaled panel — always above page-canvas.
 */

import { useId, useRef, useState } from 'react'
import {
  formatProvenanceTimestamp,
  resolveProvenance,
} from '@/lib/provenance'
import { PortaledTooltipPanel } from '@/components/ui/PortaledTooltipPanel'

export interface ApiProvenanceChipProps {
  sourceKey: string
  sourceUrl?: string
  fetchedAt?: string | Date | null
  endpointOverride?: string
  label?: string
  className?: string
  testId?: string
}

export function ApiProvenanceChip({
  sourceKey,
  sourceUrl,
  fetchedAt,
  endpointOverride,
  label = 'API',
  className = '',
  testId = 'api-provenance-chip',
}: ApiProvenanceChipProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const anchorRef = useRef<HTMLSpanElement>(null)
  const p = resolveProvenance(sourceKey, {
    recordUrl: sourceUrl,
    fetchedAt,
    endpointOverride,
  })

  return (
    <span
      ref={anchorRef}
      className={`relative inline-flex ${className}`}
      data-testid={testId}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="rounded border border-slate-700/70 bg-slate-950/50 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400 hover:border-indigo-600/50 hover:text-indigo-300"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        data-testid={`${testId}-btn`}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        {label}
      </button>
      <PortaledTooltipPanel
        open={open}
        anchorRef={anchorRef}
        id={panelId}
        side="bottom"
        align="left"
        maxWidth="18rem"
        interactive
        testId={`${testId}-panel`}
        className="!p-2"
      >
        <p className="text-[10px] font-semibold text-slate-200">{p.api}</p>
        <p className="text-[9px] text-slate-500">{p.organization}</p>
        {p.description && (
          <p className="mt-1 text-[10px] leading-snug text-slate-400">{p.description}</p>
        )}
        {p.endpoint && (
          <p className="mt-1 break-all font-mono text-[9px] text-slate-500">
            {p.endpoint}
          </p>
        )}
        <p className="mt-1 text-[9px] text-slate-600">
          Retrieved: {formatProvenanceTimestamp(fetchedAt)}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {p.docs && (
            <a
              href={p.docs}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-indigo-400 hover:underline"
            >
              Docs
            </a>
          )}
          {sourceUrl && /^https?:\/\//i.test(sourceUrl) && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-indigo-400 hover:underline"
            >
              Open record
            </a>
          )}
        </div>
        <p className="mt-1.5 text-[9px] text-slate-600">
          Free public API · not clinical decision support
        </p>
      </PortaledTooltipPanel>
    </span>
  )
}
