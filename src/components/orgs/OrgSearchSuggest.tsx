'use client'

/**
 * Debounced dropdown typeahead for universities / colleges / research labs.
 * Live free APIs only (via /api/orgs/suggest) — never mock rows.
 * Dropdown is portaled to document.body so parent overflow / stacking cannot clip it.
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
  autoFocus?: boolean
}

interface DropdownRect {
  top: number
  left: number
  width: number
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
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<OrgSuggestion[]>([])
  const [highlight, setHighlight] = useState(0)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [menuRect, setMenuRect] = useState<DropdownRect | null>(null)
  const [mounted, setMounted] = useState(false)
  /** Skip fetch right after programmatic select */
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
    setMenuRect({
      top: r.bottom + 4,
      left: r.left,
      width: Math.max(r.width, 280),
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updateMenuRect()
    // Throttle scroll/resize to one layout read per frame (capture scroll is hot)
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
      // Open panel while loading so the user sees activity
      setOpen(true)
      try {
        const params = new URLSearchParams({ q, limit: '12' })
        if (country) params.set('country', country)
        const res = await fetch(`/api/orgs/suggest?${params.toString()}`, {
          signal: ac.signal,
          headers: { Accept: 'application/json' },
        })
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean
          suggestions?: OrgSuggestion[]
          error?: string
        }
        if (ac.signal.aborted) return
        if (!res.ok) {
          setSuggestions([])
          setFetchError(data.error || `Suggest failed (${res.status})`)
          setOpen(true)
          return
        }
        const rows = Array.isArray(data.suggestions) ? data.suggestions : []
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
      // Abort in-flight suggest when query/country changes or unmount
      abortRef.current?.abort()
    }
  }, [value, country])

  function pick(s: OrgSuggestion) {
    skipFetchRef.current = true
    onChange(s.name)
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
    if (!open) return
    if (suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((i) => Math.min(suggestions.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      const s = suggestions[highlight]
      if (s) pick(s)
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
          zIndex: 9999,
        }}
        className="max-h-80 overflow-y-auto rounded-lg border border-slate-600 bg-slate-900 shadow-2xl shadow-black/60"
        data-testid={`${testId}-dropdown`}
      >
        <li className="sticky top-0 z-[1] border-b border-slate-800 bg-slate-900 px-3 py-1.5 text-[9px] uppercase tracking-wide text-slate-500">
          Live suggestions · ROR · Scorecard · OpenAlex
          {loading ? ' · loading…' : suggestions.length ? ` · ${suggestions.length}` : ''}
        </li>
        {fetchError && (
          <li className="px-3 py-2 text-[11px] text-amber-300/90" role="status">
            {fetchError}
          </li>
        )}
        {!loading && !fetchError && suggestions.length === 0 && (
          <li className="px-3 py-3 text-[11px] text-slate-500" role="status">
            No matches for “{value.trim()}”. Try a shorter name or another country filter.
          </li>
        )}
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
                    ? 'bg-emerald-900/50 text-slate-50'
                    : 'text-slate-200 hover:bg-slate-800'
                }`}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(ev) => {
                  // Prevent input blur before click registers
                  ev.preventDefault()
                }}
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
        onChange={(e) => {
          onChange(e.target.value)
        }}
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
          'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 pr-16 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none'
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
