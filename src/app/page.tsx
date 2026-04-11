import { SearchBar } from '@/components/search/SearchBar'
import { FavoritesBar } from '@/components/home/FavoritesBar'

const EXAMPLE_SEARCHES = [
  'insulin', 'aspirin', 'metformin', 'caffeine', 'penicillin', 'amylase', 'doxorubicin', 'glucose'
]

export default function HomePage() {
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

      <SearchBar />

      <FavoritesBar />

      <div className="mt-8 text-center">
        <p className="text-xs text-slate-600 uppercase tracking-wider mb-3">Try searching for</p>
        <div className="flex flex-wrap justify-center gap-2">
          {EXAMPLE_SEARCHES.map(s => (
            <a
              key={s}
              href={`/molecule/name/${encodeURIComponent(s)}`}
              className="text-sm text-indigo-400 hover:text-indigo-300 bg-indigo-900/20 border border-indigo-800/40 px-3 py-1 rounded-full transition-colors"
            >
              {s}
            </a>
          ))}
        </div>
      </div>

      <div className="mt-12 flex gap-4">
        <a
          href="/browse"
          className="text-sm text-slate-400 hover:text-slate-200 bg-slate-800/50 border border-slate-700 px-4 py-2 rounded-lg transition-colors"
        >
          Browse by Category
        </a>
        <a
          href="/compare"
          className="text-sm text-slate-400 hover:text-slate-200 bg-slate-800/50 border border-slate-700 px-4 py-2 rounded-lg transition-colors"
        >
          Compare Molecules
        </a>
        <a
          href="/interactions"
          className="text-sm text-slate-400 hover:text-slate-200 bg-slate-800/50 border border-slate-700 px-4 py-2 rounded-lg transition-colors"
        >
          Interaction Checker
        </a>
        <a
          href="/batch"
          className="text-sm text-slate-400 hover:text-slate-200 bg-slate-800/50 border border-slate-700 px-4 py-2 rounded-lg transition-colors"
        >
          Batch Lookup
        </a>
        <a
          href="/analytics"
          className="text-sm text-emerald-400 hover:text-emerald-300 bg-emerald-900/20 border border-emerald-800/40 px-4 py-2 rounded-lg transition-colors"
        >
          API Analytics
        </a>
        <a
          href="/watchlist"
          className="text-sm text-amber-400 hover:text-amber-300 bg-amber-900/20 border border-amber-800/40 px-4 py-2 rounded-lg transition-colors"
        >
          Watchlist
        </a>
      </div>

      <footer className="absolute bottom-6 text-xs text-slate-600 text-center px-4">
        Data sourced from PubChem, openFDA, KEGG, Rhea, USPTO, ClinicalTrials.gov, NIH Reporter, SEC EDGAR, ChEMBL, UniProt, Open Targets, and other free public databases.
        Built for open science. Not for clinical use.
      </footer>
    </main>
  )
}
