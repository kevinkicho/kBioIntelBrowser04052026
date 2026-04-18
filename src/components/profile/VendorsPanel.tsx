'use client'

import { useState, useEffect } from 'react'

interface VendorResult {
  name: string
  url: string | null
  sourceType: 'supplier' | 'database'
}

interface VendorsData {
  suppliers: VendorResult[]
  databases: VendorResult[]
  total: number
}

export function VendorsPanel({ cid }: { cid: number }) {
  const [data, setData] = useState<VendorsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function fetchVendors() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/molecule/${cid}/vendors`)
        if (!res.ok) throw new Error(`Failed to fetch vendors (${res.status})`)
        const json: VendorsData = await res.json()
        if (!cancelled) setData(json)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load vendor data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchVendors()
    return () => { cancelled = true }
  }, [cid])

  if (loading) {
    return (
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5 mb-2 animate-pulse">
        <div className="h-4 w-40 bg-slate-700 rounded mb-4" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map(i => (
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
      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <span>🛒</span> Chemical Suppliers
        <span className="text-xs text-slate-500 font-normal">({data.total} sources on PubChem)</span>
      </h3>

      {data.suppliers.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Suppliers with direct links</p>
          <div className="flex flex-wrap gap-2">
            {displaySuppliers.map(s => (
              s.url ? (
                <a
                  key={s.name}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
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
              )
            ))}
          </div>
        </div>
      )}

      {data.databases.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Reference databases</p>
          <div className="flex flex-wrap gap-1.5">
            {displayDatabases.map(d => (
              <span
                key={d.name}
                className="text-[10px] px-2 py-1 rounded bg-slate-800/40 text-slate-400 border border-slate-700/30"
              >
                {d.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-1"
        >
          Show all ({data.suppliers.length} suppliers, {data.databases.length} databases)
        </button>
      )}
      {showAll && hasMore && (
        <button
          onClick={() => setShowAll(false)}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-1"
        >
          Show less
        </button>
      )}

      <div className="mt-3 pt-3 border-t border-slate-700/30">
        <p className="text-[10px] text-slate-600">
          Supplier links search by compound name and may not return exact results for all molecules. Order status and pricing are not available through PubChem.
        </p>
      </div>
    </div>
  )
}