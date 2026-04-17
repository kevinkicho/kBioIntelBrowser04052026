'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAI } from '@/lib/ai/useAI'
import {
  type DiseaseDetailContext,
  buildDiseaseQuickSummaryPrompt,
  buildDiseaseRepurposingPrompt,
  buildDiseaseTherapeuticGapPrompt,
  buildDiseaseConnectionMapPrompt,
} from '@/lib/ai/diseasePrompts'
import { renderSimpleMarkdown } from '@/lib/sanitize'

interface AnalysisCard {
  id: string
  title: string
  description: string
  content: string
  isStreaming: boolean
  wasTriggered: boolean
}

interface DiseaseIntelligencePanelProps {
  context: DiseaseDetailContext
}

type AnalysisMode = 'repurposing' | 'gap' | 'connections'

const ANALYSES: { id: AnalysisMode; title: string; description: string }[] = [
  { id: 'repurposing', title: 'Drug Repurposing Opportunities', description: 'Identifies approved drugs for other conditions that target the same genes and could be repurposed.' },
  { id: 'gap', title: 'Therapeutic Gap Analysis', description: 'Finds undruggable genes and areas where new drug discovery is most needed.' },
  { id: 'connections', title: 'Disease-Drug Connection Map', description: 'Maps how known drugs connect to disease biology through gene associations.' },
]

