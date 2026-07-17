'use client'

import { useState, useEffect, useCallback } from 'react'
import { PanelApiDetailModal } from '@/components/ui/PanelApiDetailModal'
import type { CategoryApiTrace } from '@/lib/panelApiTrace'

interface VendorResult {
  name: string
  /** Molecule-specific deep link (null = not clickable). */
  url: string | null
  sourceType: 'supplier' | 'database'
}

interface VendorsData {
  suppliers: VendorResult[]
  databases: VendorResult[]
  total: number
  moleculeName?: string
}

export function VendorsPanel({ cid }: { cid: number }) {
  const [data, setData] = useState<VendorsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [trace, setTrace] = useState<CategoryApiTrace | null>(null)

  const fetchVendors = useCallback(async (refresh = false) => {
    setLoading(true)
    setError(null)
    const startedAt = new Date().toISOString()
    const path = `/api/molecule/${cid}/vendors${refresh ? '?refresh=1' : ''}`
    try {
      const res = await fetch(path)
      const finishedAt = new Date().toISOString()
      if (!res.ok) throw new Error(`Failed to fetch vendors (${res.status})`)
      const json: VendorsData = await res.json()
      setData(json)
      setTrace({
        categoryId: 'vendors',
        cid,
        moleculeName: json.moleculeName,
        requestPath: path,
        method: 'GET',
        startedAt,
        finishedAt,
        duration_ms: Date.parse(finishedAt) - Date.parse(startedAt),
        fromCache: false,
        forceRefresh: refresh,
        sources: [
          {
            source: 'pubchem-xrefs',
            status: res.status,
            loadStatus: 'loaded',
            duration_ms: Date.parse(finishedAt) - Date.parse(startedAt),
            has_data: (json.suppliers?.length ?? 0) + (json.databases?.length ?? 0) > 0,
            endpoint: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/xrefs/SourceName/JSON',
            docs: 'https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest',
            apiLabel: 'PubChem PUG REST (SourceName + SBURL)',
            organization: 'NCBI (NIH)',
          },
        ],
        responseSummary: {
          keys: ['suppliers', 'databases', 'total'],
          sourceCount: 1,
          withData: (json.suppliers?.length ?? 0) + (json.databases?.length ?? 0) > 0 ? 1 : 0,
          empty: 0,
          errors: 0,
          timeouts: 0,
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vendor data')
    } finally {
      setLoading(false)
    }
  }, [cid])

  useEffect(() => {
    void fetchVendors(false)
  }, [fetchVendors])

  if (loading) {
    return (
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5 mb-2 animate-pulse">
        <div className="h-4 w-40 bg-slate-700 rounded mb-4" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-7 w-28 bg-slate-800 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5 mb-2">
        <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
          <span>🛒</span> Chemical Suppliers
        </h3>
        <p className="text-xs text-red-400">{error}</p>
      </div>
    )
  }

  if (!data || (data.suppliers.length === 0 && data.databases.length === 0)) {
    return null
  }

  const displaySuppliers = showAll ? data.suppliers : data.suppliers.slice(0, 8)
  const displayDatabases = showAll ? data.databases : data.databases.slice(0, 6)
  const hasMore = data.suppliers.length > 8 || data.databases.length > 6

  return (
    <div id="suppliers" className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5 mb-2">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <span>🛒</span> Chemical Suppliers
          <span className="text-xs text-slate-500 font-normal">
            ({data.total} sources on PubChem
            {data.moleculeName ? ` · ${data.moleculeName}` : ''})
          </span>
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setDetailOpen(true)}
            className="rounded p-1 text-slate-600 hover:bg-slate-700/60 hover:text-slate-300"
            title="API request details"
            aria-label="API details for Chemical Suppliers"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => void fetchVendors(true)}
            disabled={loading}
            className="rounded p-1 text-slate-600 hover:bg-slate-700/60 hover:text-amber-300 disabled:opacity-40"
            title="Refresh suppliers"
            aria-label="Refresh Chemical Suppliers"
          >
            <svg className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {data.suppliers.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
            Suppliers with direct links
          </p>
          <div className="flex flex-wrap gap-2">
            {displaySuppliers.map((s) =>
              s.url ? (
                <a
                  key={s.name}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Search ${s.name} for this molecule`}
                  className="text-xs px-3 py-1.5 rounded-lg bg-cyan-900/25 text-cyan-300 border border-cyan-700/40 hover:bg-cyan-900/40 hover:border-cyan-600/50 transition-colors"
                >
                  {s.name} ↗
                </a>
              ) : (
                <span
                  key={s.name}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/50 text-slate-400 border border-slate-700/40"
                >
                  {s.name}
                </span>
              ),
            )}
          </div>
        </div>
      )}

      {data.databases.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
            Reference databases
          </p>
          <div className="flex flex-wrap gap-1.5">
            {displayDatabases.map((d) =>
              d.url ? (
                <a
                  key={d.name}
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Open ${d.name} for this molecule`}
                  data-testid={`vendor-db-chip-${d.name}`}
                  className="text-[10px] px-2 py-1 rounded bg-indigo-900/25 text-indigo-300 border border-indigo-700/40 hover:bg-indigo-900/45 hover:border-indigo-600/50 transition-colors"
                >
                  {d.name} ↗
                </a>
              ) : (
                <span
                  key={d.name}
                  className="text-[10px] px-2 py-1 rounded bg-slate-800/40 text-slate-400 border border-slate-700/30"
                  title="No molecule-specific deep link available"
                >
                  {d.name}
                </span>
              ),
            )}
          </div>
        </div>
      )}

      {hasMore && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-1"
        >
          Show all ({data.suppliers.length} suppliers, {data.databases.length} databases)
        </button>
      )}
      {showAll && hasMore && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-1"
        >
          Show less
        </button>
      )}

      <div className="mt-3 pt-3 border-t border-slate-700/30">
        <p className="text-[10px] text-slate-600">
          Chips open molecule-specific deep links (name / CID / InChIKey / PubChem record URLs) —
          not bare vendor homepages. Order status and pricing are not available through PubChem.
        </p>
      </div>
      <PanelApiDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        panelTitle="Chemical Suppliers"
        panelId="suppliers"
        trace={trace}
      />
    </div>
  )
}
