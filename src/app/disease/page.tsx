'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { clientFetch } from '@/lib/clientFetch'
import { AICopilot } from '@/components/ai/AICopilot'
import type { CategoryId } from '@/lib/categoryConfig'
import type { CategoryLoadState } from '@/lib/fetchCategory'
import { deduplicateMolecules } from '@/lib/diseaseSearch'
import Link from 'next/link'

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

interface DiseaseResult {
  id: string
  name: string
  description?: string
  therapeuticAreas?: string[]
  source: string
  molecules?: { name: string; cid: number | null }[]
}

export default function DiseasePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const q = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(q)
  const [results, setResults] = useState<DiseaseResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const [fetchedTime, setFetchedTime] = useState<Date | null>(null)

  const doSearch = useCallback(async (term: string) => {
    if (!term.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await clientFetch(`/api/search/disease?q=${encodeURIComponent(term.trim())}&limit=15`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Search failed')
      }
      const data = await res.json()
      setResults(data.results ?? [])
      setFetchedTime(new Date())
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
      router.push(`/disease?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const categoryData = useMemo<Partial<Record<CategoryId, Record<string, unknown>>>>(() => {
    if (!results.length) return {}
    return {
      'genomics-disease': {
        diseaseResults: results,
        searchQuery: q,
        sources: Array.from(new Set(results.map(r => r.source))),
        totalResults: results.length,
      },
    }
  }, [results, q])

  const categoryStatus = useMemo<Record<CategoryId, CategoryLoadState>>(() => {
    const status: Record<string, CategoryLoadState> = {}
    const allIds: CategoryId[] = [
      'pharmaceutical', 'clinical-safety', 'molecular-chemical', 'bioactivity-targets',
      'protein-structure', 'genomics-disease', 'interactions-pathways', 'research-literature', 'nih-high-impact',
    ]
    for (const id of allIds) {
      status[id] = id === 'genomics-disease' && results.length > 0 ? 'loaded' : 'idle'
    }
    return status as Record<CategoryId, CategoryLoadState>
  }, [results.length])

  const fetchedAt = useMemo<Partial<Record<CategoryId, Date>>>(() => {
    if (!fetchedTime) return {}
    return { 'genomics-disease': fetchedTime }
  }, [fetchedTime])

  const identity = useMemo(() => ({
    name: q || 'Disease Search',
    cid: q ? hashString(q) : 0,
  }), [q])

  const allMolecules = useMemo(() => deduplicateMolecules(results), [results])

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Disease / Condition Search</h1>
        <p className="text-slate-400 mb-6">Find diseases and discover molecules that target them.</p>

        <form onSubmit={handleSubmit} className="flex gap-3 mb-8">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search a disease or condition (e.g. diabetes, hypertension, melanoma)..."
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
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 animate-pulse">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="h-5 bg-slate-700 rounded w-2/5" />
                <div className="h-5 bg-slate-700 rounded w-16" />
              </div>
              <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
              <div className="h-4 bg-slate-700 rounded w-1/2" />
            </div>
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 animate-pulse">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="h-5 bg-slate-700 rounded w-1/3" />
                <div className="h-5 bg-slate-700 rounded w-20" />
              </div>
              <div className="h-4 bg-slate-700 rounded w-2/3 mb-2" />
              <div className="h-4 bg-slate-700 rounded w-2/5" />
            </div>
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 animate-pulse">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="h-5 bg-slate-700 rounded w-1/2" />
                <div className="h-5 bg-slate-700 rounded w-14" />
              </div>
              <div className="h-4 bg-slate-700 rounded w-3/5 mb-2" />
            </div>
          </div>
        )}

        {searched && !loading && results.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p className="text-lg mb-2">No diseases found for &quot;{q}&quot;</p>
            <p className="text-sm">Try a different term or check the spelling.</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">{results.length} result{results.length !== 1 ? 's' : ''}</p>
            {results.map(r => (
              <DiseaseCard key={`${r.source}-${r.id}`} result={r} />
            ))}

            {allMolecules.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-slate-100 mb-1">Related Molecules</h2>
                <p className="text-sm text-slate-400 mb-4">{allMolecules.length} candidate molecule{allMolecules.length !== 1 ? 's' : ''} found across all results</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allMolecules.map(m => (
                    m.cid ? (
                      <Link
                        key={`m-${m.cid}`}
                        href={`/molecule/${m.cid}`}
                        className="block bg-slate-800/80 border border-emerald-800/40 hover:border-emerald-500 rounded-xl p-4 transition-colors group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-emerald-300 group-hover:text-emerald-200 truncate">{m.name}</span>
                          <span className="text-[10px] text-slate-500 ml-2 whitespace-nowrap">CID {m.cid}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {m.sources.length > 0 && m.sources.map(s => (
                            <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/80 text-slate-400">{s}</span>
                          ))}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-400 border border-emerald-800/40">View &#8594;</span>
                        </div>
                      </Link>
                    ) : (
                      <div
                        key={`m-${m.name}`}
                        className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-slate-400 truncate">{m.name}</span>
                          <span className="text-[10px] text-slate-600 ml-2 whitespace-nowrap">No CID</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {m.sources.length > 0 && m.sources.map(s => (
                            <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/80 text-slate-500">{s}</span>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AICopilot
        categoryData={categoryData}
        categoryStatus={categoryStatus}
        fetchedAt={fetchedAt}
        identity={identity}
      />
    </main>
  )
}

function DiseaseCard({ result }: { result: DiseaseResult }) {
  const detailHref = `/disease/${encodeURIComponent(result.id)}?source=${encodeURIComponent(result.source)}&q=${encodeURIComponent(result.name)}`

  return (
    <Link
      href={detailHref}
      className="block bg-slate-800/80 border border-slate-700 rounded-xl p-5 hover:border-indigo-600 transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h2 className="text-lg font-semibold text-slate-100">{result.name}</h2>
        <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 whitespace-nowrap">{result.source}</span>
      </div>

      {result.description && (
        <p className="text-sm text-slate-400 mb-3 line-clamp-2">{result.description}</p>
      )}

      {result.therapeuticAreas && result.therapeuticAreas.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {result.therapeuticAreas.map(ta => (
            <span key={ta} className="text-xs px-2 py-0.5 rounded-full bg-indigo-900/40 text-indigo-300 border border-indigo-800/50">{ta}</span>
          ))}
        </div>
      )}

      {result.molecules && result.molecules.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Associated Molecules</p>
          <div className="flex flex-wrap gap-2">
            {result.molecules.map(m => (
              m.cid ? (
                <span
                  key={m.cid}
                  className="text-sm px-3 py-1.5 rounded-lg bg-emerald-900/30 text-emerald-300 border border-emerald-800/50"
                  onClick={e => e.stopPropagation()}
                >
                  <Link href={`/molecule/${m.cid}`} onClick={e => e.stopPropagation()}>
                    {m.name}
                  </Link>
                </span>
              ) : (
                <span key={m.name} className="text-sm px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-400">
                  {m.name}
                </span>
              )
            ))}
          </div>
        </div>
      )}
    </Link>
  )
}