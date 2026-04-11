'use client'

import { useMemo } from 'react'

interface WatchlistMolecule {
  cid: number
  name: string
  summary?: {
    approvedProducts: number
    activeTrials: number
    adverseEvents: number
    patents: number
    publications: number
  }
  loading?: boolean
}

interface Props {
  molecules: WatchlistMolecule[]
  onRemove: (cid: number) => void
}

function StatusBadge({ count, type }: { count: number; type: 'success' | 'warning' | 'info' | 'neutral' }) {
  const colors = {
    success: count > 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-500 border-slate-700',
    warning: count > 0 ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-slate-800 text-slate-500 border-slate-700',
    info: count > 0 ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-slate-800 text-slate-500 border-slate-700',
    neutral: count > 0 ? 'bg-slate-700/50 text-slate-300 border-slate-600' : 'bg-slate-800 text-slate-500 border-slate-700',
  }
  return (
    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-medium border ${colors[type]}`}>
      {count}
    </span>
  )
}

export function WatchlistTable({ molecules, onRemove }: Props) {
  const sorted = useMemo(() => [...molecules], [molecules])

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-4">🔬</p>
        <h3 className="text-lg font-semibold text-slate-300 mb-2">Your watchlist is empty</h3>
        <p className="text-sm text-slate-500 mb-4">
          Search for molecules and click the ♥ button to add them to your watchlist.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
        >
          Search Molecules
        </a>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Molecule</th>
            <th className="text-center py-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Approved</th>
            <th className="text-center py-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Trials</th>
            <th className="text-center py-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Adverse</th>
            <th className="text-center py-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Patents</th>
            <th className="text-center py-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Pubs</th>
            <th className="text-center py-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400 w-12"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((mol, i) => (
            <tr
              key={mol.cid}
              className={`border-b border-slate-800 hover:bg-slate-800/50 transition-colors cursor-pointer ${
                i % 2 === 0 ? 'bg-slate-900/30' : ''
              }`}
            >
              <td className="py-3 px-3">
                <a href={`/molecule/${mol.cid}`} className="group">
                  <span className="text-slate-100 font-medium group-hover:text-indigo-400 transition-colors">
                    {mol.name}
                  </span>
                  <span className="text-[10px] text-slate-600 ml-2">CID {mol.cid}</span>
                </a>
              </td>
              {mol.loading ? (
                <td colSpan={5} className="text-center py-3 px-2">
                  <span className="text-xs text-slate-500 animate-pulse">Loading data...</span>
                </td>
              ) : mol.summary ? (
                <>
                  <td className="text-center py-3 px-2"><StatusBadge count={mol.summary.approvedProducts} type="success" /></td>
                  <td className="text-center py-3 px-2"><StatusBadge count={mol.summary.activeTrials} type="info" /></td>
                  <td className="text-center py-3 px-2"><StatusBadge count={mol.summary.adverseEvents} type="warning" /></td>
                  <td className="text-center py-3 px-2"><StatusBadge count={mol.summary.patents} type="neutral" /></td>
                  <td className="text-center py-3 px-2"><StatusBadge count={mol.summary.publications} type="neutral" /></td>
                </>
              ) : (
                <td colSpan={5} className="text-center py-3 px-2">
                  <span className="text-xs text-slate-600">—</span>
                </td>
              )}
              <td className="text-center py-3 px-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(mol.cid) }}
                  className="text-slate-600 hover:text-red-400 transition-colors p-1"
                  title="Remove from watchlist"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
