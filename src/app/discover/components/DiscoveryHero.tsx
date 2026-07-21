'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { clientFetch } from '@/lib/clientFetch'
import { DiscoverAlgorithmGuide } from '@/components/discovery/DiscoverAlgorithmGuide'
import { PrefTooltip } from '@/components/discovery/PrefTooltip'

interface Props {
  onSearch: (query: string, opts?: { diseaseId?: string }) => void
  isLoading: boolean
  initialQuery?: string
}

const EXAMPLE_DISEASES = [
  'Alzheimer disease',
  'Type 2 diabetes',
  'Breast cancer',
  'Hypertension',
  'Melanoma',
  'Asthma',
  'Rheumatoid arthritis',
  'Parkinson disease',
]

export type DiseaseSuggestion = {
  id: string
  name: string
  description?: string
  therapeuticAreas?: string[]
  source?: string
}

/**
 * Discover landing search — disease typeahead from public DBs (Open Targets / Orphanet via /api/search/disease).
 */
export function DiscoveryHero({ onSearch, isLoading, initialQuery = '' }: Props) {
  const [query, setQuery] = useState(initialQuery)
  const [suggestions, setSuggestions] = useState<DiseaseSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loadingSuggest, setLoadingSuggest] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  /**
   * Typeahead only after the user types in the field.
   * History / URL / example chips set the query without enabling suggestions
   * (avoids a surprise dropdown when reopening a search-history session).
   */
  const typeaheadEnabled = useRef(false)

  function closeSuggestions() {
    setOpen(false)
    setSuggestions([])
    setActiveIndex(-1)
    setLoadingSuggest(false)
  }

  // Sync when URL / search-history deep-link changes — no dropdown
  useEffect(() => {
    typeaheadEnabled.current = false
    setQuery(initialQuery)
    closeSuggestions()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only when initialQuery changes
  }, [initialQuery])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const fetchSuggestions = useCallback(async (term: string) => {
    if (!typeaheadEnabled.current) {
      closeSuggestions()
      return
    }
    if (term.trim().length < 2) {
      setSuggestions([])
      setOpen(false)
      setLoadingSuggest(false)
      return
    }
    setLoadingSuggest(true)
    try {
      const res = await clientFetch(
        `/api/search/disease?q=${encodeURIComponent(term.trim())}&limit=10`,
      )
      // History/URL may have disabled typeahead while this request was in flight
      if (!typeaheadEnabled.current) {
        closeSuggestions()
        return
      }
      if (!res.ok) {
        setSuggestions([])
        setOpen(false)
        return
      }
      const data = await res.json()
      const list = (data.results ?? []) as DiseaseSuggestion[]
      setSuggestions(list)
      setOpen(list.length > 0)
      setActiveIndex(-1)
    } catch {
      setSuggestions([])
      setOpen(false)
    } finally {
      setLoadingSuggest(false)
    }
  }, [])

  useEffect(() => {
    if (isLoading) {
      closeSuggestions()
      return
    }
    if (!typeaheadEnabled.current) {
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(query)
    }, 280)
    return () => clearTimeout(debounceRef.current)
  }, [query, isLoading, fetchSuggestions])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed.length < 2) return
    typeaheadEnabled.current = false
    closeSuggestions()
    // Prefer highlighted / first suggestion id when name matches closely
    const match =
      (activeIndex >= 0 && suggestions[activeIndex]) ||
      suggestions.find((s) => s.name.toLowerCase() === trimmed.toLowerCase())
    onSearch(match?.name || trimmed, match?.id ? { diseaseId: match.id } : undefined)
  }

  function pickSuggestion(s: DiseaseSuggestion) {
    typeaheadEnabled.current = false
    setQuery(s.name)
    closeSuggestions()
    onSearch(s.name, s.id ? { diseaseId: s.id } : undefined)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (e.key === 'Escape') setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) {
      e.preventDefault()
      pickSuggestion(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  // Keep active option in view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return
    const el = listRef.current.children[activeIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  return (
    <div className="text-center mb-10">
      <h1 className="text-4xl font-bold text-slate-100 mb-3 tracking-tight">
        Discover Candidate Molecules
      </h1>
      <p className="text-slate-400 mb-2 max-w-3xl mx-auto leading-relaxed text-[15px] sm:text-base">
        Disease → targets → ranked small molecules from free public databases. Transparent
        multi-axis scores you can reweight — not a black-box model.
        <PrefTooltip
          eventKey="discover_hero"
          text="Pipeline: confirm disease → identify targets → gather candidates (ChEMBL, trials, Open Targets) → resolve PubChem identity → weighted multi-axis score. Optional safety/novelty harvest. LLMs never invent ranks."
        />
      </p>
      <p className="text-[11px] text-slate-600 mb-4 max-w-3xl mx-auto">
        Expect a shortlist with source honesty, identity trust, and deep links into molecule
        profiles. Not regulatory advice.
      </p>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto mb-4">
        <div className="relative" ref={containerRef}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  // Only user keystrokes enable typeahead (not history/URL sync)
                  typeaheadEnabled.current = true
                  setQuery(e.target.value)
                }}
                onFocus={() => {
                  // Do not open a stale list on focus after history restore
                  if (typeaheadEnabled.current && suggestions.length > 0) setOpen(true)
                }}
                onKeyDown={onKeyDown}
                placeholder="What disease are you investigating?"
                className="w-full px-5 py-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-base"
                disabled={isLoading}
                minLength={2}
                autoComplete="off"
                role="combobox"
                aria-expanded={open}
                aria-controls="discover-disease-suggestions"
                aria-autocomplete="list"
                aria-activedescendant={
                  activeIndex >= 0 ? `discover-disease-opt-${activeIndex}` : undefined
                }
                data-testid="discover-disease-input"
              />
              {loadingSuggest && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
                  Searching…
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || query.trim().length < 2}
              className="px-6 py-3 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-colors shrink-0"
            >
              {isLoading ? 'Searching...' : 'Discover'}
            </button>
          </div>

          {open && suggestions.length > 0 && (
            <ul
              ref={listRef}
              id="discover-disease-suggestions"
              role="listbox"
              className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-indigo-500/40 bg-slate-900 shadow-xl shadow-black/40"
              data-testid="discover-disease-suggestions"
            >
              {suggestions.map((s, i) => (
                <li key={`${s.id}-${s.name}`} role="option" aria-selected={i === activeIndex}>
                  <button
                    type="button"
                    id={`discover-disease-opt-${i}`}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => pickSuggestion(s)}
                    className={`w-full px-4 py-2.5 text-left transition-colors ${
                      i === activeIndex
                        ? 'bg-indigo-900/40 text-indigo-100'
                        : 'text-slate-200 hover:bg-slate-800/80'
                    }`}
                    data-testid={`discover-disease-suggestion-${s.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{s.name}</span>
                      <span className="shrink-0 font-mono text-[10px] text-cyan-500/80">
                        {s.id}
                      </span>
                    </div>
                    {s.description && (
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                        {s.description}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {s.source && (
                        <span className="text-[9px] uppercase tracking-wide text-slate-600">
                          {s.source}
                        </span>
                      )}
                      {(s.therapeuticAreas ?? []).slice(0, 3).map((area) => (
                        <span
                          key={area}
                          className="rounded-full border border-indigo-800/40 bg-indigo-900/20 px-1.5 py-0.5 text-[9px] text-indigo-300/90"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="mt-2 text-left text-[10px] text-slate-600">
          Suggestions from free public disease sources (e.g. Open Targets, Orphanet). Pick one or press
          Discover with free text.
        </p>
      </form>

      <div className="mt-1">
        <p className="mb-2 text-[10px] uppercase tracking-wide text-slate-600">
          Try a live public disease query
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {EXAMPLE_DISEASES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                typeaheadEnabled.current = false
                setQuery(d)
                closeSuggestions()
                onSearch(d)
              }}
              disabled={isLoading}
              className="text-xs px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-indigo-300 hover:border-indigo-600/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={`Rank candidates for ${d} using free public APIs and your rubric`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-4 max-w-3xl text-left">
        <DiscoverAlgorithmGuide variant="hero" />
      </div>
    </div>
  )
}
