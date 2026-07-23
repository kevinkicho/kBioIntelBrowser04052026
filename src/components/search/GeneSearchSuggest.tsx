'use client'

/**
 * Debounced gene symbol/name typeahead for /gene.
 * Live free API only (via /api/search/gene · MyGene.info) — never mock rows.
 * Dropdown is portaled so parent overflow cannot clip it.
 */

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

export interface GeneSuggestion {
  geneId: string
  symbol: string
  name: string
  summary: string
  chromosome: string
  typeOfGene: string
  aliases: string[]
}

export interface GeneSearchSuggestProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  inputClassName?: string
  testId?: string
  /** Pick a suggestion (navigate or run full search). */
  onSelectSuggestion?: (suggestion: GeneSuggestion) => void
  /** Submit free-text (Enter when no highlight / empty list). */
  onSubmitQuery?: (query: string) => void
  autoFocus?: boolean
}

interface DropdownRect {
  top: number
  left: number
  width: number
}

export function GeneSearchSuggest({
  value,
  onChange,
  placeholder = 'Search a gene (e.g. BRCA1, TP53, EGFR)…',
  disabled = false,
  className = '',
  inputClassName = '',
  testId = 'gene-search-input',
  onSelectSuggestion,
  onSubmitQuery,
  autoFocus = false,
}: GeneSearchSuggestProps) {
  const listId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<GeneSuggestion[]>([])
  const [highlight, setHighlight] = useState(0)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [menuRect, setMenuRect] = useState<DropdownRect | null>(null)
  const [mounted, setMounted] = useState(false)
  const skipFetchRef = useRef(false)

  const close = useCallback(() => {
    setOpen(false)
    setHighlight(0)
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  const updateMenuRect = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    // Wide enough for symbol | name | chip columns to align across rows
    setMenuRect({
      top: r.bottom + 4,
      left: r.left,
      width: Math.max(r.width, Math.min(520, window.innerWidth - 24)),
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updateMenuRect()
    let raf = 0
    const onWin = () => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        updateMenuRect()
      })
    }
    window.addEventListener('resize', onWin)
    window.addEventListener('scroll', onWin, true)
    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', onWin)
      window.removeEventListener('scroll', onWin, true)
    }
  }, [open, value, suggestions.length, loading, updateMenuRect])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      if (containerRef.current?.contains(t)) return
      if (listRef.current?.contains(t)) return
      close()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [close])

  useEffect(() => {
    if (skipFetchRef.current) {
      skipFetchRef.current = false
      return
    }
    const q = value.trim()
    if (q.length < 2) {
      setSuggestions([])
      setOpen(false)
      setLoading(false)
      setFetchError(null)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      setLoading(true)
      setFetchError(null)
      setOpen(true)
      try {
        const params = new URLSearchParams({ q, limit: '12' })
        const res = await fetch(`/api/search/gene?${params.toString()}`, {
          signal: ac.signal,
          headers: { Accept: 'application/json' },
        })
        const data = (await res.json().catch(() => ({}))) as {
          results?: GeneSuggestion[]
          error?: string
        }
        if (ac.signal.aborted) return
        if (!res.ok) {
          setSuggestions([])
          setFetchError(data.error || `Suggest failed (${res.status})`)
          setOpen(true)
          return
        }
        const rows = Array.isArray(data.results) ? data.results : []
        setSuggestions(rows)
        setOpen(true)
        setHighlight(0)
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return
        setSuggestions([])
        setFetchError(e instanceof Error ? e.message : 'Suggest request failed')
        setOpen(true)
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    }, 180)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [value])

  function pick(s: GeneSuggestion) {
    skipFetchRef.current = true
    onChange(s.symbol || s.name)
    setSuggestions([])
    setFetchError(null)
    close()
    onSelectSuggestion?.(s)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return
    }
    if (e.key === 'Enter') {
      if (open && suggestions.length > 0 && suggestions[highlight]) {
        e.preventDefault()
        e.stopPropagation()
        pick(suggestions[highlight]!)
        return
      }
      e.preventDefault()
      const q = value.trim()
      if (q.length >= 2) {
        close()
        onSubmitQuery?.(q)
      }
      return
    }
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((i) => Math.min(suggestions.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((i) => Math.max(0, i - 1))
    }
  }

  const showDropdown = open && value.trim().length >= 2 && mounted && menuRect

  const dropdown =
    showDropdown &&
    createPortal(
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        style={{
          position: 'fixed',
          top: menuRect.top,
          left: menuRect.left,
          width: menuRect.width,
          zIndex: 10000,
        }}
        className="max-h-[22rem] overflow-y-auto rounded-lg border border-slate-600 bg-slate-900 shadow-2xl shadow-black/60"
        data-testid={`${testId}-dropdown`}
      >
        <li className="sticky top-0 z-[1] border-b border-slate-800 bg-slate-900 px-3 py-2">
          <div className="mb-1.5 text-[9px] uppercase tracking-wide text-slate-500">
            Live suggestions · MyGene.info
            {loading ? ' · loading…' : suggestions.length ? ` · ${suggestions.length}` : ''}
          </div>
          {/* Column guide — same grid as rows so symbols/chips line up */}
          <div
            className="hidden grid-cols-[5.25rem_minmax(0,1fr)_auto] items-center gap-x-3 text-[9px] font-medium uppercase tracking-wide text-slate-600 sm:grid"
            aria-hidden
          >
            <span>Symbol</span>
            <span>Name</span>
            <span className="text-right">Type · loc · id</span>
          </div>
        </li>
        {fetchError && (
          <li className="px-3 py-2.5 text-[11px] text-amber-300/90" role="status">
            {fetchError}
          </li>
        )}
        {!loading && !fetchError && suggestions.length === 0 && (
          <li className="px-3 py-3.5 text-[11px] text-slate-500" role="status">
            No gene matches for “{value.trim()}”. Try a symbol (BRCA1) or name.
          </li>
        )}
        {suggestions.map((s, i) => {
          const active = i === highlight
          const symbol = (s.symbol || s.geneId || '—').trim()
          const name = (s.name || '').trim()
          const typeLabel = (s.typeOfGene || '').trim()
          const chrLabel = s.chromosome ? `chr ${s.chromosome}` : ''
          const aliases = (s.aliases ?? []).filter(Boolean).slice(0, 4)
          return (
            <li
              key={`${s.geneId}-${s.symbol}`}
              role="presentation"
              className="border-b border-slate-800/70 last:border-b-0"
            >
              <StyledTooltip
                content={
                  [
                    s.summary,
                    aliases.length > 0 ? `Also: ${aliases.join(', ')}` : '',
                  ]
                    .filter(Boolean)
                    .join('\n\n') || undefined
                }
                className="w-full"
                maxWidth="20rem"
                side="bottom"
              >
                <button
                  type="button"
                  id={`${listId}-opt-${i}`}
                  role="option"
                  aria-selected={active}
                  className={`w-full px-3 py-2.5 text-left transition-colors ${
                    active
                      ? 'bg-violet-900/45 text-slate-50'
                      : 'text-slate-200 hover:bg-slate-800/90'
                  }`}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(ev) => {
                    ev.preventDefault()
                  }}
                  onClick={() => pick(s)}
                  data-testid={`${testId}-option`}
                >
                  <span className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-start gap-x-3 gap-y-1 sm:grid-cols-[5.25rem_minmax(0,1fr)_auto]">
                    <span className="truncate font-mono text-[13px] font-semibold tracking-tight text-violet-200">
                      {symbol}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-medium leading-snug text-slate-100">
                        {name || '—'}
                      </span>
                    </span>
                    <span className="col-span-2 flex flex-wrap items-center justify-start gap-1 sm:col-span-1 sm:max-w-[14rem] sm:justify-end">
                      {typeLabel ? (
                        <span className="inline-flex max-w-[9rem] shrink-0 truncate rounded border border-violet-800/40 bg-violet-950/40 px-1.5 py-0.5 text-[9px] font-medium text-violet-200/90">
                          {typeLabel}
                        </span>
                      ) : null}
                      {chrLabel ? (
                        <span className="inline-flex shrink-0 rounded border border-slate-700 bg-slate-950/60 px-1.5 py-0.5 font-mono text-[9px] tabular-nums text-slate-400">
                          {chrLabel}
                        </span>
                      ) : null}
                      {s.geneId ? (
                        <span className="inline-flex shrink-0 rounded border border-slate-700 bg-slate-950/60 px-1.5 py-0.5 font-mono text-[9px] tabular-nums text-slate-500">
                          Entrez {s.geneId}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </button>
              </StyledTooltip>
            </li>
          )
        })}
      </ul>,
      document.body,
    )

  return (
    <div
      className={`relative z-50 flex-1 min-w-0 overflow-visible ${className}`}
      ref={containerRef}
    >
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={Boolean(showDropdown)}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          showDropdown && suggestions[highlight]
            ? `${listId}-opt-${highlight}`
            : undefined
        }
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (value.trim().length >= 2) {
            updateMenuRect()
            setOpen(true)
          }
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={
          inputClassName ||
          'w-full rounded-xl border border-slate-600 bg-slate-800 px-5 py-3 pr-16 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
        }
        data-testid={testId}
        autoComplete="off"
        spellCheck={false}
      />
      {loading && (
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500"
          data-testid={`${testId}-loading`}
        >
          Suggesting…
        </span>
      )}
      {dropdown}
    </div>
  )
}
