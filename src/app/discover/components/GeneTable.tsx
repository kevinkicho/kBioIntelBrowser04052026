'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { DiseaseGene } from '@/lib/candidateRanker'
import { MAX_DISCOVER_TARGETS } from '@/lib/discovery/discoverUrl'
import { diseaseAssociationGenesOnly } from '@/lib/discovery/sources/genes'
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
 * Disease-associated genes from public DBs (Open Targets / DisGeNET).
 * User pins are NOT listed here (they use TargetPinPanel) — engine still uses
 * pins to bias gene→drug gather deterministically (no LLM in rank path).
 */
export function GeneTable({
  genes,
  pinnedTargets = [],
  onTogglePin,
  maxPins = MAX_DISCOVER_TARGETS,
  loadTdl = true,
}: GeneTableProps) {
  const associationGenes = useMemo(
    () => diseaseAssociationGenesOnly(genes).slice(0, 40),
    [genes],
  )
  const [tdlMap, setTdlMap] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!loadTdl || associationGenes.length === 0) {
      setTdlMap({})
      return
    }
    const symbols = associationGenes
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
  }, [associationGenes, loadTdl])

  const atCap = pinnedTargets.length >= maxPins
  const pinCount = pinnedTargets.length

  // Always show the panel after a rank so empty DB results are honest
  return (
    <div
      className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 mb-6"
      data-testid="discover-gene-table"
    >
      <h3 className="text-sm font-semibold text-slate-300 mb-1">
        Disease-associated genes{' '}
        <span className="text-slate-500 font-normal">({associationGenes.length})</span>
      </h3>
      <p className="mb-3 text-[10px] text-slate-600 leading-relaxed">
        From free public sources (Open Targets disease–target scores, DisGeNET when available) — not
        mock data. User pins live in the panel above and{' '}
        <strong className="font-medium text-slate-500">bias gene→drug gather</strong> when ranking
        (deterministic; AI is not used in the rank path).
        {onTogglePin && (
          <>
            {' '}
            Pin up to {maxPins} genes here to emphasize them on the next re-rank.
          </>
        )}
        {loadTdl && <> · Pharos TDL when available.</>}
      </p>

      {associationGenes.length === 0 ? (
        <div
          className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-3 text-[11px] text-slate-500"
          data-testid="discover-gene-table-empty"
        >
          No disease–gene associations returned for this disease id from public APIs.
          {pinCount > 0 ? (
            <>
              {' '}
              Your {pinCount} pinned target{pinCount === 1 ? '' : 's'} still bias drug gather (see
              Pinned targets).
            </>
          ) : (
            <> Try another disease match, or pin targets from a gene page first.</>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
          {associationGenes.slice(0, 20).map((gene) => {
            const pinned = isPinned(gene.symbol, pinnedTargets)
            const pinDisabled = !pinned && atCap
            const tdl = tdlMap[gene.symbol.toUpperCase()]
            return (
              <div
                key={`${gene.symbol}-${gene.source}`}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors ${
                  pinned
                    ? 'bg-emerald-950/50 border border-emerald-800/40'
                    : 'bg-slate-800/50 border border-transparent hover:bg-slate-800/80'
                }`}
                data-testid={`gene-row-${gene.symbol}`}
                data-pinned={pinned ? 'true' : 'false'}
                data-gene-source={gene.source}
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
                          : `Pin ${gene.symbol} to bias ranking`
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
                  href={`/gene/${encodeURIComponent(gene.symbol)}`}
                  className="min-w-0 flex-1 flex items-center gap-1.5"
                  title={`${gene.symbol} · ${gene.source} · assoc. score ${gene.score.toFixed(2)}`}
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
                  <span className="text-[10px] text-slate-500 shrink-0" title="Association score">
                    {gene.score.toFixed(2)}
                  </span>
                </Link>
              </div>
            )
          })}
          {associationGenes.length > 20 && (
            <div className="flex items-center justify-center text-xs text-slate-500">
              +{associationGenes.length - 20} more
            </div>
          )}
        </div>
      )}
    </div>
  )
}
