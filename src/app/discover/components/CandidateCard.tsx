'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useAI } from '@/lib/ai/useAI'
import { buildDiscoverRationalePrompt } from '@/lib/ai/promptTemplates'
import type { CandidateMolecule } from '@/lib/candidateRanker'
import { ConfidenceBadge } from './DiscoveryProgress'

interface Props {
  candidate: CandidateMolecule
  rank: number
  diseaseName: string
  topCandidates: CandidateMolecule[]
  diseaseGenes?: { symbol: string; score: number }[]
}

function buildMoleculeLinkUrl(cid: number, rank: number, diseaseName: string, score: number): string {
  const params = new URLSearchParams({ from: 'discover', disease: diseaseName, rank: String(rank), score: score.toFixed(2) })
  return `/molecule/${cid}?${params.toString()}`
}

const PHASE_LABELS: Record<number, string> = {
  1: 'Phase I',
  2: 'Phase II',
  3: 'Phase III',
  4: 'Approved',
}

function SourcePill({ source, query, cid }: { source: string; query?: string; cid?: number | null }) {
  const colors: Record<string, string> = {
    'DGIdb': 'bg-purple-900/30 text-purple-300 border-purple-700/50',
    'ClinicalTrials': 'bg-blue-900/30 text-blue-300 border-blue-700/50',
    'ChEMBL': 'bg-emerald-900/30 text-emerald-300 border-emerald-700/50',
    'Open Targets': 'bg-cyan-900/30 text-cyan-300 border-cyan-700/50',
    'DisGeNET': 'bg-amber-900/30 text-amber-300 border-amber-700/50',
    'Orphanet': 'bg-rose-900/30 text-rose-300 border-rose-700/50',
    'PubChem': 'bg-orange-900/30 text-orange-300 border-orange-700/50',
  }

  const sourceUrls: Record<string, () => string | null> = {
    'DGIdb': () => query ? `https://www.dgidb.org/search?terms=${encodeURIComponent(query)}` : null,
    'ClinicalTrials': () => query ? `https://clinicaltrials.gov/search?term=${encodeURIComponent(query)}` : null,
    'ChEMBL': () => cid ? `https://www.ebi.ac.uk/chembl/g/#search_results/${cid}` : (query ? `https://www.ebi.ac.uk/chembl/g/#search_results/${encodeURIComponent(query)}` : null),
    'Open Targets': () => query ? `https://www.opentargets.org/search?disease=${encodeURIComponent(query)}` : null,
    'DisGeNET': () => query ? `https://www.disgenet.org/browser/0/1/0/${encodeURIComponent(query)}/0/25/0/` : null,
    'Orphanet': () => query ? `https://www.orpha.net/consor/cgi-bin/Disease_Search_Simple.php?Disease_Disease_Search_diseaseGroup=${encodeURIComponent(query)}` : null,
    'PubChem': () => cid ? `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}` : null,
  }

  const url = sourceUrls[source]?.() ?? null
  const colorClass = colors[source] ?? 'bg-slate-700/50 text-slate-400 border-slate-600/50'

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`text-[9px] px-1.5 py-0.5 rounded border hover:brightness-125 transition-colors ${colorClass}`}
      >
        {source} ↗
      </a>
    )
  }

  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${colorClass}`}>
      {source}
    </span>
  )
}

function ScoreExplainer() {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(v => !v)}
        className="text-slate-500 hover:text-slate-300 transition-colors"
        aria-label="How is this score calculated?"
        type="button"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </button>
      {open && (
        <div className="absolute z-50 left-0 top-5 w-72 bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl text-xs text-slate-300 leading-relaxed">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-200">Composite Score Methodology</span>
            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300" type="button">&times;</button>
          </div>
          <p className="mb-2">The composite score is a weighted sum of four normalized components:</p>
          <div className="space-y-1 mb-2">
            <div className="flex justify-between"><span className="text-indigo-400">Clinical Phase</span><span className="text-slate-400">35%</span></div>
            <div className="flex justify-between"><span className="text-indigo-400">Gene Association</span><span className="text-slate-400">25%</span></div>
            <div className="flex justify-between"><span className="text-emerald-400">Target Match</span><span className="text-slate-400">20%</span></div>
            <div className="flex justify-between"><span className="text-amber-400">Trial Volume</span><span className="text-slate-400">20%</span></div>
          </div>
          <p className="text-[10px] text-slate-500">Clinical Phase uses the max ChEMBL indication phase for this disease. Gene Association reflects DisGeNET gene-disease overlap. Target Match is the fraction of disease-associated targets this molecule modulates. Trial Volume is log-normalized clinical trial count for this condition.</p>
        </div>
      )}
    </div>
  )
}

function CompositeScoreRing({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference
  const color = pct >= 70 ? 'text-emerald-400' : pct >= 40 ? 'text-amber-400' : 'text-slate-400'
  const strokeColor = pct >= 70 ? '#34d399' : pct >= 40 ? '#fbbf24' : '#94a3b8'

  return (
    <div className="flex-shrink-0 relative w-16 h-16">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="#1e293b" strokeWidth="4" />
        <circle
          cx="32" cy="32" r={radius} fill="none"
          stroke={strokeColor} strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-bold ${color}`}>{pct}</span>
      </div>
    </div>
  )
}

