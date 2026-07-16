'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { clientFetch } from '@/lib/clientFetch'
import { type SearchType, type ApiIdentifierType, type ApiParamValue } from '@/lib/apiIdentifiers'

interface SearchBarProps {
  onNavigating?: (navigating: boolean) => void
  searchType?: SearchType
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

function buildSearchParams(searchType: SearchType, apiOverrides?: Record<string, ApiIdentifierType>, apiParams?: Record<string, ApiParamValue>): string {
  const params = new URLSearchParams()
  if (searchType !== 'name') params.set('searchType', searchType)
  if (apiOverrides && Object.keys(apiOverrides).length > 0) {
    params.set('overrides', JSON.stringify(apiOverrides))
  }
  if (apiParams && Object.keys(apiParams).filter(k => Object.keys(apiParams[k]).length > 0).length > 0) {
    const filtered: Record<string, ApiParamValue> = {}
    for (const [k, v] of Object.entries(apiParams)) {
      if (Object.keys(v).length > 0) filtered[k] = v
    }
    if (Object.keys(filtered).length > 0) params.set('params', JSON.stringify(filtered))
  }
  const s = params.toString()
  return s ? `?${s}` : ''
}

export function SearchBar({ onNavigating, searchType = 'name', apiOverrides, apiParams }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggestionsAreDiseases, setSuggestionsAreDiseases] = useState(false)
  const [suggestionsAreGenes, setSuggestionsAreGenes] = useState(false)
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
      setSuggestions([])
      setSuggestionsAreDiseases(false)
      setSuggestionsAreGenes(false)
      setIsOpen(false)
      return
    }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await clientFetch(`/api/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(searchType)}`)
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data.suggestions ?? [])
          setSuggestionsAreDiseases(data.searchType === 'disease')
          setSuggestionsAreGenes(data.searchType === 'gene')
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

  function goToCid(cid: number) {
    setCandidates(null)
    router.push(`/molecule/${cid}${buildSearchParams(searchType, apiOverrides, apiParams)}`)
  }

  async function handleSelect(name: string) {
    if (isNavigating) return
    setIsNavigating(true)
    setIsOpen(false)
    setSuggestions([])
    setQuery(name)
    setCandidates(null)

    if (searchType === 'disease') {
      router.push(`/disease?q=${encodeURIComponent(name)}`)
      return
    }

    if (searchType === 'gene') {
      if (name.includes('-') && /^\d+-/.test(name)) {
        router.push(`/gene/${encodeURIComponent(name)}`)
      } else {
        router.push(`/gene?q=${encodeURIComponent(name)}`)
      }
      return
    }

    if (searchType === 'cid' && /^\d+$/.test(name.replace('CID ', ''))) {
      const cid = parseInt(name.replace('CID ', ''), 10)
      if (cid > 0) {
        goToCid(cid)
        return
      }
    }

    try {
      const res = await clientFetch(`/api/search/resolve?name=${encodeURIComponent(name)}&type=${encodeURIComponent(searchType)}`)
      if (res.ok) {
        const data = await res.json()

        // Gene symbol without compound hit → gene explorer
        if (data.gene && data.geneSymbol) {
          router.push(`/gene?q=${encodeURIComponent(data.geneSymbol)}`)
          return
        }

        // Multiple PubChem CIDs — show disambiguation (salt/parent/isomer)
        if (data.needsDisambiguation && Array.isArray(data.candidates) && data.candidates.length > 1) {
          setCandidates(data.candidates)
          setIsNavigating(false)
          return
        }

        if (data.cid) {
          goToCid(data.cid)
          return
        }
      }
    } catch {}

    if (searchType === 'cid') {
      const cid = parseInt(query, 10)
      if (cid > 0) {
        goToCid(cid)
        return
      }
    }

    router.push(`/molecule/name/${encodeURIComponent(name)}${buildSearchParams(searchType, apiOverrides, apiParams)}`)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && query.trim().length >= 2) {
      handleSelect(query.trim())
    }
  }

  const placeholders: Record<SearchType, string> = {
    name: 'Search a molecule, drug, enzyme, or gene...',
    cid: 'Enter a PubChem CID number...',
    cas: 'Enter a CAS Registry Number (e.g. 50-78-2)...',
    smiles: 'Enter a SMILES string...',
    inchikey: 'Enter an InChIKey (e.g. RYXSWKPIZGBOPP-UHFFFAOYSA-N)...',
    inchi: 'Enter an InChI string...',
    formula: 'Enter a molecular formula (e.g. C9H8O4)...',
    disease: 'Search a disease or condition (e.g. diabetes)...',
    gene: 'Search a gene symbol or name (e.g. BRCA1, TP53)...',
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => {
            if (!isNavigating) {
              setQuery(e.target.value)
              setCandidates(null)
            }
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0 && !isNavigating) setIsOpen(true) }}
          placeholder={placeholders[searchType]}
          disabled={isNavigating}
          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-5 py-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
            <p className="text-xs font-medium text-indigo-300">Multiple PubChem matches — pick the correct structure</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Salts, hydrates, and stereoisomers can have different CIDs</p>
          </div>
          <ul className="max-h-72 overflow-y-auto">
            {candidates.map((c) => (
              <li key={c.cid}>
                <button
                  onClick={() => {
                    setIsNavigating(true)
                    goToCid(c.cid)
                  }}
                  className="w-full text-left px-4 py-3 text-slate-200 hover:bg-slate-700 transition-colors border-b border-slate-700/50 last:border-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{c.name}</span>
                    <span className="font-mono text-[10px] text-cyan-400/80 shrink-0">CID {c.cid}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] text-slate-500 font-mono">
                    {c.formula && <span>{c.formula}</span>}
                    {c.molecularWeight > 0 && <span>{c.molecularWeight.toFixed(2)} g/mol</span>}
                    {c.inchiKey && <span className="truncate max-w-[200px]" title={c.inchiKey}>{c.inchiKey}</span>}
                  </div>
                </button>
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

      {isOpen && suggestions.length > 0 && !candidates && (
        <ul className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-xl overflow-hidden z-50 shadow-xl">
          {suggestions.map(s => (
            <li key={s}>
              <button
                onClick={() => handleSelect(s)}
                disabled={isNavigating}
                className="w-full text-left px-5 py-3 text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {suggestionsAreDiseases && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-900/60 text-rose-300 border border-rose-700/50 shrink-0">DISEASE</span>
                )}
                {suggestionsAreGenes && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-900/60 text-violet-300 border border-violet-700/50 shrink-0">GENE</span>
                )}
                <span>{s}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
