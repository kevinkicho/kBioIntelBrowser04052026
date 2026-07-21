'use client'

/**
 * Molecule typeahead for Compare — portaled dropdown (ROR/gene pattern).
 * Live free PubChem/ChEMBL/MyChem via /api/search?type=name — never mock rows.
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
import { clientFetch } from '@/lib/clientFetch'

export interface MoleculeSearchProps {
  label: string
  initialName: string
  onSelect: (name: string, cid: number) => void
  /** Optional slot color accent */
  accent?: 'indigo' | 'emerald' | 'amber' | 'violet' | 'sky'
  testId?: string
  placeholder?: string
  disabled?: boolean
}

interface DropdownRect {
  top: number
  left: number
  width: number
}

const ACCENT: Record<NonNullable<MoleculeSearchProps['accent']>, string> = {
  indigo: 'focus:border-indigo-500 focus:ring-indigo-500/40 border-indigo-800/40',
  emerald: 'focus:border-emerald-500 focus:ring-emerald-500/40 border-emerald-800/40',
  amber: 'focus:border-amber-500 focus:ring-amber-500/40 border-amber-800/40',
  violet: 'focus:border-violet-500 focus:ring-violet-500/40 border-violet-800/40',
  sky: 'focus:border-sky-500 focus:ring-sky-500/40 border-sky-800/40',
}

