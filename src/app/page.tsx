'use client'

import { useState, useCallback } from 'react'
import { SearchBar } from '@/components/search/SearchBar'
import { AdvancedSearchPanel } from '@/components/search/AdvancedSearchPanel'
import { API_IDENTIFIER_CONFIGS, API_PARAMETERS, type SearchType, type ApiIdentifierType, type ApiParamValue } from '@/lib/apiIdentifiers'
import { FavoritesBar } from '@/components/home/FavoritesBar'
import { AIBanner } from '@/components/ai/AIBanner'
import { AIStatusIndicator } from '@/components/ai/AIStatusIndicator'

const EXAMPLE_SEARCHES = [
  'insulin', 'aspirin', 'metformin', 'caffeine', 'penicillin', 'amylase', 'doxorubicin', 'glucose'
]

const NAV_LINKS = [
  { href: '/browse', label: 'Browse by Category', color: 'slate' },
  { href: '/gene', label: 'Gene Search', color: 'slate' },
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
  return <HomePageContent />
}

function HomePageContent() {
  const [isNavigating, setIsNavigating] = useState(false)
  const [searchType, setSearchType] = useState<SearchType>('name')
  const [apiOverrides, setApiOverrides] = useState<Record<string, ApiIdentifierType>>({})
  const [apiParams, setApiParams] = useState<Record<string, ApiParamValue>>({})
  const handleNavigating = useCallback((navigating: boolean) => setIsNavigating(navigating), [])

  function handleApiOverride(panelId: string, idType: ApiIdentifierType) {
    setApiOverrides(prev => {
      const next = { ...prev }
      const config = API_IDENTIFIER_CONFIGS.find(c => c.panelId === panelId)
      if (idType === config?.defaultType) {
        delete next[panelId]
      } else {
        next[panelId] = idType
      }
      return next
    })
  }

  function handleApiParamChange(panelId: string, param: string, value: string | number | boolean) {
    setApiParams(prev => {
      const next = { ...prev }
      const paramDef = API_PARAMETERS[panelId]?.find(p => p.key === param)
      if (!next[panelId]) next[panelId] = {}
      if (value === paramDef?.default) {
        delete next[panelId][param]
        if (Object.keys(next[panelId]).length === 0) delete next[panelId]
      } else {
        next[panelId][param] = value
      }
      return next
    })
  }

  function handleReset() {
    setApiOverrides({})
    setApiParams({})
  }

  return (
    <main className={`min-h-screen flex flex-col items-center justify-center px-4 py-16 transition-opacity ${isNavigating ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="text-center mb-12 max-w-3xl">
        <h1 className="text-5xl font-bold text-slate-100 mb-4 tracking-tight flex items-center justify-center gap-3">
          BioIntel Explorer
          <AIStatusIndicator />
        </h1>
        <p className="text-xl text-slate-400 mb-2">
          The commercial and scientific landscape of biological molecules.
        </p>
        <p className="text-slate-500">
          Search any molecule, drug, enzyme, or gene — see who makes it, how it&apos;s synthesized, and what products it&apos;s in.
        </p>
      </div>

      <AIBanner />

      <div className="flex flex-col items-center w-full max-w-2xl">
        <SearchBar onNavigating={handleNavigating} searchType={searchType} apiOverrides={apiOverrides} apiParams={apiParams} />
        <AdvancedSearchPanel
          searchType={searchType}
          onSearchTypeChange={setSearchType}
          apiOverrides={apiOverrides}
          onApiOverrideChange={handleApiOverride}
          onResetOverrides={handleReset}
          onResetParams={() => setApiParams({})}
          apiParams={apiParams}
          onApiParamChange={handleApiParamChange}
        />
      </div>

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

      <footer className="mt-16 pb-6 text-xs text-slate-600 text-center px-4">
        Data sourced from PubChem, openFDA, KEGG, Rhea, USPTO, ClinicalTrials.gov, NIH Reporter, SEC EDGAR, ChEMBL, UniProt, Open Targets, and other free public databases.
        Built for open science. Not for clinical use.
      </footer>
    </main>
  )
}