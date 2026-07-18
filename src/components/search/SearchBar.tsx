'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { clientFetch } from '@/lib/clientFetch'
import {
  type SearchType,
  type ApiIdentifierType,
  type ApiParamValue,
} from '@/lib/apiIdentifiers'
import { recordSearch } from '@/lib/searchHistory'

export type UnifiedSearchHit = {
  kind: 'disease' | 'molecule' | 'gene'
  label: string
  geneKey?: string
}

interface SearchBarProps {
  onNavigating?: (navigating: boolean) => void
  /**
   * `all` (default) — fan-out disease + molecule + gene.
   * Other types keep advanced chemical/disease/gene-only behavior.
   */
  searchType?: SearchType | 'all'
  apiOverrides?: Record<string, ApiIdentifierType>
  apiParams?: Record<string, ApiParamValue>
}

interface MoleculeCandidate {
  cid: number
  name: string
  formula: string
  molecularWeight: number
  inchiKey: string
  iupacName: string
}

function buildSearchParams(
  searchType: SearchType | 'all',
  apiOverrides?: Record<string, ApiIdentifierType>,
  apiParams?: Record<string, ApiParamValue>,
): string {
  const params = new URLSearchParams()
  if (searchType !== 'name' && searchType !== 'all') params.set('searchType', searchType)
  if (apiOverrides && Object.keys(apiOverrides).length > 0) {
    params.set('overrides', JSON.stringify(apiOverrides))
  }
  if (
    apiParams &&
    Object.keys(apiParams).filter((k) => Object.keys(apiParams[k]).length > 0).length > 0
  ) {
    const filtered: Record<string, ApiParamValue> = {}
    for (const [k, v] of Object.entries(apiParams)) {
      if (Object.keys(v).length > 0) filtered[k] = v
    }
    if (Object.keys(filtered).length > 0) params.set('params', JSON.stringify(filtered))
  }
  const s = params.toString()
  return s ? `?${s}` : ''
}

const KIND_BADGE: Record<
  UnifiedSearchHit['kind'],
  { label: string; className: string }
> = {
  disease: {
    label: 'DISEASE',
    className: 'bg-rose-900/60 text-rose-300 border-rose-700/50',
  },
  molecule: {
    label: 'MOLECULE',
    className: 'bg-cyan-900/60 text-cyan-300 border-cyan-700/50',
  },
  gene: {
    label: 'GENE',
    className: 'bg-violet-900/60 text-violet-300 border-violet-700/50',
  },
}

