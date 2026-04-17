'use client'

import Link from 'next/link'

interface GeneTarget {
  geneSymbol: string
  geneName: string
  interactionType: string
  score: number
}

interface Props {
  interactions: GeneTarget[]
}

const MAX_VISIBLE = 8

export function GeneTargetStrip({ interactions }: Props) {
  if (!interactions || interactions.length === 0) return null

  const uniqueTargets = deduplicateTargets(interactions)
  const visible = uniqueTargets.slice(0, MAX_VISIBLE)
  const remaining = uniqueTargets.length - MAX_VISIBLE

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-4 h-4 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Gene Targets</span>
        <span className="text-[10px] text-slate-500">{uniqueTargets.length} target{uniqueTargets.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map(t => (
          <Link
            key={t.geneSymbol}
            href={`/gene?q=${encodeURIComponent(t.geneSymbol)}`}
            className="group inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-slate-800/80 border border-slate-700/50 hover:border-cyan-600/50 hover:bg-cyan-900/20 transition-colors"
          >
            <span className="font-semibold text-cyan-300 group-hover:text-cyan-200">{t.geneSymbol}</span>
            {t.interactionType && (
              <span className="text-[10px] text-slate-500 group-hover:text-slate-400">{t.interactionType}</span>
            )}
          </Link>
        ))}
        {remaining > 0 && (
          <a
            href="#bioactivity-targets"
            onClick={e => {
              e.preventDefault()
              const el = document.getElementById('bioactivity-targets')
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
            className="inline-flex items-center px-2 py-1 rounded-lg text-xs bg-slate-800/80 border border-slate-700/50 hover:border-indigo-600/50 hover:bg-indigo-900/20 text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            +{remaining} more
          </a>
        )}
      </div>
    </div>
  )
}

function deduplicateTargets(interactions: GeneTarget[]): GeneTarget[] {
  const seen = new Map<string, GeneTarget>()
  for (const ix of interactions) {
    const key = ix.geneSymbol.toUpperCase()
    if (!seen.has(key)) {
      seen.set(key, ix)
    } else {
      const existing = seen.get(key)!
      if (ix.interactionType && !existing.interactionType.includes(ix.interactionType)) {
        seen.set(key, { ...existing, interactionType: `${existing.interactionType}, ${ix.interactionType}` })
      }
    }
  }
  return Array.from(seen.values()).sort((a, b) => b.score - a.score)
}