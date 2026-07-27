'use client'

import type { RankResult } from '@/lib/candidateRanker'
import type { AiRankResult } from '@/lib/ai/aiRank'
import { downloadFile } from '@/lib/exportData'
import { exportDiscoverShortlistCsv } from '@/lib/discovery/shortlistExport'

interface Props {
  result: RankResult
  /** Optional non-of-record AI analysis (attached without replacing of-record ranks) */
  aiRankResult?: AiRankResult | null
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function exportCsv(result: RankResult): string {
  return exportDiscoverShortlistCsv(result)
}

function exportJson(result: RankResult, aiRankResult?: AiRankResult | null): string {
  return JSON.stringify(
    {
      ...result,
      ofRecordNote: 'candidates[] order is of-record deterministic rank',
      aiAnalysis: aiRankResult
        ? {
            nonOfRecord: true,
            ordering: aiRankResult.ordering,
            caveats: aiRankResult.caveats,
            refused: aiRankResult.refused,
            model: aiRankResult.model,
            generatedAt: aiRankResult.generatedAt,
          }
        : null,
    },
    null,
    2,
  )
}

export function ExportResults({ result, aiRankResult }: Props) {
  const slug = slugify(result.diseaseName)

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => downloadFile(exportCsv(result), `${slug}-candidates.csv`, 'text/csv')}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/40 text-xs font-medium text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        CSV
      </button>
      <button
        onClick={() =>
          downloadFile(
            exportJson(result, aiRankResult),
            `${slug}-candidates.json`,
            'application/json',
          )
        }
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/40 text-xs font-medium text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        JSON
      </button>
    </div>
  )
}