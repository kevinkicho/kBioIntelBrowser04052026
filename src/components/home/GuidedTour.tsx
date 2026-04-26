'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'guided-tour-dismissed'

interface FeaturedMolecule {
  cid: number
  name: string
  hook: string
}

const FEATURED: FeaturedMolecule[] = [
  {
    cid: 2244,
    name: 'Aspirin',
    hook: '70+ years of clinical history; ongoing trials in cancer prevention.',
  },
  {
    cid: 4091,
    name: 'Metformin',
    hook: 'First-line for type 2 diabetes; under study for aging and longevity.',
  },
  {
    cid: 3672,
    name: 'Ibuprofen',
    hook: 'NSAID with deep safety data and pediatric dosing references.',
  },
  {
    cid: 5291,
    name: 'Imatinib',
    hook: 'First targeted kinase inhibitor; paradigm for precision oncology.',
  },
]

const CATEGORIES_INLINE = [
  { icon: '💊', label: 'Pharma' },
  { icon: '🏥', label: 'Clinical' },
  { icon: '🧪', label: 'Molecular' },
  { icon: '🎯', label: 'Bioactivity' },
  { icon: '🧬', label: 'Structure' },
  { icon: '🧫', label: 'Genomics' },
  { icon: '🔗', label: 'Pathways' },
  { icon: '📚', label: 'Literature' },
]

export function GuidedTour({ searchType }: { searchType: string }) {
  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setMounted(true)
    setDismissed(localStorage.getItem(STORAGE_KEY) === '1')
  }, [])

  function handleDismiss() {
    setDismissed(true)
    localStorage.setItem(STORAGE_KEY, '1')
  }

  if (!mounted || dismissed || searchType !== 'name') return null

  return (
    <div className="w-full max-w-2xl mt-6 bg-slate-800/40 border border-slate-700 rounded-xl px-4 py-3">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-xs text-slate-400 uppercase tracking-wider">
          New here? Start with a curated example
        </p>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss tour"
          className="text-slate-600 hover:text-slate-400 text-sm leading-none px-1"
        >
          ×
        </button>
      </div>

      <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
        Each profile pulls from 110+ public APIs across nine categories:{' '}
        {CATEGORIES_INLINE.map((c, i) => (
          <span key={c.label} className="whitespace-nowrap">
            <span aria-hidden>{c.icon}</span> <span className="text-slate-400">{c.label}</span>
            {i < CATEGORIES_INLINE.length - 1 && <span className="text-slate-700"> · </span>}
          </span>
        ))}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {FEATURED.map(m => (
          <a
            key={m.cid}
            href={`/molecule/${m.cid}`}
            className="group block bg-slate-900/40 border border-slate-700/60 hover:border-indigo-700/60 hover:bg-slate-900/60 rounded-lg px-3 py-2 transition-colors"
          >
            <p className="text-sm font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">
              {m.name}
            </p>
            <p className="text-[11px] text-slate-500 leading-snug mt-1">{m.hook}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
