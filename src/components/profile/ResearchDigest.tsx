'use client'

import { useMemo } from 'react'
import type { SemanticPaper, LiteratureResult } from '@/lib/types'

interface Props {
  semanticPapers: SemanticPaper[]
  literature: LiteratureResult[]
}

export function ResearchDigest({ semanticPapers, literature }: Props) {
  const digest = useMemo(() => {
    // Get top TLDRs by citation count
    const withTldr = semanticPapers
      .filter(p => p.tldr && p.tldr.length > 10)
      .sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0))
      .slice(0, 4)

    if (withTldr.length === 0) return null

    // Compute stats
    const allPapers = [...literature]
    const years = allPapers.map(p => p.year).filter(y => y > 0)
    const minYear = years.length ? Math.min(...years) : null
    const maxYear = years.length ? Math.max(...years) : null

    // Top journals
    const journalCounts: Record<string, number> = {}
    for (const p of allPapers) {
      if (p.journal) {
        journalCounts[p.journal] = (journalCounts[p.journal] || 0) + 1
      }
    }
    const topJournals = Object.entries(journalCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name)

    const totalCitations = semanticPapers.reduce((s, p) => s + (p.citationCount || 0), 0)

    return { withTldr, minYear, maxYear, topJournals, totalCitations, paperCount: Math.max(literature.length, semanticPapers.length) }
  }, [semanticPapers, literature])

  if (!digest) return null

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 col-span-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          📖 Research Digest
        </h3>
        <div className="flex gap-3 text-[10px] text-slate-500">
          {digest.minYear && digest.maxYear && (
            <span>{digest.minYear}–{digest.maxYear}</span>
          )}
          <span>{digest.paperCount} publications</span>
          <span>{digest.totalCitations.toLocaleString()} citations</span>
        </div>
      </div>

      {/* Key findings */}
      <div className="space-y-3 mb-4">
        {digest.withTldr.map((paper, i) => (
          <div key={paper.paperId || i} className="flex gap-3">
            <div className="flex-shrink-0 mt-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold">
                {i + 1}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm text-slate-200 leading-relaxed">{paper.tldr}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-slate-500">{paper.year || ''}</span>
                <span className="text-[10px] text-slate-600">·</span>
                <span className="text-[10px] text-slate-500">{paper.citationCount?.toLocaleString() || 0} citations</span>
                {paper.url && (
                  <>
                    <span className="text-[10px] text-slate-600">·</span>
                    <a
                      href={paper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-indigo-400 hover:text-indigo-300"
                    >
                      View paper →
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Top journals */}
      {digest.topJournals.length > 0 && (
        <div className="border-t border-slate-700/50 pt-3">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Top Journals: </span>
          {digest.topJournals.map((j, i) => (
            <span key={j} className="text-[10px] text-slate-400">
              {i > 0 && ' · '}{j}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
