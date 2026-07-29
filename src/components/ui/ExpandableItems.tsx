'use client'

/**
 * Renders a capped list with a clickable “+N more” control that expands/collapses.
 * Use for chips, tags, synonyms, and any truncated free-API sample lists.
 */

import { useId, useState, type ReactNode } from 'react'

export interface ExpandableItemsProps<T> {
  items: T[]
  /** How many items show before expand. Default 5. */
  maxVisible?: number
  /** Render each item (required unless T is ReactNode-ish strings shown as chips). */
  renderItem?: (item: T, index: number) => ReactNode
  /** Container class (flex wrap by default). */
  className?: string
  /** Class for the +N more / show less button. */
  moreClassName?: string
  /** Optional unit word: "+3 more domains" */
  unit?: string
  /** Start expanded */
  defaultExpanded?: boolean
  testId?: string
  /** When true, string items render as default slate chips */
  asChips?: boolean
}

const DEFAULT_MORE =
  'inline-flex items-center rounded-md border border-slate-600/70 bg-slate-800/60 px-2 py-0.5 text-[10px] font-medium text-indigo-300 hover:border-indigo-600/50 hover:bg-indigo-950/40 hover:text-indigo-200 transition-colors cursor-pointer'

function defaultChip(text: string, key: string | number): ReactNode {
  return (
    <span
      key={key}
      className="inline-flex items-center rounded-md border border-slate-700/60 bg-slate-800/50 px-2 py-0.5 text-[10px] text-slate-300"
    >
      {text}
    </span>
  )
}

export function ExpandableItems<T>({
  items,
  maxVisible = 5,
  renderItem,
  className = 'flex flex-wrap gap-1.5',
  moreClassName = DEFAULT_MORE,
  unit,
  defaultExpanded = false,
  testId = 'expandable-items',
  asChips = false,
}: ExpandableItemsProps<T>) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const panelId = useId()

  if (!items || items.length === 0) return null

  const limit = Math.max(0, maxVisible)
  const needsToggle = items.length > limit
  const visible = expanded || !needsToggle ? items : items.slice(0, limit)
  const remaining = items.length - limit

  const render = (item: T, index: number): ReactNode => {
    if (renderItem) return renderItem(item, index)
    if (asChips || typeof item === 'string' || typeof item === 'number') {
      return defaultChip(String(item), index)
    }
    return <span key={index}>{String(item)}</span>
  }

  const moreLabel = unit
    ? `+${remaining} more ${unit}`
    : `+${remaining} more`
  const lessLabel = 'Show less'

  return (
    <div className={className} data-testid={testId}>
      {visible.map((item, i) => render(item, i))}
      {needsToggle && (
        <button
          type="button"
          className={moreClassName}
          aria-expanded={expanded}
          aria-controls={panelId}
          data-testid={`${testId}-toggle`}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? lessLabel : moreLabel}
        </button>
      )}
      {/* id anchor for a11y when expanded content is large */}
      <span id={panelId} className="sr-only">
        {expanded ? `Showing all ${items.length} items` : `Showing ${limit} of ${items.length}`}
      </span>
    </div>
  )
}

/**
 * Compact “+N more” / “Show less” toggle for lists already partially rendered outside.
 * Prefer ExpandableItems when you control the full list.
 */
export function ExpandableMoreToggle({
  remaining,
  expanded,
  onToggle,
  unit,
  className = DEFAULT_MORE,
  testId = 'expandable-more-toggle',
}: {
  remaining: number
  expanded: boolean
  onToggle: () => void
  unit?: string
  className?: string
  testId?: string
}) {
  if (remaining <= 0 && !expanded) return null
  return (
    <button
      type="button"
      className={className}
      onClick={onToggle}
      aria-expanded={expanded}
      data-testid={testId}
    >
      {expanded
        ? 'Show less'
        : unit
          ? `+${remaining} more ${unit}`
          : `+${remaining} more`}
    </button>
  )
}

const INLINE_MORE =
  'inline text-[10px] font-medium text-indigo-300 hover:text-indigo-200 underline-offset-2 hover:underline cursor-pointer bg-transparent border-0 p-0 ml-0.5'

/**
 * Comma-joined string list with clickable “+N more” (inline text, not chips).
 * Use for biospecimens, synonyms, tissues, pathways, etc.
 */
export function ExpandableTextList({
  items,
  maxVisible = 3,
  unit,
  className = 'text-xs text-slate-500',
  prefix,
  moreClassName = INLINE_MORE,
  defaultExpanded = false,
  testId = 'expandable-text-list',
}: {
  items: string[]
  maxVisible?: number
  unit?: string
  className?: string
  /** Label before the list, e.g. "Biospecimens:" */
  prefix?: ReactNode
  moreClassName?: string
  defaultExpanded?: boolean
  testId?: string
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  if (!items || items.length === 0) return null

  const limit = Math.max(0, maxVisible)
  const needsToggle = items.length > limit
  const visible = expanded || !needsToggle ? items : items.slice(0, limit)
  const remaining = items.length - limit

  return (
    <p className={className} data-testid={testId}>
      {prefix != null && (
        <>
          <span className={typeof prefix === 'string' ? 'text-slate-400' : undefined}>{prefix}</span>
          {typeof prefix === 'string' && !/\s$/.test(prefix) ? ' ' : typeof prefix !== 'string' ? ' ' : ''}
        </>
      )}
      {visible.join(', ')}
      {needsToggle && (
        <>
          {' '}
          <button
            type="button"
            className={moreClassName}
            aria-expanded={expanded}
            data-testid={`${testId}-toggle`}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded
              ? 'Show less'
              : unit
                ? `+${remaining} more ${unit}`
                : `+${remaining} more`}
          </button>
        </>
      )}
    </p>
  )
}
