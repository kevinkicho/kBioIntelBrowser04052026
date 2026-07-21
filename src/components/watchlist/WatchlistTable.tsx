'use client'

import { useMemo } from 'react'
import type { WatchlistDensitySummary } from '@/lib/watchlistSummary'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

interface WatchlistMolecule {
  cid: number
  name: string
  summary?: WatchlistDensitySummary
  loading?: boolean
  /** Formatted density deltas since last visit */
  changeLabel?: string
}

interface Props {
  molecules: WatchlistMolecule[]
  onRemove: (cid: number) => void
}

function StatusBadge({
  count,
  type,
}: {
  count: number
  type: 'success' | 'warning' | 'info' | 'neutral' | 'violet'
}) {
  const colors = {
    success:
      count > 0
        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        : 'bg-slate-800 text-slate-500 border-slate-700',
    warning:
      count > 0
        ? 'bg-red-500/20 text-red-400 border-red-500/30'
        : 'bg-slate-800 text-slate-500 border-slate-700',
    info:
      count > 0
        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        : 'bg-slate-800 text-slate-500 border-slate-700',
    violet:
      count > 0
        ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
        : 'bg-slate-800 text-slate-500 border-slate-700',
    neutral:
      count > 0
        ? 'bg-slate-700/50 text-slate-300 border-slate-600'
        : 'bg-slate-800 text-slate-500 border-slate-700',
  }
  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-medium border ${colors[type]}`}
    >
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
    <div className="overflow-x-auto" data-testid="watchlist-table">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Molecule
            </th>
            <th className="text-center py-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Cos
            </th>
            <th className="text-center py-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Trials
            </th>
            <th className="text-center py-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Sponsors
            </th>
            <th className="text-center py-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              AE
            </th>
            <th className="text-center py-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              BLA
            </th>
            <th className="text-center py-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              BioSim
            </th>
            <th className="text-center py-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              ROR
            </th>
            <th className="text-center py-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Grants
            </th>
            <th className="text-center py-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              CA/EU
            </th>
            <th className="text-center py-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Patents
            </th>
            <th className="text-center py-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Pubs
            </th>
            <th className="text-center py-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400 w-12" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((mol, i) => (
            <tr
              key={mol.cid}
              className={`border-b border-slate-800 hover:bg-slate-800/50 transition-colors ${
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
                {mol.changeLabel ? (
                  <p
                    className="text-[10px] text-amber-400/90 mt-0.5"
                    data-testid="watchlist-row-delta"
                  >
                    {mol.changeLabel}
                  </p>
                ) : null}
              </td>
              {mol.loading ? (
                <td colSpan={11} className="text-center py-3 px-2">
                  <span className="text-xs text-slate-500 animate-pulse">Loading density…</span>
                </td>
              ) : mol.summary ? (
                <>
                  <td className="text-center py-3 px-2">
                    <StatusBadge count={mol.summary.approvedProducts} type="success" />
                  </td>
                  <td className="text-center py-3 px-2">
                    <StatusBadge count={mol.summary.activeTrials} type="info" />
                  </td>
                  <td className="text-center py-3 px-2">
                    <StatusBadge count={mol.summary.sponsorCount} type="info" />
                  </td>
                  <td className="text-center py-3 px-2">
                    <StatusBadge count={mol.summary.adverseEvents} type="warning" />
                  </td>
                  <td className="text-center py-3 px-2">
                    <StatusBadge count={mol.summary.blaCount} type="violet" />
                  </td>
                  <td className="text-center py-3 px-2">
                    <StatusBadge count={mol.summary.biosimilarCount} type="violet" />
                  </td>
                  <td className="text-center py-3 px-2">
                    <StatusBadge count={mol.summary.rorCount} type="neutral" />
                  </td>
                  <td className="text-center py-3 px-2">
                    <StatusBadge count={mol.summary.grantCount} type="neutral" />
                  </td>
                  <td className="text-center py-3 px-2">
                    <StatusBadge
                      count={mol.summary.healthCanadaCount + mol.summary.emaCount}
                      type="success"
                    />
                  </td>
                  <td className="text-center py-3 px-2">
                    <StatusBadge count={mol.summary.patents} type="neutral" />
                  </td>
                  <td className="text-center py-3 px-2">
                    <StatusBadge count={mol.summary.publications} type="neutral" />
                  </td>
                </>
              ) : (
                <td colSpan={11} className="text-center py-3 px-2">
                  <span className="text-xs text-slate-600">—</span>
                </td>
              )}
              <td className="text-center py-3 px-2">
                <StyledTooltip content="Remove from watchlist">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemove(mol.cid)
                    }}
                    className="text-slate-600 hover:text-red-400 transition-colors p-1"
                    aria-label="Remove from watchlist"
                  >
                    ✕
                  </button>
                </StyledTooltip>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-[10px] text-slate-600 px-1">
        Density from free public category bags (companies, trials, BLA/Purple Book, ROR, grants,
        Health Canada, EMA). Counts are register rows — not clinical monitoring.
      </p>
    </div>
  )
}
