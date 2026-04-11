'use client'

import { useState, useEffect, useCallback } from 'react'
import { useFavorites } from '@/hooks/useFavorites'
import { WatchlistTable } from '@/components/watchlist/WatchlistTable'
import { clientFetch } from '@/lib/clientFetch'

interface MoleculeSummary {
  approvedProducts: number
  activeTrials: number
  adverseEvents: number
  patents: number
  publications: number
}

interface WatchlistEntry {
  cid: number
  name: string
  summary?: MoleculeSummary
  loading?: boolean
}

export default function WatchlistPage() {
  const { favorites, toggle } = useFavorites()
  const [entries, setEntries] = useState<WatchlistEntry[]>([])

  // Initialize entries from favorites
  useEffect(() => {
    setEntries(favorites.map(f => ({ cid: f.cid, name: f.name, loading: true })))
  }, [favorites])

  // Fetch summary data for each molecule
  const fetchSummary = useCallback(async (cid: number): Promise<MoleculeSummary | null> => {
    try {
      const res = await clientFetch(`/api/molecule/${cid}/category/pharmaceutical`)
      if (!res.ok) return null
      const pharma = await res.json()

      const res2 = await clientFetch(`/api/molecule/${cid}/category/clinical-safety`)
      const clinical = res2.ok ? await res2.json() : {}

      const res3 = await clientFetch(`/api/molecule/${cid}/category/research-literature`)
      const research = res3.ok ? await res3.json() : {}

      return {
        approvedProducts: Array.isArray(pharma.companies) ? pharma.companies.length : 0,
        activeTrials: Array.isArray(clinical.clinicalTrials) ? clinical.clinicalTrials.length : 0,
        adverseEvents: Array.isArray(clinical.adverseEvents) ? clinical.adverseEvents.length : 0,
        patents: Array.isArray(research.patents) ? research.patents.length : 0,
        publications: Math.max(
          Array.isArray(research.literature) ? research.literature.length : 0,
          Array.isArray(research.semanticPapers) ? research.semanticPapers.length : 0,
        ),
      }
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
        setEntries(prev =>
          prev.map(e =>
            e.cid === fav.cid ? { ...e, summary: summary ?? undefined, loading: false } : e
          )
        )
      }
    }
    loadAll()
    return () => { cancelled = true }
  }, [favorites, fetchSummary])

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="border-b border-slate-800 px-6 py-4">
        <a href="/" className="text-slate-400 hover:text-slate-200 text-sm">← BioIntel Explorer</a>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Watchlist</h1>
          <p className="text-slate-400 text-sm">
            Monitor your saved molecules at a glance. Data refreshes on each visit.
          </p>
        </div>

        <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4 sm:p-6">
          <WatchlistTable
            molecules={entries}
            onRemove={(cid) => {
              const mol = favorites.find(f => f.cid === cid)
              if (mol) toggle(cid, mol.name)
            }}
          />
        </div>

        {entries.length > 0 && (
          <div className="mt-4 text-center">
            <p className="text-[10px] text-slate-600">
              {entries.filter(e => !e.loading).length}/{entries.length} molecules loaded
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
