'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { CandidateMolecule } from '@/lib/candidateRanker'

interface Props {
  candidates: CandidateMolecule[]
  diseaseName: string
}

export function CompareSelectionTray({ candidates, diseaseName }: Props) {
  const [selected, setSelected] = useState<number[]>([])

  const withCids = candidates.filter(c => c.cid !== null && c.cid !== undefined)

  const toggle = (idx: number) => {
    setSelected(prev => {
      if (prev.includes(idx)) return prev.filter(i => i !== idx)
      if (prev.length >= 2) return prev
      return [...prev, idx]
    })
  }

  if (withCids.length < 2) return null

  const selectedCandidates = selected.map(i => withCids[i]).filter(Boolean)
  const canCompare = selected.length === 2

  const compareUrl = canCompare
    ? `/compare?a=${selectedCandidates[0].cid}&b=${selectedCandidates[1].cid}&disease=${encodeURIComponent(diseaseName)}&scoreA=${selectedCandidates[0].compositeScore}&scoreB=${selectedCandidates[1].compositeScore}&confidenceA=${selectedCandidates[0].confidence}&confidenceB=${selectedCandidates[1].confidence}&nameA=${encodeURIComponent(selectedCandidates[0].name)}&nameB=${encodeURIComponent(selectedCandidates[1].name)}`
    : null

  return (
    <div className="mb-4 bg-slate-900/60 border border-slate-700/40 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-slate-300">
          Compare candidates
          <span className="text-slate-500 font-normal ml-1.5">Select any 2</span>
        </h3>
        {selected.length > 0 && (
          <button
            onClick={() => setSelected([])}
            className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            Clear selection
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {withCids.map((c, i) => {
          const isSelected = selected.includes(i)
          const isDisabled = !isSelected && selected.length >= 2
          return (
            <button
              key={c.cid}
              onClick={() => !isDisabled && toggle(i)}
              disabled={isDisabled}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                isSelected
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm shadow-indigo-500/20'
                  : isDisabled
                    ? 'bg-slate-800/30 border-slate-700/30 text-slate-600 cursor-not-allowed'
                    : 'bg-slate-800/50 border-slate-700/40 text-slate-400 hover:border-indigo-600/40 hover:text-slate-300 cursor-pointer'
              }`}
            >
              <span className={`w-3 h-3 rounded border flex items-center justify-center text-[8px] ${
                isSelected
                  ? 'border-white bg-white text-indigo-600'
                  : 'border-slate-600'
              }`}>
                {isSelected && (selected.indexOf(i) + 1)}
              </span>
              {c.name}
              <span className={`text-[9px] ${isSelected ? 'text-indigo-200' : 'text-slate-600'}`}>
                {Math.round(c.compositeScore * 100)}
              </span>
            </button>
          )
        })}
      </div>
      {canCompare && compareUrl && (
        <Link
          href={compareUrl}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          Compare: {selectedCandidates[0].name} vs {selectedCandidates[1].name}
        </Link>
      )}
    </div>
  )
}