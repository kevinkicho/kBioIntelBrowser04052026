'use client'

/**
 * Soft-empty / not-retrieved honesty (free-API chaos).
 * Empty 200 ≠ “no association forever.” Distinct from PartialTimeoutBanner.
 */

export interface NotRetrievedBannerProps {
  scopeLabel?: string
  /** e.g. category id or source name */
  detail?: string
  onRetry?: () => void
  retrying?: boolean
  testId?: string
}

export function NotRetrievedBanner({
  scopeLabel = 'This section',
  detail,
  onRetry,
  retrying = false,
  testId = 'not-retrieved-banner',
}: NotRetrievedBannerProps) {
  return (
    <div
      className="rounded-lg border border-slate-700/60 bg-slate-900/50 px-3 py-2.5 text-[11px] text-slate-300 flex flex-wrap items-start gap-2"
      role="status"
      data-testid={testId}
    >
      <span className="shrink-0 mt-0.5 text-slate-500" aria-hidden>
        ∅
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="font-medium text-slate-200">
          {scopeLabel}: not retrieved in this session
        </p>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Free public APIs returned empty, timed out earlier, or were not loaded. This is{' '}
          <strong className="font-medium text-slate-400">not</strong> proof of zero association
          forever — retry with patience or densify later.
          {detail ? <span className="ml-1 text-slate-600">({detail})</span> : null}
        </p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="shrink-0 rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-[10px] font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-40"
          data-testid={`${testId}-retry`}
        >
          {retrying ? 'Retrying…' : 'Retry'}
        </button>
      )}
    </div>
  )
}

/** Empty 200 payload without partial-timeout markers. */
export function isSoftEmptyPayload(data: unknown): boolean {
  if (!data || typeof data !== 'object') return true
  const o = data as Record<string, unknown>
  if (o._partial === true || o._timeout === true) return false
  if (o.error || o._error) return false
  // Common category bag: sections / items / results empty
  for (const key of ['sections', 'items', 'results', 'data', 'entries', 'rows']) {
    if (Array.isArray(o[key]) && (o[key] as unknown[]).length > 0) return false
  }
  if (typeof o.hasData === 'boolean') return !o.hasData
  if (typeof o.empty === 'boolean' && o.empty) return true
  // Nested common shapes
  if (o.bag && typeof o.bag === 'object') {
    const bag = o.bag as Record<string, unknown>
    const vals = Object.values(bag)
    if (vals.some((v) => Array.isArray(v) && v.length > 0)) return false
    if (vals.some((v) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length > 0))
      return false
  }
  // No non-empty lists / bags — treat as soft empty (not retrieved)
  return true
}
