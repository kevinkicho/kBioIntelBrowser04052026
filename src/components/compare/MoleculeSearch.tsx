'use client'

import { useState, useEffect, useRef } from 'react'
import { clientFetch } from '@/lib/clientFetch'

interface MoleculeSearchProps {
  label: string
  value: string
  onSelect: (name: string, cid: number) => void
}

export function MoleculeSearch({ label, value, onSelect }: MoleculeSearchProps) {
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await clientFetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data.suggestions ?? [])
          setIsOpen(true)
        }
      } catch {}
    }, 300)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  async function handleSelect(name: string) {
    setIsOpen(false)
    setQuery(name)
    try {
      const res = await clientFetch(`/api/search/resolve?name=${encodeURIComponent(name)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.cid) {
          onSelect(name, data.cid)
          return
        }
      }
    } catch {}
  }

  return (
    <div className="relative">
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search molecule..."
        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
      />
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg overflow-hidden z-50 shadow-xl">
          {suggestions.map(s => (
            <li key={s}>
              <button
                onClick={() => handleSelect(s)}
                className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
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
