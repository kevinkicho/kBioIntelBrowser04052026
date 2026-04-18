'use client'

import { useState } from 'react'

interface Props {
  onSearch: (query: string) => void
  isLoading: boolean
  initialQuery?: string
}

const EXAMPLE_DISEASES = [
  'Alzheimer disease', 'Type 2 diabetes', 'Breast cancer',
  'Hypertension', 'Melanoma', 'Asthma',
  'Rheumatoid arthritis', 'Parkinson disease',
]

export function DiscoveryHero({ onSearch, isLoading, initialQuery = '' }: Props) {
  const [query, setQuery] = useState(initialQuery)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed.length >= 2) {
      onSearch(trimmed)
    }
  }

  return (
    <div className="text-center mb-10">
      <h1 className="text-4xl font-bold text-slate-100 mb-3 tracking-tight">
        Discover Candidate Molecules
      </h1>
      <p className="text-slate-400 mb-8 max-w-2xl mx-auto">
        Enter a disease to find and rank drug candidates based on clinical evidence, genetic associations, and therapeutic potential.
      </p>

      <form onSubmit={handleSubmit} className="max-w-xl mx-auto mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What disease are you investigating?"
            className="flex-1 px-5 py-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-base"
            disabled={isLoading}
            minLength={2}
          />
          <button
            type="submit"
            disabled={isLoading || query.trim().length < 2}
            className="px-6 py-3 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-colors"
          >
            {isLoading ? 'Searching...' : 'Discover'}
          </button>
        </div>
      </form>

      <div className="flex flex-wrap justify-center gap-2">
        {EXAMPLE_DISEASES.map(d => (
          <button
            key={d}
            onClick={() => { setQuery(d); onSearch(d) }}
            disabled={isLoading}
            className="text-xs px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-indigo-300 hover:border-indigo-600/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  )
}