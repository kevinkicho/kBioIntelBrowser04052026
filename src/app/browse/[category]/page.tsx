import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCategoryBySlug, CATEGORIES } from '@/lib/data/categories'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

export function generateStaticParams() {
  return Object.keys(CATEGORIES).map((slug) => ({ category: slug }))
}

export default function CategoryPage({ params }: { params: { category: string } }) {
  const category = getCategoryBySlug(params.category)
  if (!category) notFound()

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/" className="text-slate-400 hover:text-slate-200">
            Home
          </Link>
          <span className="text-slate-600">→</span>
          <Link href="/browse" className="text-slate-400 hover:text-slate-200">
            Browse
          </Link>
          <span className="text-slate-600">→</span>
          <span className="text-slate-200">{category.title}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">{category.title}</h1>
        <p className="text-slate-400 mb-2">{category.description}</p>
        <p className="text-[11px] text-slate-600 mb-8">
          Starter queries only — each link resolves live against public APIs (PubChem name). No
          offline mock catalog.
        </p>

        {category.starterQueries.length === 0 ? (
          <p className="text-sm text-slate-500">
            No starter queries configured. Use homepage search for free-text lookup.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {category.starterQueries.map((name) => (
              <StyledTooltip key={name} content={`Live PubChem name lookup: ${name}`} className="w-full">
                <Link
                  href={`/molecule/name/${encodeURIComponent(name)}`}
                  className="block bg-slate-800/50 border border-slate-700 hover:border-indigo-500/50 rounded-lg px-4 py-3 text-center transition-colors"
                >
                  <span className="text-sm text-slate-200 capitalize">{name}</span>
                  <span className="mt-1 block text-[9px] text-slate-600">live lookup</span>
                </Link>
              </StyledTooltip>
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-sm text-slate-500">
          Or{' '}
          <Link href="/" className="text-indigo-400 hover:underline">
            search any name, CID, gene, or disease
          </Link>{' '}
          from the homepage.
        </p>
      </main>
    </div>
  )
}
