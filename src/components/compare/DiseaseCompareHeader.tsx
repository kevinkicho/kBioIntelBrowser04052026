'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useAI } from '@/lib/ai/useAI'
import { buildCandidateComparePrompt } from '@/lib/ai/promptTemplates'

export interface CompareCandidateData {
  clinicalTrials: unknown[]
  uniprotEntries: unknown[]
  chemblIndications: unknown[]
  chemblMechanisms: unknown[]
  adverseEvents: unknown[]
  [key: string]: unknown
}

interface DiseaseCompareHeaderProps {
  disease: string
  nameA: string
  nameB: string
  cidA: number
  cidB: number
  scoreA: number
  scoreB: number
  confidenceA: string
  confidenceB: string
  dataA: CompareCandidateData
  dataB: CompareCandidateData
}

function ConfidenceDot({ confidence }: { confidence: string }) {
  const color = confidence === 'high'
    ? 'bg-emerald-400'
    : confidence === 'moderate'
      ? 'bg-amber-400'
      : 'bg-slate-400'
  const label = confidence === 'high' ? 'High confidence' : confidence === 'moderate' ? 'Moderate confidence' : 'Preliminary confidence'
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} role="status" aria-label={label} />
}

function DecisionCell({ label, valueA, valueB, higherIsGood = true }: {
  label: string
  valueA: string | number
  valueB: string | number
  higherIsGood?: boolean
}) {
  const a = typeof valueA === 'number' ? valueA : parseFloat(String(valueA)) || 0
  const b = typeof valueB === 'number' ? valueB : parseFloat(String(valueB)) || 0
  let winner: 'a' | 'b' | 'tie' = 'tie'
  if (a !== b) {
    if (higherIsGood) winner = a > b ? 'a' : 'b'
    else winner = a < b ? 'a' : 'b'
  }
  const aClass = winner === 'a' ? 'text-emerald-400 font-semibold' : winner === 'b' ? 'text-slate-500' : 'text-slate-300'
  const bClass = winner === 'b' ? 'text-emerald-400 font-semibold' : winner === 'a' ? 'text-slate-500' : 'text-slate-300'

  return (
    <tr className="border-b border-slate-700/40">
      <th scope="row" className="py-1.5 pr-3 text-xs text-slate-400 whitespace-nowrap font-normal text-left">{label}</th>
      <td className={`py-1.5 px-3 text-sm text-right ${aClass}`}>{valueA}</td>
      <td className={`py-1.5 pl-3 text-sm text-left ${bClass}`}>{valueB}</td>
    </tr>
  )
}

