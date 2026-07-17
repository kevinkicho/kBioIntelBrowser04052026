import Link from 'next/link'
import { CATEGORIES } from '@/lib/data/categories'

const CATEGORY_COLORS: Record<string, string> = {
  therapeutics: 'border-blue-700/40 hover:border-blue-500/60',
  enzymes: 'border-emerald-700/40 hover:border-emerald-500/60',
  diagnostics: 'border-amber-700/40 hover:border-amber-500/60',
  reagents: 'border-purple-700/40 hover:border-purple-500/60',
  industrial: 'border-orange-700/40 hover:border-orange-500/60',
}

export default function BrowsePage() {
  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="border-b border-slate-800 px-6 py-4">
        <Link href="/" className="text-slate-400 hover:text-slate-200 text-sm">
          ← BioIntel Explorer
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Browse by Category</h1>
        <p className="text-slate-400 mb-2">
          Category hubs with <strong className="text-slate-300 font-medium">live public lookups</strong>{' '}
          — not a local product catalog or mock inventory.
        </p>
        <p className="text-slate-500 text-sm mb-8">
          Starter names open PubChem name resolution. Empty results mean the public API returned
          nothing for that query.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(CATEGORIES).map(([slug, category]) => (
            <Link
              key={slug}
              href={`/browse/${slug}`}
              className={`block bg-slate-800/50 border rounded-xl p-6 transition-colors ${CATEGORY_COLORS[slug] ?? 'border-slate-700'}`}
            >
              <h2 className="text-lg font-semibold text-slate-100 mb-1">{category.title}</h2>
              <p className="text-sm text-slate-400 mb-3">{category.description}</p>
              <span className="text-xs text-slate-500">
                {category.starterQueries.length} live starter quer
                {category.starterQueries.length === 1 ? 'y' : 'ies'}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
