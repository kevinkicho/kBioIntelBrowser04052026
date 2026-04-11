'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { clientFetch } from '@/lib/clientFetch'

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await clientFetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data.suggestions ?? [])
          setIsOpen(true)
        }
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  async function handleSelect(name: string) {
    if (isNavigating) return
    setIsNavigating(true)
    setIsOpen(false)
    setSuggestions([])
    setQuery(name)
    try {
      const res = await clientFetch(`/api/search/resolve?name=${encodeURIComponent(name)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.cid) {
          router.push(`/molecule/${data.cid}`)
          return
        }
      }
    } catch {}
    router.push(`/molecule/name/${encodeURIComponent(name)}`)
  }

  return (
    <div className="relative w-full max-w-2xl" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => { if (!isNavigating) setQuery(e.target.value) }}
          onFocus={() => { if (suggestions.length > 0 && !isNavigating) setIsOpen(true) }}
          placeholder="Search a molecule, drug, enzyme, or gene..."
          disabled={isNavigating}
          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-5 py-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {(isLoading || isNavigating) && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-xl overflow-hidden z-50 shadow-xl">
          {suggestions.map(s => (
            <li key={s}>
              <button
                onClick={() => handleSelect(s)}
                disabled={isNavigating}
                className="w-full text-left px-5 py-3 text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}