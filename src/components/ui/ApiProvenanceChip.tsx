'use client'

/**
 * Compact API provenance control for of-record content.
 * Wraps the same resolver as DataPoint — use on hub rows, Discover chips, exports headers.
 */

import { useId, useState } from 'react'
import {
  formatProvenanceTimestamp,
  resolveProvenance,
} from '@/lib/provenance'
import { STYLED_TOOLTIP_Z } from '@/components/ui/StyledTooltip'

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
  const p = resolveProvenance(sourceKey, {
    recordUrl: sourceUrl,
    fetchedAt,
    endpointOverride,
  })

  return (
    <span
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
      {open && (
        <span
          id={panelId}
          role="tooltip"
          style={{ zIndex: STYLED_TOOLTIP_Z }}
          className="absolute left-0 top-full mt-1 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-slate-600 bg-slate-950 p-2 text-left shadow-xl"
          data-testid={`${testId}-panel`}
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
        </span>
      )}
    </span>
  )
}
