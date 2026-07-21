'use client'

/**
 * Debounced dropdown typeahead for universities / colleges / research labs.
 * Live free APIs only (via /api/orgs/suggest) — never mock rows.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import {
  orgSuggestSourceLabel,
  type OrgSuggestion,
} from '@/lib/orgs/orgSuggest'

export interface OrgSearchSuggestProps {
  value: string
  onChange: (value: string) => void
  /** Country filter forwarded to suggest API (ISO2). */
  country?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  inputClassName?: string
  testId?: string
  /** Called when user picks a suggestion (fills field; parent may run pipeline). */
  onSelectSuggestion?: (suggestion: OrgSuggestion) => void
  /** Auto-run parent search after select (default true via onSelectSuggestion). */
  autoFocus?: boolean
}

export function OrgSearchSuggest({
  value,
  onChange,
  country = '',
  placeholder = 'e.g. Harvard, Karolinska, Pasteur, Mayo…',
  disabled = false,
  className = '',
  inputClassName = '',
  testId = 'orgs-search-input',
  onSelectSuggestion,
  autoFocus = false,
}: OrgSearchSuggestProps) {
  const listId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<OrgSuggestion[]>([])
  const [highlight, setHighlight] = useState(0)
  /** Skip fetch right after programmatic select */
  const skipFetchRef = useRef(false)

  const close = useCallback(() => {
    setOpen(false)
    setHighlight(0)
  }, [])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close()
      }
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
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      setLoading(true)
      try {
        const params = new URLSearchParams({ q, limit: '12' })
        if (country) params.set('country', country)
        const res = await fetch(`/api/orgs/suggest?${params.toString()}`, {
          signal: ac.signal,
        })
        const data = (await res.json()) as {
          ok?: boolean
          suggestions?: OrgSuggestion[]
        }
        if (ac.signal.aborted) return
        const rows = data.suggestions ?? []
        setSuggestions(rows)
        setOpen(rows.length > 0)
        setHighlight(0)
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return
        setSuggestions([])
        setOpen(false)
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    }, 280)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value, country])

  function pick(s: OrgSuggestion) {
    skipFetchRef.current = true
    onChange(s.name)
    setSuggestions([])
    close()
    onSelectSuggestion?.(s)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (e.key === 'Escape') close()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((i) => Math.min(suggestions.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' && open) {
      // Let form submit if no highlight interaction — but prefer pick when open
      e.preventDefault()
      const s = suggestions[highlight]
      if (s) pick(s)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }

  return (
    <div className={`relative flex-1 min-w-0 ${className}`} ref={containerRef}>
      <input
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && suggestions[highlight] ? `${listId}-opt-${highlight}` : undefined
        }
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(e) => {
          onChange(e.target.value)
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true)
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={
          inputClassName ||
          'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none'
        }
        data-testid={testId}
        autoComplete="off"
      />
      {loading && (
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500"
          data-testid={`${testId}-loading`}
        >
          Suggesting…
        </span>
      )}
      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-xl"
          data-testid={`${testId}-dropdown`}
        >
          <li className="sticky top-0 border-b border-slate-800 bg-slate-900/95 px-3 py-1.5 text-[9px] uppercase tracking-wide text-slate-500">
            Live suggestions · ROR · Scorecard · OpenAlex
          </li>
          {suggestions.map((s, i) => {
            const active = i === highlight
            return (
              <li key={s.id} role="presentation">
                <button
                  type="button"
                  id={`${listId}-opt-${i}`}
                  role="option"
                  aria-selected={active}
                  className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition-colors ${
                    active
                      ? 'bg-emerald-900/40 text-slate-50'
                      : 'text-slate-200 hover:bg-slate-800'
                  }`}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(s)}
                  data-testid={`${testId}-option`}
                >
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{s.name}</span>
                    <span
                      className={`rounded border px-1 py-px text-[9px] font-semibold uppercase ${
                        s.source === 'ror'
                          ? 'border-violet-800/50 text-violet-300'
                          : s.source === 'college'
                            ? 'border-sky-800/50 text-sky-300'
                            : 'border-amber-800/50 text-amber-300'
                      }`}
                    >
                      {orgSuggestSourceLabel(s.source)}
                    </span>
                  </span>
                  {s.meta && (
                    <span className="text-[10px] text-slate-500 line-clamp-1">{s.meta}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
