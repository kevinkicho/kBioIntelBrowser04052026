'use client'

/**
 * Shown when a category/gene fan-out hit the production wall clock and returned
 * a partial shell (_partial + _timeout). Distinguishes "sources slow" from
 * "no free-API evidence".
 */

import { StyledTooltip } from '@/components/ui/StyledTooltip'

export interface PartialTimeoutBannerProps {
  /** e.g. category label or "Gene evidence" */
  scopeLabel?: string
  /** Server message if any */
  message?: string
  onRetry?: () => void
  retrying?: boolean
  testId?: string
}

export function PartialTimeoutBanner({
  scopeLabel = 'This section',
  message,
  onRetry,
  retrying = false,
  testId = 'partial-timeout-banner',
}: PartialTimeoutBannerProps) {
  return (
    <div
      className="rounded-lg border border-amber-700/40 bg-amber-950/30 px-3 py-2.5 text-[11px] text-amber-100/90 flex flex-wrap items-start gap-2"
      role="status"
      data-testid={testId}
    >
      <span className="shrink-0 mt-0.5 text-amber-400" aria-hidden>
        ⏱
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="font-medium text-amber-200/95">
          {scopeLabel}: some free-API sources were slow or unavailable
        </p>
        <p className="text-[10px] text-amber-200/60 leading-relaxed">
          Not the same as &ldquo;no evidence in public databases.&rdquo; We stopped waiting so the
          page stays usable. Loaded panels below may still hold of-record data; empty ones may be
          timeout, not absence.
          {message ? (
            <StyledTooltip content={message}>
              <span className="ml-1 underline decoration-dotted cursor-help text-amber-300/70">
                details
              </span>
            </StyledTooltip>
          ) : null}
        </p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="shrink-0 rounded-md border border-amber-600/50 bg-amber-900/40 px-2 py-1 text-[10px] font-medium text-amber-100 hover:bg-amber-800/50 disabled:opacity-40"
          data-testid={`${testId}-retry`}
        >
          {retrying ? 'Retrying…' : 'Retry'}
        </button>
      )}
    </div>
  )
}

/** Detect category/gene partial timeout shell from API payload. */
export function isPartialTimeoutPayload(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false
  const o = data as Record<string, unknown>
  return o._partial === true && (o._timeout === true || typeof o._error === 'string')
}
