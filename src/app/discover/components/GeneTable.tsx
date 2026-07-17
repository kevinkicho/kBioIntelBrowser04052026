'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { DiseaseGene } from '@/lib/candidateRanker'
import { MAX_DISCOVER_TARGETS } from '@/lib/discovery/discoverUrl'
import { TdlBadge } from '@/components/discover/TdlBadge'

export interface GeneTableProps {
  genes: DiseaseGene[]
  /** Currently pinned gene symbols (from discovery state / URL targets=). */
  pinnedTargets?: string[]
  /** Toggle pin for a gene symbol (parent owns setTargets + URL sync). */
  onTogglePin?: (symbol: string) => void
  /** Engine / API pin cap (default 10). */
  maxPins?: number
  /** Load Pharos TDL badges (V2-10). Default true. */
  loadTdl?: boolean
}

function isPinned(symbol: string, pinnedTargets: string[]): boolean {
  const key = symbol.trim().toUpperCase()
  return pinnedTargets.some((t) => t.trim().toUpperCase() === key)
}

/**
 * Disease-associated genes grid with optional pin/unpin (PR-V2-08)
 * and Pharos TDL badges (PR-V2-10).
 */
export function GeneTable({
  genes,
  pinnedTargets = [],
  onTogglePin,
  maxPins = MAX_DISCOVER_TARGETS,
  loadTdl = true,
}: GeneTableProps) {
  const [tdlMap, setTdlMap] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!loadTdl || genes.length === 0) {
      setTdlMap({})
      return
    }
    const symbols = genes
      .slice(0, 20)
      .map((g) => g.symbol)
      .filter(Boolean)
    if (symbols.length === 0) return
    let cancelled = false
    void fetch(`/api/pharos/tdl?symbols=${encodeURIComponent(symbols.join(','))}`)
      .then((r) => r.json())
      .then((data: { tdl?: Record<string, string> }) => {
        if (!cancelled && data.tdl) setTdlMap(data.tdl)
      })
      .catch(() => {
        if (!cancelled) setTdlMap({})
      })
    return () => {
      cancelled = true
    }
  }, [genes, loadTdl])

  if (genes.length === 0) return null

  const atCap = pinnedTargets.length >= maxPins

  return (
    <div
      className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 mb-6"
      data-testid="discover-gene-table"
    >
      <h3 className="text-sm font-semibold text-slate-300 mb-3">
        Disease-Associated Genes{' '}
        <span className="text-slate-500 font-normal">({genes.length})</span>
        {onTogglePin && (
          <span className="ml-2 text-[10px] font-normal text-slate-600">
            pin up to {maxPins} for ranking
          </span>
        )}
        {loadTdl && (
          <span className="ml-2 text-[10px] font-normal text-slate-600">
            · Pharos TDL when available
          </span>
        )}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
        {genes.slice(0, 20).map((gene) => {
          const pinned = isPinned(gene.symbol, pinnedTargets)
          const pinDisabled = !pinned && atCap
          const tdl = tdlMap[gene.symbol.toUpperCase()]
          return (
            <div
              key={gene.symbol}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors ${
                pinned
                  ? 'bg-emerald-950/50 border border-emerald-800/40'
                  : 'bg-slate-800/50 border border-transparent hover:bg-slate-800/80'
              }`}
              data-testid={`gene-row-${gene.symbol}`}
              data-pinned={pinned ? 'true' : 'false'}
            >
              {onTogglePin && (
                <button
                  type="button"
                  onClick={() => {
                    if (pinDisabled) return
                    onTogglePin(gene.symbol)
                  }}
                  disabled={pinDisabled}
                  title={
                    pinned
                      ? `Unpin ${gene.symbol}`
                      : pinDisabled
                        ? `Maximum ${maxPins} pinned targets`
                        : `Pin ${gene.symbol}`
                  }
                  aria-label={
                    pinned
                      ? `Unpin ${gene.symbol}`
                      : pinDisabled
                        ? `Cannot pin ${gene.symbol}: maximum ${maxPins} targets`
                        : `Pin ${gene.symbol}`
                  }
                  aria-pressed={pinned}
                  data-testid={`gene-pin-${gene.symbol}`}
                  className={`shrink-0 rounded p-0.5 text-xs leading-none transition-colors ${
                    pinned
                      ? 'text-emerald-300 hover:text-emerald-200 hover:bg-emerald-900/60'
                      : pinDisabled
                        ? 'text-slate-700 cursor-not-allowed'
                        : 'text-slate-500 hover:text-indigo-300 hover:bg-slate-700/60'
                  }`}
                >
                  {pinned ? '●' : '○'}
                </button>
              )}
              <Link
                href={`/gene?q=${encodeURIComponent(gene.symbol)}`}
                className="min-w-0 flex-1 flex items-center gap-1.5"
                title={`Open gene search for ${gene.symbol}`}
              >
                <span
                  className={`text-sm font-mono font-semibold truncate ${
                    pinned
                      ? 'text-emerald-300 hover:text-emerald-200'
                      : 'text-indigo-300 hover:text-indigo-200'
                  }`}
                >
                  {gene.symbol}
                </span>
                <TdlBadge tdl={tdl} />
                <span className="text-[10px] text-slate-500 shrink-0">
                  {gene.score.toFixed(2)}
                </span>
              </Link>
            </div>
          )
        })}
        {genes.length > 20 && (
          <div className="flex items-center justify-center text-xs text-slate-500">
            +{genes.length - 20} more
          </div>
        )}
      </div>
    </div>
  )
}
