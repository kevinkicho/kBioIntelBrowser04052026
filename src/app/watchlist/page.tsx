'use client'

import { useState, useEffect, useCallback } from 'react'
import { useFavorites } from '@/hooks/useFavorites'
import { WatchlistTable } from '@/components/watchlist/WatchlistTable'
import { clientFetch } from '@/lib/clientFetch'
import {
  buildWatchlistDensity,
  watchlistDensityToCsv,
  type WatchlistDensitySummary,
} from '@/lib/watchlistSummary'
import { downloadFile } from '@/lib/exportData'

interface WatchlistEntry {
  cid: number
  name: string
  summary?: WatchlistDensitySummary
  loading?: boolean
}

export default function WatchlistPage() {
  const { favorites, toggle } = useFavorites()
  const [entries, setEntries] = useState<WatchlistEntry[]>([])

  useEffect(() => {
    setEntries(favorites.map((f) => ({ cid: f.cid, name: f.name, loading: true })))
  }, [favorites])

  const fetchSummary = useCallback(async (cid: number): Promise<WatchlistDensitySummary | null> => {
    try {
      const res = await clientFetch(`/api/molecule/${cid}/category/pharmaceutical`)
      if (!res.ok) return null
      const pharma = (await res.json()) as Record<string, unknown>

      const res2 = await clientFetch(`/api/molecule/${cid}/category/clinical-safety`)
      const clinical = res2.ok ? ((await res2.json()) as Record<string, unknown>) : {}

      const res3 = await clientFetch(`/api/molecule/${cid}/category/research-literature`)
      const research = res3.ok ? ((await res3.json()) as Record<string, unknown>) : {}

      return buildWatchlistDensity({ pharma, clinical, research })
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    if (favorites.length === 0) return

    let cancelled = false
    async function loadAll() {
      for (const fav of favorites) {
        if (cancelled) break
        const summary = await fetchSummary(fav.cid)
        if (cancelled) break
        setEntries((prev) =>
          prev.map((e) =>
            e.cid === fav.cid ? { ...e, summary: summary ?? undefined, loading: false } : e,
          ),
        )
      }
    }
    void loadAll()
    return () => {
      cancelled = true
    }
  }, [favorites, fetchSummary])

  const handleExportCsv = () => {
    const csv = watchlistDensityToCsv(entries)
    const day = new Date().toISOString().slice(0, 10)
    downloadFile(csv, `biointel-watchlist-${day}.csv`, 'text/csv')
  }

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="border-b border-slate-800 px-6 py-4">
        <a href="/" className="text-slate-400 hover:text-slate-200 text-sm">
          ← BioIntel Explorer
        </a>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 mb-2">Watchlist</h1>
            <p className="text-slate-400 text-sm max-w-2xl">
              Solo local favorites with free-API density: trials, sponsors, BLA / biosimilar rows,
              ROR orgs, grants, and multi-jurisdiction register counts. Refreshes on each visit —
              not clinical monitoring.
            </p>
          </div>
          {entries.length > 0 && (
            <button
              type="button"
              onClick={handleExportCsv}
              data-testid="watchlist-export-csv"
              className="rounded-lg border border-emerald-800/40 bg-emerald-900/20 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900/40"
            >
              Export CSV
            </button>
          )}
        </div>

        <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4 sm:p-6">
          <WatchlistTable
            molecules={entries}
            onRemove={(cid) => {
              const mol = favorites.find((f) => f.cid === cid)
              if (mol) toggle(cid, mol.name)
            }}
          />
        </div>

        {entries.length > 0 && (
          <div className="mt-4 text-center">
            <p className="text-[10px] text-slate-600">
              {entries.filter((e) => !e.loading).length}/{entries.length} molecules loaded
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