export function SearchBar({
  onNavigating,
  searchType = 'all',
  apiOverrides,
  apiParams,
}: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<UnifiedSearchHit[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [candidates, setCandidates] = useState<MoleculeCandidate[] | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    onNavigating?.(isNavigating)
  }, [isNavigating, onNavigating])

  useEffect(() => {
    if (query.length < 2) {
      setHits([])
      setIsOpen(false)
      return
    }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const type = searchType === 'all' ? 'all' : searchType
        const res = await clientFetch(
          `/api/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}`,
        )
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.results) && data.results.length > 0) {
            setHits(data.results as UnifiedSearchHit[])
          } else {
            // Legacy flat suggestions → treat as molecules (or gene/disease from searchType)
            const kind: UnifiedSearchHit['kind'] =
              data.searchType === 'disease'
                ? 'disease'
                : data.searchType === 'gene'
                  ? 'gene'
                  : 'molecule'
            const labels: string[] = data.suggestions ?? []
            setHits(
              labels.map((label) => ({
                kind,
                label,
                geneKey: kind === 'gene' ? label : undefined,
              })),
            )
          }
          setIsOpen(true)
        }
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(debounceRef.current)
  }, [query, searchType])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setCandidates(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  function goToCid(cid: number, title?: string) {
    setCandidates(null)
    const molType = searchType === 'all' ? 'name' : searchType
    const href = `/molecule/${cid}${buildSearchParams(molType, apiOverrides, apiParams)}`
    recordSearch({
      kind: 'molecule',
      query: title || String(cid),
      title: title || `CID ${cid}`,
      href,
      meta: { cid },
    })
    router.push(href)
  }

  async function handleSelectHit(hit: UnifiedSearchHit) {
    if (isNavigating) return
    setIsNavigating(true)
    setIsOpen(false)
    setHits([])
    setQuery(hit.label)
    setCandidates(null)

    if (hit.kind === 'disease') {
      const href = `/disease?q=${encodeURIComponent(hit.label)}`
      recordSearch({ kind: 'disease', query: hit.label, title: hit.label, href })
      router.push(href)
      return
    }

    if (hit.kind === 'gene') {
      const key = hit.geneKey || hit.label
      const href =
        key.includes('-') && /^\d+-/.test(key)
          ? `/gene/${encodeURIComponent(key)}`
          : `/gene?q=${encodeURIComponent(hit.label)}`
      recordSearch({ kind: 'gene', query: hit.label, title: hit.label, href })
      router.push(href)
      return
    }

    // Molecule (or free-text Enter)
    await resolveMolecule(hit.label)
  }

  async function resolveMolecule(name: string) {
    if (searchType === 'cid' && /^\d+$/.test(name.replace('CID ', ''))) {
      const cid = parseInt(name.replace('CID ', ''), 10)
      if (cid > 0) {
        goToCid(cid)
        return
      }
    }

    const resolveType =
      searchType === 'all' || searchType === 'disease' || searchType === 'gene'
        ? 'name'
        : searchType

    try {
      const res = await clientFetch(
        `/api/search/resolve?name=${encodeURIComponent(name)}&type=${encodeURIComponent(resolveType)}`,
      )
      if (res.ok) {
        const data = await res.json()

        if (data.gene && data.geneSymbol) {
          const href = `/gene?q=${encodeURIComponent(data.geneSymbol)}`
          recordSearch({
            kind: 'gene',
            query: data.geneSymbol,
            title: data.geneSymbol,
            href,
          })
          router.push(href)
          return
        }

        // Pathway / ontology ID mistaken for a molecule (e.g. WP1220)
        if (data.unsupportedId) {
          setIsNavigating(false)
          setIsOpen(false)
          window.alert(
            data.message ||
              `"${name}" is a pathway/ontology id, not a molecule or gene. Try a chemical name, CID, or gene symbol.`,
          )
          return
        }

        if (data.needsDisambiguation && Array.isArray(data.candidates) && data.candidates.length > 1) {
          setCandidates(data.candidates)
          setIsNavigating(false)
          return
        }

        if (data.cid) {
          goToCid(data.cid, data.name || name)
          return
        }
      }
    } catch {
      /* fall through */
    }

    if (searchType === 'cid') {
      const cid = parseInt(query, 10)
      if (cid > 0) {
        goToCid(cid)
        return
      }
    }

    const molType = searchType === 'all' ? 'name' : searchType
    const href = `/molecule/name/${encodeURIComponent(name)}${buildSearchParams(molType, apiOverrides, apiParams)}`
    recordSearch({ kind: 'molecule', query: name, title: name, href })
    router.push(href)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && query.trim().length >= 2) {
      // Prefer first hit if dropdown is open; else free-text resolve as molecule
      if (isOpen && hits.length > 0) {
        void handleSelectHit(hits[0]!)
      } else {
        void handleSelectHit({ kind: 'molecule', label: query.trim() })
      }
    }
  }

  const placeholder =
    searchType === 'all'
      ? 'Search disease, molecule, or gene…'
      : searchType === 'disease'
        ? 'Search a disease or condition…'
        : searchType === 'gene'
          ? 'Search a gene symbol…'
          : searchType === 'cid'
            ? 'Enter a PubChem CID…'
            : searchType === 'cas'
              ? 'Enter a CAS number…'
              : 'Search a molecule, drug, or formula…'

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            if (!isNavigating) {
              setQuery(e.target.value)
              setCandidates(null)
            }
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (hits.length > 0 && !isNavigating) setIsOpen(true)
          }}
          placeholder={placeholder}
          disabled={isNavigating}
          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-5 py-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="unified-search-input"
        />
        {(isLoading || isNavigating) && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {candidates && candidates.length > 1 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-indigo-500/40 rounded-xl overflow-hidden z-50 shadow-xl">
          <div className="px-4 py-2 border-b border-slate-700 bg-slate-900/80">
            <p className="text-xs font-medium text-indigo-300">
              Multiple PubChem matches — pick the correct structure
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Salts, hydrates, and stereoisomers can have different CIDs
            </p>
          </div>
          <ul className="max-h-72 overflow-y-auto">
            {candidates.map((c) => (
              <li key={c.cid} className="border-b border-slate-700/50 last:border-0">
                <div className="flex items-stretch">
                  <button
                    onClick={() => {
                      setIsNavigating(true)
                      goToCid(c.cid, c.name)
                    }}
                    className="min-w-0 flex-1 text-left px-4 py-3 text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{c.name}</span>
                      <span className="font-mono text-[10px] text-cyan-400/80 shrink-0">
                        CID {c.cid}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] text-slate-500 font-mono">
                      {c.formula && <span>{c.formula}</span>}
                      {c.molecularWeight > 0 && (
                        <span>{c.molecularWeight.toFixed(2)} g/mol</span>
                      )}
                      {c.inchiKey && (
                        <span className="truncate max-w-[200px]" title={c.inchiKey}>
                          {c.inchiKey}
                        </span>
                      )}
                    </div>
                  </button>
                  <a
                    href={`/molecule/${c.cid}`}
                    className="shrink-0 self-center mr-3 text-[10px] text-indigo-400 hover:text-indigo-300"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Open →
                  </a>
                </div>
              </li>
            ))}
          </ul>
          <button
            onClick={() => setCandidates(null)}
            className="w-full text-center text-[10px] text-slate-500 py-2 hover:text-slate-300 border-t border-slate-700"
          >
            Cancel
          </button>
        </div>
      )}

      {isOpen && hits.length > 0 && !candidates && (
        <ul
          className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-xl overflow-hidden z-50 shadow-xl max-h-80 overflow-y-auto"
          data-testid="unified-search-results"
        >
          {(['disease', 'molecule', 'gene'] as const).map((kind) => {
            const group = hits.filter((h) => h.kind === kind)
            if (group.length === 0) {
              // While loading, show honest empty gene strip so the section is visible
              if (kind === 'gene' && isLoading) {
                return (
                  <li
                    key="gene-loading"
                    className="px-5 py-2 text-[10px] text-slate-600 border-b border-slate-700/40"
                    data-testid="search-gene-loading"
                  >
                    GENE · looking up symbols…
                  </li>
                )
              }
              if (kind === 'gene' && !isLoading && hits.length > 0) {
                return (
                  <li
                    key="gene-empty"
                    className="px-5 py-2 text-[10px] text-slate-600 border-b border-slate-700/40"
                    data-testid="search-gene-empty"
                  >
                    GENE · no symbol matches for this query
                  </li>
                )
              }
              return null
            }
            return (
              <li key={`group-${kind}`} className="list-none">
                <div className="px-5 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-900/60 border-b border-slate-700/40 sticky top-0">
                  {KIND_BADGE[kind].label}
                  <span className="ml-1 font-normal text-slate-600">({group.length})</span>
                </div>
                <ul>
                  {group.map((hit, i) => {
                    const badge = KIND_BADGE[hit.kind]
                    return (
                      <li key={`${hit.kind}:${hit.geneKey || hit.label}:${i}`}>
                        <button
                          onClick={() => void handleSelectHit(hit)}
                          disabled={isNavigating}
                          className="w-full text-left px-5 py-3 text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0 ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                          <span>{hit.label}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
