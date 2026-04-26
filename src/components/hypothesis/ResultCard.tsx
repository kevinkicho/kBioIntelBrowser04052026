'use client'

import Link from 'next/link'
import type { IntersectedMatch } from '@/lib/hypothesis/types'

interface Props {
  match: IntersectedMatch
  rank: number
}

export function ResultCard({ match, rank }: Props) {
  return (
    <Link
      href={`/molecule/${match.cid}?from=hypothesis`}
      className="block bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 hover:border-indigo-600/50 transition-colors group"
    >
      <div className="flex items-start gap-3">
        <span className="text-xs font-mono text-slate-500 mt-0.5 shrink-0">#{rank}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-base font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors truncate">
              {match.name}
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700/50 text-slate-400 font-mono shrink-0">
              CID {match.cid}
            </span>
          </div>
          <ul className="space-y-1">
            {match.reasons.map((reason, i) => (
              <li
                key={i}
                className="text-xs text-slate-400 flex items-start gap-1.5"
              >
                <span className="text-emerald-500 mt-0.5">✓</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
        <svg
          className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors mt-1 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}
