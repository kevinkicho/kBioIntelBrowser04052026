'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { clientFetch } from '@/lib/clientFetch'
import {
  GeneSearchSuggest,
  type GeneSuggestion,
} from '@/components/search/GeneSearchSuggest'
import { recordSearch } from '@/lib/searchHistory'

interface GeneResult {
  geneId: string
  symbol: string
  name: string
  summary: string
  chromosome: string
  typeOfGene: string
  aliases: string[]
}

function geneHref(g: { geneId: string; symbol: string }) {
  const id = g.geneId || g.symbol
  const sym = g.symbol || g.geneId
  return `/gene/${encodeURIComponent(`${id}-${sym}`)}`
}

function GeneSearchInner() {
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
      const res = await clientFetch(
        `/api/search/gene?q=${encodeURIComponent(term.trim())}&limit=20`,
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Search failed')
      }
      const data = (await res.json()) as { results?: GeneResult[] }
      setResults(data.results ?? [])
      recordSearch({
        kind: 'gene',
        query: term.trim(),
        title: term.trim(),
        href: `/gene?q=${encodeURIComponent(term.trim())}`,
      })
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
      void doSearch(q)
    }
  }, [q, doSearch])

  function runQuery(term: string) {
    const t = term.trim()
    if (t.length < 2) return
    router.push(`/gene?q=${encodeURIComponent(t)}`)
  }

  function pickSuggestion(s: GeneSuggestion) {
    recordSearch({
      kind: 'gene',
      query: s.symbol || s.name,
      title: s.symbol || s.name,
      href: geneHref(s),
    })
    router.push(geneHref(s))
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="page-canvas max-w-4xl">
        <h1 className="text-2xl font-bold mb-1 sm:text-3xl">Gene Search</h1>
        <p className="text-[13px] text-slate-400 mb-6">
          Search by symbol, name, or alias. Typeahead uses free MyGene.info — not clinical
          decision support.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            runQuery(query)
          }}
          className="relative z-30 mb-8 flex flex-col gap-2 overflow-visible sm:flex-row sm:items-start"
        >
          <GeneSearchSuggest
            value={query}
            onChange={setQuery}
            disabled={loading}
            onSelectSuggestion={pickSuggestion}
            onSubmitQuery={runQuery}
          />
          <button
            type="submit"
            disabled={loading || query.trim().length < 2}
            className="shrink-0 rounded-xl bg-indigo-600 px-6 py-3 font-medium transition-colors hover:bg-indigo-500 disabled:opacity-50"
            data-testid="gene-search-submit"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>
        <p className="mb-6 -mt-4 text-[10px] text-slate-600">
          Type 2+ characters for live suggestions. Arrow keys + Enter to open a gene; free text
          Search for a full result list.
        </p>

        {error && (
          <div
            className="mb-6 rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300"
            role="alert"
          >
            {error}
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-slate-700 bg-slate-800/80 p-4"
              >
                <div className="mb-2 h-4 w-1/4 rounded bg-slate-700" />
                <div className="h-3 w-3/4 rounded bg-slate-700" />
              </div>
            ))}
          </div>
        )}

        {searched && !loading && results.length === 0 && (
          <div className="py-12 text-center text-slate-500 opacity-30">
            <p className="mb-1 text-base">No genes found for “{q || query}”</p>
            <p className="text-sm">Try a different symbol or keyword.</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] text-slate-500">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
            <ul
              className="divide-y divide-slate-800/80 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40"
              data-testid="gene-search-results"
            >
              {results.map((g) => (
                <li key={g.geneId || g.symbol}>
                  <Link
                    href={geneHref(g)}
                    className="block px-3 py-2.5 hover:bg-slate-800/50 sm:px-4"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-[13px] font-semibold text-violet-300">
                        {g.symbol}
                      </span>
                      <span className="text-[12px] text-slate-400">{g.name}</span>
                      {g.typeOfGene && (
                        <span className="rounded border border-slate-700 px-1 py-px text-[9px] text-slate-500">
                          {g.typeOfGene}
                        </span>
                      )}
                      {g.chromosome && (
                        <span className="rounded border border-emerald-800/40 px-1 py-px text-[9px] text-emerald-400/90">
                          chr {g.chromosome}
                        </span>
                      )}
                      {g.geneId && (
                        <span className="font-mono text-[9px] text-slate-600">
                          Entrez {g.geneId}
                        </span>
                      )}
                    </div>
                    {g.summary && (
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">
                        {g.summary}
                      </p>
                    )}
                    {(() => {
                      const aliasList = Array.isArray(g.aliases)
                        ? g.aliases
                        : typeof g.aliases === 'string' && g.aliases
                          ? [g.aliases]
                          : []
                      if (aliasList.length === 0) return null
                      return (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {aliasList.map((a) => (
                            <span
                              key={a}
                              role="link"
                              tabIndex={0}
                              className="cursor-pointer rounded border border-slate-700/50 bg-slate-800/60 px-1.5 py-px text-[10px] text-slate-500 hover:border-violet-700/50 hover:text-violet-300"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                router.push(`/gene?q=${encodeURIComponent(a)}`)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  router.push(`/gene?q=${encodeURIComponent(a)}`)
                                }
                              }}
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      )
                    })()}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  )
}

export default function GeneSearchPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 px-4 py-8 text-sm text-slate-400">
          <div className="page-canvas max-w-4xl">Loading gene search…</div>
        </main>
      }
    >
      <GeneSearchInner />
    </Suspense>
  )
}
