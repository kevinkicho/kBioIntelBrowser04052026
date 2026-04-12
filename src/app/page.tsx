'use client'

import { useState, useCallback } from 'react'
import { SearchBar } from '@/components/search/SearchBar'
import { FavoritesBar } from '@/components/home/FavoritesBar'

const EXAMPLE_SEARCHES = [
  'insulin', 'aspirin', 'metformin', 'caffeine', 'penicillin', 'amylase', 'doxorubicin', 'glucose'
]

const NAV_LINKS = [
  { href: '/browse', label: 'Browse by Category', color: 'slate' },
  { href: '/compare', label: 'Compare Molecules', color: 'slate' },
  { href: '/interactions', label: 'Interaction Checker', color: 'slate' },
  { href: '/batch', label: 'Batch Lookup', color: 'slate' },
  { href: '/analytics', label: 'API Analytics', color: 'emerald' },
  { href: '/watchlist', label: 'Watchlist', color: 'amber' },
]

function LinkChip({ href, label, color, disabled }: { href: string; label: string; color: string; disabled: boolean }) {
  const base = 'text-sm px-4 py-2 rounded-lg transition-colors border'
  const disabledClass = 'opacity-50 cursor-not-allowed pointer-events-none'
  const colorClasses = color === 'emerald'
    ? 'text-emerald-400 hover:text-emerald-300 bg-emerald-900/20 border-emerald-800/40'
    : color === 'amber'
      ? 'text-amber-400 hover:text-amber-300 bg-amber-900/20 border-amber-800/40'
      : 'text-slate-400 hover:text-slate-200 bg-slate-800/50 border-slate-700'

  if (disabled) {
    return <span className={`${base} ${colorClasses} ${disabledClass}`}>{label}</span>
  }
  return <a href={href} className={`${base} ${colorClasses}`}>{label}</a>
}

function ChipLink({ href, label, disabled }: { href: string; label: string; disabled: boolean }) {
  const base = 'text-sm px-3 py-1 rounded-full transition-colors'
  const disabledClass = 'opacity-50 cursor-not-allowed pointer-events-none bg-indigo-900/20 border border-indigo-800/40 text-indigo-300'
  const activeClass = 'text-indigo-400 hover:text-indigo-300 bg-indigo-900/20 border border-indigo-800/40'

  if (disabled) {
    return <span className={`${base} ${disabledClass}`}>{label}</span>
  }
  return <a href={href} className={`${base} ${activeClass}`}>{label}</a>
}

export default function HomePage() {
  const [isNavigating, setIsNavigating] = useState(false)
  const handleNavigating = useCallback((navigating: boolean) => setIsNavigating(navigating), [])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center mb-12 max-w-3xl">
        <h1 className="text-5xl font-bold text-slate-100 mb-4 tracking-tight">
          BioIntel Explorer
        </h1>
        <p className="text-xl text-slate-400 mb-2">
          The commercial and scientific landscape of biological molecules.
        </p>
        <p className="text-slate-500">
          Search any molecule, drug, enzyme, or gene — see who makes it, how it&apos;s synthesized, and what products it&apos;s in.
        </p>
      </div>

      <SearchBar onNavigating={handleNavigating} />

      <FavoritesBar />

      <div className="mt-8 text-center">
        <p className="text-xs text-slate-600 uppercase tracking-wider mb-3">Try searching for</p>
        <div className="flex flex-wrap justify-center gap-2">
          {EXAMPLE_SEARCHES.map(s => (
            <ChipLink
              key={s}
              href={`/molecule/name/${encodeURIComponent(s)}`}
              label={s}
              disabled={isNavigating}
            />
          ))}
        </div>
      </div>

      <div className="mt-12 flex gap-4">
        {NAV_LINKS.map(link => (
          <LinkChip
            key={link.href}
            href={link.href}
            label={link.label}
            color={link.color}
            disabled={isNavigating}
          />
        ))}
      </div>

      <footer className="absolute bottom-6 text-xs text-slate-600 text-center px-4">
        Data sourced from PubChem, openFDA, KEGG, Rhea, USPTO, ClinicalTrials.gov, NIH Reporter, SEC EDGAR, ChEMBL, UniProt, Open Targets, and other free public databases.
        Built for open science. Not for clinical use.
      </footer>
    </main>
  )
}