function WhyRationalePanel({ diseaseName, candidate, topCandidates, diseaseGenes }: { diseaseName: string; candidate: CandidateMolecule; topCandidates: CandidateMolecule[]; diseaseGenes?: { symbol: string; score: number }[] }) {
  const ai = useAI()
  const [rationale, setRationale] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAskWhy = useCallback(async () => {
    if (rationale) {
      setRationale(null)
      return
    }

    if (!ai.enabled || ai.status !== 'available') {
      setError('Connect Ollama to get AI-powered insights. Click the AI button in the bottom-right to configure.')
      return
    }

    setIsLoading(true)
    setError(null)
    setRationale('')

    try {
      const { system, user } = buildDiscoverRationalePrompt(diseaseName, candidate, topCandidates, diseaseGenes)
      const messages = [
        { role: 'system' as const, content: system },
        { role: 'user' as const, content: user },
      ]

      let fullText = ''
      for await (const token of ai.askAI(messages)) {
        fullText += token
        setRationale(fullText)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Failed to get AI response')
      setRationale(null)
    } finally {
      setIsLoading(false)
    }
  }, [ai, diseaseName, candidate, topCandidates, diseaseGenes, rationale])

  return (
    <div className="mt-3 border-t border-slate-700/40 pt-3">
      <button
        onClick={handleAskWhy}
        disabled={isLoading}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
        {isLoading ? 'Analyzing...' : rationale ? 'Hide explanation' : `Why ranked #${topCandidates.findIndex(c => c.name === candidate.name) + 1}?`}
      </button>
      {error && (
        <p className="text-[10px] text-amber-400 mt-1.5">{error}</p>
      )}
      {rationale && (
        <div className="mt-2 text-xs text-slate-300 leading-relaxed bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
          {rationale}
        </div>
      )}
    </div>
  )
}

export function CandidateCard({ candidate, rank, diseaseName, topCandidates, diseaseGenes }: Props) {
  const phaseLabel = PHASE_LABELS[candidate.clinicalPhaseRaw] ?? (candidate.clinicalPhaseRaw > 0 ? `Phase ${candidate.clinicalPhaseRaw}` : 'Preclinical')
  const hasCid = candidate.cid !== null && candidate.cid !== undefined

  const cardContent = (
    <>
      <div className="flex items-start gap-3">
        <CompositeScoreRing score={candidate.compositeScore} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-slate-500">#{rank}</span>
            <h3 className="text-base font-semibold text-slate-100 truncate">{candidate.name}</h3>
            {hasCid && (
              <span className="text-[10px] text-slate-500 shrink-0">CID {candidate.cid}</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <ConfidenceBadge confidence={candidate.confidence} />
            {candidate.clinicalPhaseRaw > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-900/30 text-indigo-300 border border-indigo-700/50 font-medium">
                {phaseLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-medium text-slate-400">Score breakdown</span>
            <ScoreExplainer />
          </div>
          <div className="space-y-1.5 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-24 shrink-0">Gene Score</span>
              <div className="flex-1 bg-slate-700/50 rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${Math.round(candidate.geneAssociationScore * 100)}%` }} />
              </div>
              <span className="text-[10px] text-slate-400 w-8 text-right">{Math.round(candidate.geneAssociationScore * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-24 shrink-0">Target Match</span>
              <div className="flex-1 bg-slate-700/50 rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${Math.round(candidate.sharedTargetRatio * 100)}%` }} />
              </div>
              <span className="text-[10px] text-slate-400 w-8 text-right">{Math.round(candidate.sharedTargetRatio * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-24 shrink-0">Trial Volume</span>
              <div className="flex-1 bg-slate-700/50 rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-amber-500 transition-all duration-500" style={{ width: `${Math.round(candidate.trialCountNorm * 100)}%` }} />
              </div>
              <span className="text-[10px] text-slate-400 w-8 text-right">{Math.round(candidate.trialCountNorm * 100)}%</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {candidate.sources.map(s => (
              <SourcePill key={s} source={s} query={diseaseName} cid={candidate.cid} />
            ))}
            {candidate.trialCountRaw > 0 && (
              <span className="text-[10px] text-slate-500">
                {candidate.trialCountRaw} trial{candidate.trialCountRaw !== 1 ? 's' : ''}
              </span>
            )}
            {candidate.sharedTargetCountRaw > 0 && (
              <span className="text-[10px] text-slate-500">
                {candidate.sharedTargetCountRaw} target{candidate.sharedTargetCountRaw !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>
      <WhyRationalePanel diseaseName={diseaseName} candidate={candidate} topCandidates={topCandidates} diseaseGenes={diseaseGenes} />
    </>
  )

  if (hasCid) {
    return (
      <Link href={buildMoleculeLinkUrl(candidate.cid!, rank, diseaseName, candidate.compositeScore)} className="block bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 hover:border-indigo-600/50 transition-colors group">
        {cardContent}
        <div className="mt-3 text-xs text-indigo-400 group-hover:text-indigo-300 transition-colors flex items-center gap-1">
          View full profile
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </div>
      </Link>
    )
  }

  return (
    <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 opacity-80">
      {cardContent}
      <p className="mt-2 text-[10px] text-slate-600">No PubChem CID — limited data available</p>
    </div>
  )
}