export function MoleculeSearch({
  label,
  initialName,
  onSelect,
  accent = 'indigo',
  testId = 'molecule-search',
  placeholder = 'Name, CID, or synonym…',
  disabled = false,
}: MoleculeSearchProps) {
  const listId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const skipFetchRef = useRef(false)

  const [query, setQuery] = useState(initialName)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [highlight, setHighlight] = useState(0)
  const [selected, setSelected] = useState(Boolean(initialName))
  const [menuRect, setMenuRect] = useState<DropdownRect | null>(null)
  const [mounted, setMounted] = useState(false)
  const [resolving, setResolving] = useState(false)

  const close = useCallback(() => {
    setOpen(false)
    setHighlight(0)
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setQuery(initialName)
    setSelected(Boolean(initialName))
  }, [initialName])

  const updateMenuRect = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setMenuRect({
      top: r.bottom + 4,
      left: r.left,
      width: Math.max(r.width, Math.min(420, window.innerWidth - 24)),
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
  }, [open, query, suggestions.length, loading, updateMenuRect])

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
    if (selected || query.trim().length < 2) {
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
        // Prefer molecule-only search (not unified disease/gene)
        const res = await clientFetch(
          `/api/search?q=${encodeURIComponent(query.trim())}&type=name`,
          { signal: ac.signal },
        )
        if (ac.signal.aborted) return
        if (!res.ok) {
          setSuggestions([])
          setFetchError(`Search failed (${res.status})`)
          return
        }
        const data = (await res.json()) as {
          suggestions?: string[]
          results?: Array<{ kind?: string; label?: string }>
        }
        let labels: string[] = []
        if (Array.isArray(data.results) && data.results.length > 0) {
          labels = data.results
            .filter((r) => !r.kind || r.kind === 'molecule')
            .map((r) => r.label)
            .filter((x): x is string => Boolean(x))
        } else {
          labels = Array.isArray(data.suggestions) ? data.suggestions : []
        }
        // Pure CID query: offer resolve-as-CID line first
        const asCid = /^\d{1,9}$/.test(query.trim())
        if (asCid) {
          const cidLabel = `CID ${query.trim()}`
          if (!labels.some((l) => l.toLowerCase() === cidLabel.toLowerCase())) {
            labels = [cidLabel, ...labels]
          }
        }
        setSuggestions(labels.slice(0, 12))
        setHighlight(0)
        setOpen(true)
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return
        setSuggestions([])
        setFetchError(e instanceof Error ? e.message : 'Search failed')
        setOpen(true)
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    }, 200)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [query, selected])

  async function resolveAndSelect(name: string) {
    setResolving(true)
    setOpen(false)
    setQuery(name)
    setSelected(true)
    skipFetchRef.current = true
    try {
      // CID-only pick
      const cidOnly = /^CID\s+(\d+)$/i.exec(name.trim()) || /^(\d{1,9})$/.exec(name.trim())
      if (cidOnly) {
        const cid = parseInt(cidOnly[1]!, 10)
        const res = await clientFetch(`/api/search/resolve?cid=${cid}`)
        if (res.ok) {
          const data = (await res.json()) as { name?: string; cid?: number }
          onSelect(data.name || name, data.cid ?? cid)
          setQuery(data.name || name)
          return
        }
        onSelect(name, cid)
        return
      }
      const res = await clientFetch(
        `/api/search/resolve?name=${encodeURIComponent(name)}&type=name`,
      )
      if (res.ok) {
        const data = (await res.json()) as { name?: string; cid?: number }
        if (data.cid) {
          onSelect(data.name || name, data.cid)
          if (data.name) setQuery(data.name)
          return
        }
      }
      setFetchError('Could not resolve to a PubChem CID')
      setSelected(false)
    } catch {
      setFetchError('Resolve failed')
      setSelected(false)
    } finally {
      setResolving(false)
    }
  }

  function pick(name: string) {
    void resolveAndSelect(name)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (open && suggestions.length > 0 && suggestions[highlight]) {
        pick(suggestions[highlight]!)
        return
      }
      const q = query.trim()
      if (q.length >= 2) void resolveAndSelect(q)
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

  const showDropdown = open && query.trim().length >= 2 && !selected && mounted && menuRect

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
        className="max-h-80 overflow-y-auto rounded-lg border border-slate-600 bg-slate-900 shadow-2xl shadow-black/60"
        data-testid={`${testId}-dropdown`}
      >
        <li className="sticky top-0 z-[1] border-b border-slate-800 bg-slate-900 px-3 py-1.5 text-[9px] uppercase tracking-wide text-slate-500">
          Molecule suggestions · PubChem / free APIs
          {loading ? ' · loading…' : suggestions.length ? ` · ${suggestions.length}` : ''}
        </li>
        {fetchError && (
          <li className="px-3 py-2 text-[11px] text-amber-300/90" role="status">
            {fetchError}
          </li>
        )}
        {!loading && !fetchError && suggestions.length === 0 && (
          <li className="px-3 py-3 text-[11px] text-slate-500" role="status">
            No molecule matches for “{query.trim()}”. Try a drug name or PubChem CID.
          </li>
        )}
        {suggestions.map((s, i) => {
          const active = i === highlight
          const isCid = /^CID\s+\d+$/i.test(s) || /^\d{1,9}$/.test(s)
          return (
            <li key={`${s}-${i}`} role="presentation" className="border-b border-slate-800/60 last:border-0">
              <button
                type="button"
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={active}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                  active ? 'bg-indigo-900/50 text-slate-50' : 'text-slate-200 hover:bg-slate-800'
                }`}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => pick(s)}
                data-testid={`${testId}-option`}
              >
                <span className="min-w-0 flex-1 truncate font-medium">{s}</span>
                <span
                  className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                    isCid
                      ? 'border-cyan-800/50 text-cyan-300'
                      : 'border-indigo-800/50 text-indigo-300'
                  }`}
                >
                  {isCid ? 'CID' : 'Name'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>,
      document.body,
    )

  return (
    <div className="relative min-w-0" ref={containerRef} data-testid={testId}>
      {label ? (
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={Boolean(showDropdown)}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            showDropdown && suggestions[highlight] ? `${listId}-opt-${highlight}` : undefined
          }
          value={query}
          disabled={disabled || resolving}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelected(false)
            setFetchError(null)
          }}
          onFocus={() => {
            if (!selected && query.trim().length >= 2) {
              updateMenuRect()
              setOpen(true)
            }
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={`w-full rounded-lg border bg-slate-950 px-3 py-2 pr-16 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 ${ACCENT[accent]}`}
          autoComplete="off"
          spellCheck={false}
          data-testid={`${testId}-input`}
        />
        {(loading || resolving) && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
            {resolving ? 'Resolving…' : 'Suggesting…'}
          </span>
        )}
      </div>
      {fetchError && selected === false && !open && (
        <p className="mt-1 text-[10px] text-amber-400/90">{fetchError}</p>
      )}
      {dropdown}
    </div>
  )
}