export function DiseaseCompareHeader({
  disease,
  nameA,
  nameB,
  cidA,
  cidB,
  scoreA,
  scoreB,
  confidenceA,
  confidenceB,
  dataA,
  dataB,
}: DiseaseCompareHeaderProps) {
  const [rationale, setRationale] = useState<string | null>(null)
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const { askAI, enabled, status } = useAI()

  const trialsA = Array.isArray(dataA.clinicalTrials) ? dataA.clinicalTrials : []
  const trialsB = Array.isArray(dataB.clinicalTrials) ? dataB.clinicalTrials : []
  const targetsA = Array.isArray(dataA.uniprotEntries) ? dataA.uniprotEntries : []
  const targetsB = Array.isArray(dataB.uniprotEntries) ? dataB.uniprotEntries : []
  const indicationsA = Array.isArray(dataA.chemblIndications) ? dataA.chemblIndications : []
  const indicationsB = Array.isArray(dataB.chemblIndications) ? dataB.chemblIndications : []

  async function handleRationale() {
    if (streaming) {
      abortRef.current?.abort()
      setStreaming(false)
      return
    }
    setRationale(null)
    setStreaming(true)
    try {
      const { system, user } = buildCandidateComparePrompt(
        disease,
        {
          name: nameA,
          cid: cidA,
          compositeScore: scoreA,
          confidence: confidenceA,
          trials: trialsA.length,
          targets: targetsA.length,
          indications: indicationsA.length,
          data: dataA as Record<string, unknown>,
        },
        {
          name: nameB,
          cid: cidB,
          compositeScore: scoreB,
          confidence: confidenceB,
          trials: trialsB.length,
          targets: targetsB.length,
          indications: indicationsB.length,
          data: dataB as Record<string, unknown>,
        },
      )
      let result = ''
      for await (const token of askAI([{ role: 'system', content: system }, { role: 'user', content: user }])) {
        if (token.startsWith('[Error:')) {
          result += token
          break
        }
        result += token
        setRationale(result)
      }
    } catch (err) {
      setRationale(prev => prev ?? `[Error: ${err instanceof Error ? err.message : String(err)}]`)
    } finally {
      setStreaming(false)
    }
  }

  const scorePctA = Math.round(scoreA * 100)
  const scorePctB = Math.round(scoreB * 100)

  return (
    <div className="bg-indigo-900/15 border border-indigo-700/30 rounded-xl p-5 mb-6" role="region" aria-label={`Comparison of ${nameA} and ${nameB} for ${disease}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-slate-400">Comparing candidates for</span>
        <Link
          href={`/discover?q=${encodeURIComponent(disease)}`}
          className="text-sm font-medium text-indigo-300 hover:text-indigo-200 transition-colors"
        >
          {disease}
        </Link>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-x-4 gap-y-1 mb-4 items-center">
        <div className="text-right">
          <span className="text-sm font-semibold text-slate-200">{nameA}</span>
          <div className="flex items-center justify-end gap-1.5 mt-0.5">
            <span className="text-xs text-slate-400">Score: {scorePctA}%</span>
            <ConfidenceDot confidence={confidenceA} />
            <span className="text-[10px] text-slate-500">{confidenceA}</span>
          </div>
        </div>
        <div className="text-xs text-slate-600 font-medium">vs</div>
        <div>
          <span className="text-sm font-semibold text-slate-200">{nameB}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-slate-400">Score: {scorePctB}%</span>
            <ConfidenceDot confidence={confidenceB} />
            <span className="text-[10px] text-slate-500">{confidenceB}</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/40 rounded-lg px-3 py-2 mb-4">
        <table className="w-full" aria-label={`Decision matrix comparing ${nameA} and ${nameB}`}>
          <caption className="sr-only">Comparison metrics for {nameA} versus {nameB} as candidates for {disease}</caption>
          <thead>
            <tr className="border-b border-slate-600/40">
              <th scope="col" className="py-1 text-[10px] text-slate-500 text-left font-normal">Metric</th>
              <th scope="col" className="py-1 text-[10px] text-slate-400 text-right font-normal">{nameA}</th>
              <th scope="col" className="py-1 text-[10px] text-slate-400 text-left font-normal">{nameB}</th>
            </tr>
          </thead>
          <tbody>
            <DecisionCell label="Candidate Score" valueA={`${scorePctA}%`} valueB={`${scorePctB}%`} />
            <DecisionCell label="Clinical Trials" valueA={trialsA.length} valueB={trialsB.length} />
            <DecisionCell label="Protein Targets" valueA={targetsA.length} valueB={targetsB.length} />
            <DecisionCell label="Indications" valueA={indicationsA.length} valueB={indicationsB.length} />
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleRationale}
          disabled={!enabled || (status !== 'available' && status !== 'checking')}
          aria-label={streaming ? 'Stop AI comparison' : `AI: compare ${nameA} and ${nameB} for ${disease}`}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
        >
          {streaming ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
              Stop
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              AI: Which is better for {disease}?
            </>
          )}
        </button>
        {rationale && (
          <div className="flex-1 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-800/30 rounded-lg p-3 max-h-60 overflow-y-auto" role="status" aria-live="polite">
            {rationale}
          </div>
        )}
      </div>
    </div>
  )
}