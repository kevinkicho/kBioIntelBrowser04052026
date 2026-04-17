'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { clientFetch } from '@/lib/clientFetch'

interface GeneResult {
  geneId: string
  symbol: string
  name: string
  summary: string
  chromosome: string
  typeOfGene: string
  aliases: string[]
}

export default function GeneSearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const q = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(q)
  const [results, setResults] = useState<GeneResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const doSearch = useCallback(async (term: string) => {
    if (!term.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await clientFetch(`/api/search/gene?q=${encodeURIComponent(term.trim())}&limit=20`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Search failed')
      }
      const data = await res.json()
      setResults(data.results ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults([])
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }, [])

  useEffect(() => {
    if (q) {
      setQuery(q)
      doSearch(q)
    }
  }, [q, doSearch])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim().length >= 2) {
      router.push(`/gene?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Gene Search</h1>
        <p className="text-slate-400 mb-6">Search for genes by symbol, name, or alias. Data from MyGene.info.</p>

        <form onSubmit={handleSubmit} className="flex gap-3 mb-8">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search a gene (e.g. BRCA1, TP53, EGFR)..."
            className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-5 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={loading || query.trim().length < 2}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl font-medium transition-colors"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-6 text-red-300">
            {error}
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 animate-pulse">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="h-5 bg-slate-700 rounded w-1/4" />
                  <div className="h-5 bg-slate-700 rounded w-16" />
                </div>
                <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
                <div className="h-4 bg-slate-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {searched && !loading && results.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p className="text-lg mb-2">No genes found for &quot;{q}&quot;</p>
            <p className="text-sm">Try a different gene symbol or keyword.</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">{results.length} result{results.length !== 1 ? 's' : ''}</p>
            {results.map(g => (
              <Link
                key={g.geneId}
                href={`/gene/${g.geneId}-${g.symbol}`}
                className="block bg-slate-800/80 border border-slate-700 rounded-xl p-5 hover:border-indigo-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="text-lg font-semibold text-indigo-300">{g.symbol}</span>
                    <span className="ml-2 text-sm text-slate-400">{g.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {g.typeOfGene && (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">{g.typeOfGene}</span>
                    )}
                    {g.chromosome && (
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-800/50">chr {g.chromosome}</span>
                    )}
                  </div>
                </div>

                {g.summary && (
                  <p className="text-sm text-slate-400 mb-2 line-clamp-2">{g.summary}</p>
                )}

                {g.aliases && g.aliases.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {g.aliases.map(a => (
                      <span key={a} className="text-xs px-1.5 py-0.5 rounded bg-slate-700/80 text-slate-400">{a}</span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}