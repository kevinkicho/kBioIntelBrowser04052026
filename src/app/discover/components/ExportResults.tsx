'use client'

import type { RankResult } from '@/lib/candidateRanker'
import { downloadFile } from '@/lib/exportData'

interface Props {
  result: RankResult
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function exportCsv(result: RankResult): string {
  const lines: string[] = []

  lines.push(`# Discover results for: ${result.diseaseName}`)
  lines.push(`# Disease ID: ${result.diseaseId ?? 'N/A'}`)
  lines.push(`# Therapeutic areas: ${result.therapeuticAreas.join('; ')}`)
  lines.push(`# Genes analyzed: ${result.genes.length}`)
  lines.push(`# Candidates: ${result.candidates.length}`)
  lines.push('')

  const headers = [
    'rank',
    'name',
    'cid',
    'compositeScore',
    'confidence',
    'clinicalPhase',
    'clinicalPhaseRaw',
    'geneAssociationScore',
    'geneScoreRaw',
    'sharedTargetRatio',
    'sharedTargetCountRaw',
    'trialCountNorm',
    'trialCountRaw',
    'sources',
  ]
  lines.push(headers.join(','))

  result.candidates.forEach((c, i) => {
    const row = [
      i + 1,
      `"${c.name.replace(/"/g, '""')}"`,
      c.cid ?? '',
      c.compositeScore.toFixed(4),
      c.confidence,
      c.clinicalPhase.toFixed(4),
      c.clinicalPhaseRaw,
      c.geneAssociationScore.toFixed(4),
      c.geneScoreRaw?.toFixed(4) ?? '',
      c.sharedTargetRatio.toFixed(4),
      c.sharedTargetCountRaw,
      c.trialCountNorm.toFixed(4),
      c.trialCountRaw,
      `"${c.sources.join('; ')}"`,
    ]
    lines.push(row.join(','))
  })

  return lines.join('\n')
}

function exportJson(result: RankResult): string {
  return JSON.stringify(result, null, 2)
}

export function ExportResults({ result }: Props) {
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
        onClick={() => downloadFile(exportJson(result), `${slug}-candidates.json`, 'application/json')}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/40 text-xs font-medium text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        JSON
      </button>
    </div>
  )
}