'use client'

import { useState, useCallback, useEffect } from 'react'
import { clientFetch } from '@/lib/clientFetch'
import { exportMatchesToCsv } from '@/lib/hypothesis/csv'
import { downloadFile } from '@/lib/exportData'
import {
  listSavedHypotheses,
  saveHypothesis,
} from '@/lib/hypothesis/savedHypotheses'
import type { Filter, Hypothesis, IntersectedMatch } from '@/lib/hypothesis/types'
import { FilterSlot } from '@/components/hypothesis/FilterSlot'
import { ResultCard } from '@/components/hypothesis/ResultCard'
import { SavedHypotheses } from '@/components/hypothesis/SavedHypotheses'

interface ApiResponse {
  filters: Filter[]
  perFilterCounts: number[]
  matches: IntersectedMatch[]
}

const DEFAULT_FILTERS: Filter[] = [
  { axis: 'targets-gene', value: '' },
  { axis: 'indicated-for', value: '' },
]

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; data: ApiResponse }
  | { kind: 'error'; message: string }

export function HypothesisClient() {
  const [filters, setFilters] = useState<Filter[]>(DEFAULT_FILTERS)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [saved, setSaved] = useState<Hypothesis[]>([])
  const [saveName, setSaveName] = useState('')
  const [saveOpen, setSaveOpen] = useState(false)

  useEffect(() => {
    setSaved(listSavedHypotheses())
  }, [])

  const allValid = filters.every(f => f.value.trim().length > 0)

  const handleSubmit = useCallback(async () => {
    if (!allValid) return
    setStatus({ kind: 'loading' })
    setSaveOpen(false)
    try {
      const res = await clientFetch('/api/hypothesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? data.message ?? `Request failed (${res.status})`)
      }
      const data = (await res.json()) as ApiResponse
      setStatus({ kind: 'success', data })
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Request failed',
      })
    }
  }, [allValid, filters])

  const handleSaveSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = saveName.trim()
      if (!trimmed) return
      saveHypothesis(trimmed, filters)
      setSaved(listSavedHypotheses())
      setSaveName('')
      setSaveOpen(false)
    },
    [saveName, filters],
  )

  const handleLoad = useCallback((h: Hypothesis) => {
    setFilters(h.filters.length >= 2 ? h.filters : DEFAULT_FILTERS)
    setStatus({ kind: 'idle' })
  }, [])

  const handleExport = useCallback(() => {
    if (status.kind !== 'success') return
    const csv = exportMatchesToCsv(status.data.matches)
    const stamp = new Date().toISOString().slice(0, 10)
    downloadFile(csv, `hypothesis-${stamp}.csv`, 'text/csv')
  }, [status])

  const isLoading = status.kind === 'loading'
  const matches = status.kind === 'success' ? status.data.matches : []
  const perFilterCounts =
    status.kind === 'success' ? status.data.perFilterCounts : []

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2 tracking-tight">
            Hypothesis Builder
          </h1>
          <p className="text-slate-400 text-sm">
            Stack two filters to find molecules that match all of them — e.g.
            molecules that target EGFR <em>and</em> have a Phase 3 trial.
          </p>
        </header>

        <SavedHypotheses
          hypotheses={saved}
          onLoad={handleLoad}
          onChange={() => setSaved(listSavedHypotheses())}
        />

        <div className="space-y-3 mb-4">
          {filters.map((f, i) => (
            <FilterSlot
              key={i}
              index={i}
              filter={f}
              disabled={isLoading}
              onChange={updated =>
                setFilters(prev => prev.map((cur, idx) => (idx === i ? updated : cur)))
              }
            />
          ))}
        </div>

        <div className="flex items-center gap-3 mb-8">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allValid || isLoading}
            className="px-5 py-2.5 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-colors"
          >
            {isLoading ? 'Searching…' : 'Find matches'}
          </button>
          {!allValid && (
            <span className="text-xs text-slate-500">
              Fill in both filters to search
            </span>
          )}
        </div>

        {isLoading && (
          <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5 mb-6 flex items-center gap-3">
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
            <span className="text-sm text-slate-300">
              Searching across {filters.length} axes…
            </span>
          </div>
        )}

        {status.kind === 'error' && (
          <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-semibold text-red-400 mb-1">Search Failed</h3>
            <p className="text-sm text-red-300/70">{status.message}</p>
          </div>
        )}

        {status.kind === 'success' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  {matches.length} matching molecule{matches.length === 1 ? '' : 's'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Per-filter pool sizes: {perFilterCounts.join(' / ')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSaveOpen(o => !o)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/40 text-xs font-medium text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
                >
                  Save hypothesis
                </button>
                {matches.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExport}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/40 text-xs font-medium text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    CSV
                  </button>
                )}
              </div>
            </div>

            {saveOpen && (
              <form
                onSubmit={handleSaveSubmit}
                className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 mb-4 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder="Name this hypothesis…"
                  autoFocus
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!saveName.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setSaveOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </form>
            )}

            {matches.length === 0 ? (
              <div className="text-center py-12 px-4 bg-slate-900/40 border border-slate-700/40 rounded-xl">
                <div className="text-4xl mb-3">∅</div>
                <h3 className="text-base font-semibold text-slate-300 mb-1">
                  No molecules match all filters
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Try a broader gene, a more common disease, or a different ATC
                  code prefix. Some filter pools above may be empty.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {matches.map((m, i) => (
                  <ResultCard key={m.cid} match={m} rank={i + 1} />
                ))}
              </div>
            )}
          </>
        )}

        {status.kind === 'idle' && (
          <div className="text-center py-10 text-slate-600">
            <p className="text-sm">
              Choose two filter axes, fill in values, then click <em>Find matches</em>.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