export function DiseaseIntelligencePanel({ context }: DiseaseIntelligencePanelProps) {
  const ai = useAI()
  const [summary, setSummary] = useState('')
  const [summaryStreaming, setSummaryStreaming] = useState(false)
  const [summaryTriggered, setSummaryTriggered] = useState(false)
  const [cards, setCards] = useState<Record<AnalysisMode, AnalysisCard>>({
    repurposing: { id: 'repurposing', title: ANALYSES[0].title, description: ANALYSES[0].description, content: '', isStreaming: false, wasTriggered: false },
    gap: { id: 'gap', title: ANALYSES[1].title, description: ANALYSES[1].description, content: '', isStreaming: false, wasTriggered: false },
    connections: { id: 'connections', title: ANALYSES[2].title, description: ANALYSES[2].description, content: '', isStreaming: false, wasTriggered: false },
  })
  const [expanded, setExpanded] = useState<AnalysisMode | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  const aiAvailable = ai.enabled && ai.status === 'available'
  const hasSomeData = context.genes.length > 0 || context.drugInterventions.length > 0 || context.molecules.length > 0

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const streamAnalysis = useCallback(async (
    buildPrompt: (ctx: DiseaseDetailContext) => { system: string; user: string },
    onToken: (token: string) => void,
    onDone: () => void,
  ) => {
    const prompts = buildPrompt(context)
    let full = ''
    try {
      for await (const token of ai.askAI([
        { role: 'system', content: prompts.system },
        { role: 'user', content: prompts.user },
      ])) {
        if (!mountedRef.current) break
        full += token
        onToken(full)
      }
    } catch {
      full += '\n[Error: Analysis interrupted]'
      onToken(full)
    }
    onDone()
  }, [ai, context])

  useEffect(() => {
    if (!aiAvailable || summaryTriggered || !hasSomeData) return
    setSummaryTriggered(true)
    setSummaryStreaming(true)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    streamAnalysis(
      buildDiseaseQuickSummaryPrompt,
      (content) => { if (mountedRef.current) setSummary(content) },
      () => { if (mountedRef.current) setSummaryStreaming(false) },
    )
  }, [aiAvailable, summaryTriggered, hasSomeData, streamAnalysis])

  const handleGenerate = useCallback((mode: AnalysisMode) => {
    if (cards[mode].isStreaming) return

    setCards(prev => ({
      ...prev,
      [mode]: { ...prev[mode], isStreaming: true, wasTriggered: true, content: '' },
    }))
    setExpanded(mode)

    const promptBuilders: Record<AnalysisMode, (ctx: DiseaseDetailContext) => { system: string; user: string }> = {
      repurposing: buildDiseaseRepurposingPrompt,
      gap: buildDiseaseTherapeuticGapPrompt,
      connections: buildDiseaseConnectionMapPrompt,
    }

    streamAnalysis(
      promptBuilders[mode],
      (content) => {
        if (mountedRef.current) {
          setCards(prev => ({
            ...prev,
            [mode]: { ...prev[mode], content },
          }))
        }
      },
      () => {
        if (mountedRef.current) {
          setCards(prev => ({
            ...prev,
            [mode]: { ...prev[mode], isStreaming: false },
          }))
        }
      },
    )
  }, [cards, streamAnalysis])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-1">
        <h2 className="text-xl font-semibold text-slate-100">Disease Intelligence</h2>
        {aiAvailable && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-800/50">AI-Powered</span>
        )}
      </div>
      <p className="text-sm text-slate-400 mb-4">AI-synthesized insights connecting genes, drugs, and therapeutic opportunities</p>

      {!aiAvailable && (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            <span className="text-sm text-slate-400">Connect Ollama to enable AI-powered disease analysis</span>
          </div>
          <p className="text-xs text-slate-500">Start a local Ollama instance and connect via the AI Copilot button (bottom-left) to unlock intelligence features.</p>
        </div>
      )}

      {aiAvailable && !hasSomeData && (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
          <p className="text-sm text-slate-500">No gene, drug, or molecule data available to analyze. AI insights will appear when data is present.</p>
        </div>
      )}

      {aiAvailable && hasSomeData && (
        <>
          <div className="bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border border-indigo-800/40 rounded-xl p-6 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              <h3 className="text-sm font-semibold text-indigo-200">Quick Summary</h3>
              {summaryStreaming && <StreamingDots />}
            </div>
            {!summary && summaryStreaming && <ShimmerBlock />}
            {summary && (
              <div
                className="text-sm text-slate-300 leading-relaxed prose-sm"
                dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(summary) }}
              />
            )}
          </div>

          <div className="space-y-3">
            {ANALYSES.map(({ id, title, description }) => {
              const card = cards[id]
              const isExpanded = expanded === id
              return (
                <div
                  key={id}
                  className={`bg-slate-900/60 border rounded-xl transition-colors ${
                    isExpanded ? 'border-indigo-700/60' : 'border-slate-700/50 hover:border-slate-600/60'
                  }`}
                >
                  <button
                    onClick={() => setExpanded(isExpanded ? null : id)}
                    className="w-full text-left px-5 py-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-200">{title}</span>
                        {card.wasTriggered && !card.isStreaming && card.content && (
                          <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        )}
                        {card.isStreaming && <StreamingDots />}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{description}</p>
                    </div>
                    <svg
                      className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    ><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-slate-800/50">
                      {!card.wasTriggered && (
                        <button
                          onClick={() => handleGenerate(id)}
                          className="mt-4 px-4 py-2 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-sm text-white font-medium transition-colors"
                        >
                          Generate Analysis
                        </button>
                      )}
                      {card.isStreaming && !card.content && <ShimmerBlock />}
                      {card.content && (
                        <div
                          className="mt-4 text-sm text-slate-300 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(card.content) }}
                        />
                      )}
                      {card.wasTriggered && !card.isStreaming && !card.content && (
                        <p className="mt-4 text-xs text-slate-500">No analysis generated. Try clicking Generate again.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}

function StreamingDots() {
  return (
    <span className="inline-flex gap-0.5 ml-1">
      <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
    </span>
  )
}

function ShimmerBlock() {
  return (
    <div className="space-y-2 mt-2">
      <div className="h-3 bg-slate-800/80 rounded w-full animate-pulse" />
      <div className="h-3 bg-slate-800/80 rounded w-5/6 animate-pulse" />
      <div className="h-3 bg-slate-800/80 rounded w-4/6 animate-pulse" />
    </div>
  )
}